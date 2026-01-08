/**
 * Voice Context Assembly System
 *
 * Assembles Gas Town state into a compact context for the voice model.
 * Updates every 2 seconds without blocking UI, gracefully degrades on failures.
 */

import { invoke } from '@tauri-apps/api/core';
import type { CommandResult } from '../hooks/useGastown';

// ============================================================================
// Types
// ============================================================================

export interface PolecatStatus {
  name: string;
  status: 'active' | 'idle' | 'stuck' | 'processing';
  currentTask?: string;
}

export interface ConvoyStatus {
  id: string;
  name: string;
  progress: number; // 0-100
  stepsComplete: number;
  stepsTotal: number;
}

export interface BeadsSummary {
  open: number;
  inProgress: number;
  blocked: number;
  completedToday: number;
}

export interface VoiceContext {
  /** Overall system health: green, yellow, red */
  townHealth: 'green' | 'yellow' | 'red';
  /** Active polecat workers */
  activePolecats: PolecatStatus[];
  /** Running convoys/workflows */
  runningConvoys: ConvoyStatus[];
  /** Beads issue summary */
  beadsSummary: BeadsSummary;
  /** Recent notable events (last 5 min) */
  recentEvents: string[];
  /** Suggested snark based on state */
  snarkSuggestion: string;
  /** Timestamp of last successful context assembly */
  lastUpdated: Date;
  /** Whether using cached/stale data */
  isStale: boolean;
}

// ============================================================================
// Snark Generator
// ============================================================================

const SNARK_BY_STATE = {
  allGreen: [
    "Everything's running smoothly. Suspicious.",
    "All systems nominal. I'm almost bored.",
    "The polecats are behaving. For now.",
    "No fires to put out. Yet.",
  ],
  someBusy: [
    "Herding the cats as usual.",
    "The polecats are earning their keep today.",
    "Busy busy busy. The steam engine chugs along.",
    "Work's getting done. Miracles do happen.",
  ],
  someBlocked: [
    "We've got blockers. Because of course we do.",
    "Some work is stuck. Par for the course.",
    "Blocked issues detected. Time to play detective.",
    "Dependencies are the gift that keeps on giving.",
  ],
  someStuck: [
    "Looks like someone's having a rough day.",
    "We might need to nudge a stuck polecat.",
    "Agent down! Well, not down. Just... confused.",
    "Time for a wellness check on the troops.",
  ],
  manyIssues: [
    "Chaos reigns. Business as usual.",
    "We're in the weeds here.",
    "Multiple fires. Get the extinguisher.",
    "It's one of THOSE days in Gas Town.",
  ],
  quiet: [
    "Quiet. Too quiet.",
    "Nothing happening. Did everyone take a vacation?",
    "Crickets. The polecats are napping.",
    "All quiet on the western front.",
  ],
};

