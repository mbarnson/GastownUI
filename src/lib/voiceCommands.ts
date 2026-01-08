/**
 * Voice Command Routing System
 *
 * Parses natural language voice input and routes to gt/bd commands.
 * Returns structured results for voice response generation.
 */

import { invoke } from '@tauri-apps/api/core';
import type { CommandResult } from '../hooks/useGastown';

// ============================================================================
// Types
// ============================================================================

export interface VoiceCommand {
  /** Original voice input text */
  input: string;
  /** Parsed intent */
  intent: CommandIntent;
  /** Extracted parameters */
  params: Record<string, string>;
  /** Command to execute (gt/bd) */
  command?: string;
  /** Command arguments */
  args?: string[];
}

export type CommandIntent =
  | 'show_rig'
  | 'show_polecat'
  | 'show_status'
  | 'show_blocked'
  | 'show_ready'
  | 'show_convoy'
  | 'sling_work'
  | 'check_mail'
  | 'send_mail'
  | 'show_cost'
  | 'show_stats'
  | 'emergency_stop'
  | 'unknown';

export interface CommandResponse {
  /** Whether command was successful */
  success: boolean;
  /** Spoken response text */
  speech: string;
  /** Raw command output (for display) */
  output?: string;
  /** Navigation action (if any) */
  navigate?: string;
}

// ============================================================================
// Intent Patterns
// ============================================================================