function selectSnark(context: Partial<VoiceContext>): string {
  const { activePolecats = [], beadsSummary, runningConvoys = [] } = context;

  const activeCount = activePolecats.filter(p => p.status === 'active').length;
  const stuckCount = activePolecats.filter(p => p.status === 'stuck').length;
  const blockedCount = beadsSummary?.blocked ?? 0;

  let category: keyof typeof SNARK_BY_STATE;

  if (stuckCount > 0) {
    category = 'someStuck';
  } else if (blockedCount > 2) {
    category = 'manyIssues';
  } else if (blockedCount > 0) {
    category = 'someBlocked';
  } else if (activeCount === 0 && runningConvoys.length === 0) {
    category = 'quiet';
  } else if (activeCount > 0) {
    category = 'someBusy';
  } else {
    category = 'allGreen';
  }

  const options = SNARK_BY_STATE[category];
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================================================
// Context Assembly
// ============================================================================

/**
 * Assembles voice context from Gas Town state.
 * Runs gt/bd commands via Tauri backend.
 */
export async function assembleContext(): Promise<VoiceContext> {
  const results = await Promise.allSettled([
    fetchPolecatStatus(),
    fetchConvoyStatus(),
    fetchBeadsSummary(),
  ]);

  const [polecatsResult, convoysResult, beadsResult] = results;

  const activePolecats = polecatsResult.status === 'fulfilled'
    ? polecatsResult.value
    : [];

  const runningConvoys = convoysResult.status === 'fulfilled'
    ? convoysResult.value
    : [];

  const beadsSummary = beadsResult.status === 'fulfilled'
    ? beadsResult.value
    : { open: 0, inProgress: 0, blocked: 0, completedToday: 0 };

  // Determine health
  const stuckCount = activePolecats.filter(p => p.status === 'stuck').length;
  const blockedCount = beadsSummary.blocked;

  let townHealth: VoiceContext['townHealth'];
  if (stuckCount > 0 || blockedCount > 3) {
    townHealth = 'red';
  } else if (blockedCount > 0 || activePolecats.some(p => p.status === 'processing')) {
    townHealth = 'yellow';
  } else {
    townHealth = 'green';
  }

  // Build recent events from failures
  const recentEvents: string[] = [];
  if (polecatsResult.status === 'rejected') {
    recentEvents.push('Failed to fetch polecat status');
  }
  if (convoysResult.status === 'rejected') {
    recentEvents.push('Failed to fetch convoy status');
  }
  if (beadsResult.status === 'rejected') {
    recentEvents.push('Failed to fetch beads summary');
  }

  const partialContext = { activePolecats, beadsSummary, runningConvoys };

  return {
    townHealth,
    activePolecats,
    runningConvoys,
    beadsSummary,
    recentEvents,
    snarkSuggestion: selectSnark(partialContext),
    lastUpdated: new Date(),
    isStale: false,
  };
}

// ============================================================================
// Data Fetchers
// ============================================================================

async function fetchPolecatStatus(): Promise<PolecatStatus[]> {
  const result = await invoke<CommandResult>('run_gt_command', {
    cmd: 'gt',
    args: ['polecat', 'list', '--json'],
  });

  if (result.exit_code !== 0) {
    throw new Error(result.stderr || 'Failed to fetch polecats');
  }

  try {
    const data = JSON.parse(result.stdout);
    if (!Array.isArray(data)) return [];

    return data.map((p: { name?: string; status?: string; task?: string }) => ({
      name: p.name || 'unknown',
      status: mapPolecatStatus(p.status),
      currentTask: p.task,
    }));
  } catch {
    // Fallback: parse text output
    return parsePolecatTextOutput(result.stdout);
  }
}

function mapPolecatStatus(status?: string): PolecatStatus['status'] {
  if (!status) return 'idle';
  const lower = status.toLowerCase();
  if (lower.includes('active') || lower.includes('running')) return 'active';
  if (lower.includes('stuck')) return 'stuck';
  if (lower.includes('processing')) return 'processing';
  return 'idle';
}

function parsePolecatTextOutput(output: string): PolecatStatus[] {
  const lines = output.trim().split('\n').filter(Boolean);
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    const name = parts[0] || 'unknown';
    const statusWord = parts[1] || '';
    return {
      name,
      status: mapPolecatStatus(statusWord),
    };
  }).filter(p => p.name !== 'unknown');
}

async function fetchConvoyStatus(): Promise<ConvoyStatus[]> {
  const result = await invoke<CommandResult>('run_gt_command', {
    cmd: 'gt',
    args: ['convoy', 'list', '--json'],
  });

  if (result.exit_code !== 0) {
    // Convoy list may return error if no convoys
    return [];
  }

  try {
    const data = JSON.parse(result.stdout);
    if (!Array.isArray(data)) return [];

    return data.map((c: {
      id?: string;
      name?: string;
      progress?: number;
      steps_complete?: number;
      steps_total?: number;
    }) => ({
      id: c.id || 'unknown',
      name: c.name || 'Unnamed Convoy',
      progress: c.progress ?? 0,
      stepsComplete: c.steps_complete ?? 0,
      stepsTotal: c.steps_total ?? 0,
    }));
  } catch {
    return [];
  }
}