interface IntentPattern {
  intent: CommandIntent;
  patterns: RegExp[];
  extract?: (match: RegExpMatchArray, input: string) => Record<string, string>;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'show_rig',
    patterns: [
      /show\s+(?:me\s+)?(?:the\s+)?(\w+)\s+rig/i,
      /(?:go\s+to|open|view)\s+(?:the\s+)?(\w+)\s+rig/i,
      /rig\s+(\w+)/i,
    ],
    extract: (match) => ({ rig: match[1] }),
  },
  {
    intent: 'show_polecat',
    patterns: [
      /what(?:'s| is)\s+(\w+)\s+doing/i,
      /(?:show|check)\s+(?:me\s+)?(\w+)(?:'s)?\s+status/i,
      /status\s+(?:of\s+)?(\w+)/i,
      /how(?:'s| is)\s+(\w+)/i,
    ],
    extract: (match) => ({ polecat: match[1] }),
  },
  {
    intent: 'show_status',
    patterns: [
      /(?:status|overview)\s*(?:report)?/i,
      /what(?:'s| is)\s+(?:the\s+)?status/i,
      /how(?:'s| is)\s+(?:everything|the town|gas town)/i,
      /give\s+(?:me\s+)?(?:a\s+)?status/i,
    ],
  },
  {
    intent: 'show_blocked',
    patterns: [
      /what(?:'s| is)\s+block(?:ed|ing)/i,
      /show\s+(?:me\s+)?block(?:ed|ers)/i,
      /any\s+blockers/i,
      /blocked\s+issues/i,
    ],
  },
  {
    intent: 'show_ready',
    patterns: [
      /what(?:'s| is)\s+ready/i,
      /show\s+(?:me\s+)?ready\s+(?:work|issues|beads)/i,
      /available\s+work/i,
      /what\s+can\s+(?:i|we)\s+work\s+on/i,
    ],
  },
  {
    intent: 'show_convoy',
    patterns: [
      /(?:show|list)\s+(?:me\s+)?convoys?/i,
      /convoy\s+status/i,
      /what\s+convoys?\s+(?:are\s+)?running/i,
    ],
  },
  {
    intent: 'sling_work',
    patterns: [
      /sling\s+(\S+)\s+to\s+(\w+)/i,
      /assign\s+(\S+)\s+to\s+(\w+)/i,
      /give\s+(\S+)\s+to\s+(\w+)/i,
    ],
    extract: (match) => ({ bead: match[1], target: match[2] }),
  },
  {
    intent: 'check_mail',
    patterns: [
      /check\s+(?:my\s+)?mail/i,
      /(?:any\s+)?new\s+mail/i,
      /inbox/i,
      /messages?/i,
    ],
  },
  {
    intent: 'show_cost',
    patterns: [
      /how\s+much\s+(?:today|this\s+week|total)/i,
      /cost\s+(?:summary|report)/i,
      /spending/i,
      /what(?:'s| is)\s+(?:the\s+)?cost/i,
    ],
  },
  {
    intent: 'show_stats',
    patterns: [
      /(?:show\s+)?stats/i,
      /statistics/i,
      /metrics/i,
      /numbers/i,
    ],
  },
  {
    intent: 'emergency_stop',
    patterns: [
      /emergency\s+stop/i,
      /hey[,\s]+stop\s+everything/i,
      /stop\s+everything/i,
      /stop\s+all\s+(?:work|agents?|polecats?)/i,
      /kill\s+(?:all|everything)/i,
      /halt\s+(?:all|everything)/i,
    ],
  },
];

// ============================================================================
// Command Parser
// ============================================================================

/**
 * Parse voice input into a structured command
 */
export function parseVoiceCommand(input: string): VoiceCommand {
  const normalized = input.toLowerCase().trim();

  for (const { intent, patterns, extract } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        const params = extract ? extract(match, input) : {};
        const { command, args } = buildCommand(intent, params);
        return {
          input,
          intent,
          params,
          command,
          args,
        };
      }
    }
  }

  return {
    input,
    intent: 'unknown',
    params: {},
  };
}

/**
 * Build the actual gt/bd command from intent and params
 */
function buildCommand(
  intent: CommandIntent,
  params: Record<string, string>
): { command?: string; args?: string[] } {
  switch (intent) {
    case 'show_rig':
      return { command: 'gt', args: ['status', params.rig || ''] };

    case 'show_polecat':
      return { command: 'gt', args: ['peek', params.polecat || ''] };

    case 'show_status':
      return { command: 'gt', args: ['status'] };

    case 'show_blocked':
      return { command: 'bd', args: ['blocked'] };

    case 'show_ready':
      return { command: 'bd', args: ['ready'] };

    case 'show_convoy':
      return { command: 'gt', args: ['convoy', 'list'] };

    case 'sling_work':
      return {
        command: 'gt',
        args: ['sling', params.bead || '', params.target || ''],
      };

    case 'check_mail':
      return { command: 'gt', args: ['mail', 'inbox'] };

    case 'show_cost':
      return { command: 'gt', args: ['cost'] };

    case 'show_stats':
      return { command: 'bd', args: ['stats'] };

    case 'emergency_stop':
      return { command: 'gt', args: ['stop', '--all'] };

    default:
      return {};
  }
}

// ============================================================================
// Command Execution
// ============================================================================

/**
 * Execute a parsed voice command and return a speakable response
 */
export async function executeVoiceCommand(
  cmd: VoiceCommand
): Promise<CommandResponse> {
  if (cmd.intent === 'unknown') {
    return {
      success: false,
      speech: "I didn't catch that. Try something like 'show status' or 'what's blocking'.",
    };
  }

  if (!cmd.command || !cmd.args) {
    return {
      success: false,
      speech: "I understood the intent but couldn't build a command. That's embarrassing.",
    };
  }

  try {
    const result = await invoke<CommandResult>('run_gt_command', {
      cmd: cmd.command,
      args: cmd.args,
    });

    if (result.exit_code !== 0 && !result.stdout) {
      return {
        success: false,
        speech: formatErrorResponse(cmd.intent, result.stderr),
        output: result.stderr,
      };
    }

    return {
      success: true,
      speech: formatSuccessResponse(cmd.intent, result.stdout, cmd.params),
      output: result.stdout,
      navigate: getNavigationAction(cmd.intent, cmd.params),
    };
  } catch (error) {
    return {
      success: false,
      speech: `Command failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

// ============================================================================
// Response Formatting
// ============================================================================

function formatSuccessResponse(
  intent: CommandIntent,
  output: string,
  params: Record<string, string>
): string {
  const lines = output.trim().split('\n').filter(Boolean);

  switch (intent) {
    case 'show_status':
      return summarizeStatus(output);

    case 'show_blocked':
      if (lines.length === 0) {
        return "No blockers! That's suspiciously good news.";
      }
      return `${lines.length} blocked issue${lines.length === 1 ? '' : 's'}. ${lines[0]}`;

    case 'show_ready':
      if (lines.length === 0) {
        return "Nothing ready to work on. Time for a break or file some issues.";
      }
      return `${lines.length} issue${lines.length === 1 ? '' : 's'} ready. First up: ${lines[0]}`;

    case 'show_polecat':
      return `${params.polecat || 'They'}: ${lines[0] || 'status unknown'}`;

    case 'show_convoy':
      if (lines.length === 0) {
        return "No convoys running. The roads are quiet.";
      }
      return `${lines.length} convoy${lines.length === 1 ? '' : 's'} rolling. ${lines[0]}`;

    case 'sling_work':
      return `Work slung to ${params.target}. Off it goes.`;

    case 'check_mail':
      const unreadMatch = output.match(/(\d+)\s+unread/i);
      if (unreadMatch) {
        return `You have ${unreadMatch[1]} unread message${unreadMatch[1] === '1' ? '' : 's'}.`;
      }
      return lines.length > 0 ? `Mail check: ${lines[0]}` : 'Inbox checked.';

    case 'show_stats':
      return summarizeStats(output);

    case 'show_cost':
      return output.trim() || 'Cost data not available.';

    case 'emergency_stop':
      return 'Emergency stop complete. All agents have been halted.';

    default:
      return lines[0] || 'Command completed.';
  }
}

function formatErrorResponse(intent: CommandIntent, stderr: string): string {
  const firstLine = stderr.split('\n')[0] || 'Unknown error';

  switch (intent) {
    case 'show_polecat':
      return "Couldn't find that polecat. They might be hiding.";

    case 'sling_work':
      return `Sling failed: ${firstLine}`;

    case 'emergency_stop':
      return `Emergency stop failed: ${firstLine}. Agents may still be running.`;

    default:
      return `Command failed: ${firstLine}`;
  }
}

function summarizeStatus(output: string): string {
  const lines = output.toLowerCase();

  if (lines.includes('error') || lines.includes('stuck')) {
    return "Status: Some issues. There are stuck or errored workers.";
  }
  if (lines.includes('blocked')) {
    return "Status: Mostly okay but there are blockers.";
  }
  if (lines.includes('active') || lines.includes('running')) {
    return "Status: All systems operational. Work is flowing.";
  }
  return "Status: Quiet. The polecats await their orders.";
}

function summarizeStats(output: string): string {
  const openMatch = output.match(/open[:\s]+(\d+)/i);
  const closedMatch = output.match(/closed[:\s]+(\d+)/i);
  const blockedMatch = output.match(/blocked[:\s]+(\d+)/i);

  const parts: string[] = [];
  if (openMatch) parts.push(`${openMatch[1]} open`);
  if (closedMatch) parts.push(`${closedMatch[1]} closed`);
  if (blockedMatch) parts.push(`${blockedMatch[1]} blocked`);

  return parts.length > 0
    ? `Stats: ${parts.join(', ')}.`
    : 'Stats retrieved.';
}

function getNavigationAction(
  intent: CommandIntent,
  params: Record<string, string>
): string | undefined {
  switch (intent) {
    case 'show_rig':
      return `/rig/${params.rig}`;
    case 'show_convoy':
      return '/convoys';
    default:
      return undefined;
  }
}

// ============================================================================
// Convenience Export
// ============================================================================

/**
 * Parse and execute a voice command in one step
 */
export async function processVoiceCommand(input: string): Promise<CommandResponse> {
  const parsed = parseVoiceCommand(input);
  return executeVoiceCommand(parsed);
}