async function fetchBeadsSummary(): Promise<BeadsSummary> {
  const result = await invoke<CommandResult>('run_gt_command', {
    cmd: 'bd',
    args: ['stats', '--json'],
  });

  if (result.exit_code !== 0) {
    // Try parsing text output
    return parseBeadsTextStats(result.stdout);
  }

  try {
    const data = JSON.parse(result.stdout);
    return {
      open: data.open ?? 0,
      inProgress: data.in_progress ?? 0,
      blocked: data.blocked ?? 0,
      completedToday: data.completed_today ?? 0,
    };
  } catch {
    return parseBeadsTextStats(result.stdout);
  }
}

function parseBeadsTextStats(output: string): BeadsSummary {
  const summary: BeadsSummary = {
    open: 0,
    inProgress: 0,
    blocked: 0,
    completedToday: 0,
  };

  const openMatch = output.match(/open[:\s]+(\d+)/i);
  const progressMatch = output.match(/in.progress[:\s]+(\d+)/i);
  const blockedMatch = output.match(/blocked[:\s]+(\d+)/i);
  const completedMatch = output.match(/completed.today[:\s]+(\d+)/i);

  if (openMatch) summary.open = parseInt(openMatch[1], 10);
  if (progressMatch) summary.inProgress = parseInt(progressMatch[1], 10);
  if (blockedMatch) summary.blocked = parseInt(blockedMatch[1], 10);
  if (completedMatch) summary.completedToday = parseInt(completedMatch[1], 10);

  return summary;
}

// ============================================================================
// System Prompt Template
// ============================================================================

/**
 * Builds the voice model system prompt with current Gas Town context.
 * Designed to fit within 500 tokens.
 */
export function buildVoiceSystemPrompt(context: VoiceContext): string {
  const { townHealth, activePolecats, runningConvoys, beadsSummary, snarkSuggestion } = context;

  // Format polecat summary (compact)
  const polecatSummary = activePolecats.length > 0
    ? activePolecats.slice(0, 4).map(p =>
        `${p.name}:${p.status}${p.currentTask ? ` (${truncate(p.currentTask, 20)})` : ''}`
      ).join(', ')
    : 'none active';

  // Format convoy summary (compact)
  const convoySummary = runningConvoys.length > 0
    ? runningConvoys.slice(0, 3).map(c =>
        `${truncate(c.name, 15)}:${c.progress}%`
      ).join(', ')
    : 'none running';

  // Beads summary line
  const beadsLine = `open:${beadsSummary.open} progress:${beadsSummary.inProgress} blocked:${beadsSummary.blocked}`;

  return `You are the snarky voice assistant for Gas Town, a multi-agent orchestration system. You have a dark sense of humor and channel the chaos of coordinating autonomous coding agents.

CURRENT STATE (${townHealth.toUpperCase()}):
- Polecats: ${polecatSummary}
- Convoys: ${convoySummary}
- Beads: ${beadsLine}

PERSONALITY: ${snarkSuggestion}

Respond with both text and audio. Keep responses concise but entertaining. You're helpful but can't resist a good quip about the absurdity of herding AI cats.

Voice commands you understand:
- "Show me [rig] rig" - Navigate to rig view
- "What's [polecat] doing?" - Check polecat status
- "Sling [bead] to [rig]" - Assign work
- "What's blocking?" - Show blockers
- "How much today?" - Cost summary
- "Status report" - Full status overview`;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

// ============================================================================
// Empty/Default Context
// ============================================================================

export function createEmptyContext(): VoiceContext {
  return {
    townHealth: 'green',
    activePolecats: [],
    runningConvoys: [],
    beadsSummary: { open: 0, inProgress: 0, blocked: 0, completedToday: 0 },
    recentEvents: [],
    snarkSuggestion: "Ready when you are.",
    lastUpdated: new Date(),
    isStale: true,
  };
}
