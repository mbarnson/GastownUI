// Gas Town data types for TanStack Query hooks

export interface CommandResult {
  stdout: string
  stderr: string
  exit_code: number
}

export interface TmuxSession {
  name: string
  windows: number
  attached: boolean
}

export type BeadStatus = 'open' | 'in_progress' | 'closed' | 'blocked'
export type BeadType = 'task' | 'bug' | 'feature' | 'epic' | 'event' | 'molecule'

export interface Bead {
  id: string
  title: string
  status: BeadStatus
  type: BeadType
  priority: number // 0-4 (P0=critical, P4=backlog)
  assignee?: string
  created: string
  updated: string
  description?: string
  blocked_by?: string[]
  blocks?: string[]
}

export interface Convoy {
  id: string
  name: string
  beads: string[]
  progress: number // 0-100
  active_polecats: number
  status: 'running' | 'completed' | 'paused' | 'failed'
  created: string
  eta?: string
  polecats?: string[] // Names of polecats working on this convoy
}

export interface Rig {
  name: string
  path: string
  polecats: Polecat[]
  beads_count: {
    open: number
    in_progress: number
    closed: number
    blocked: number
  }
}

export interface Polecat {
  name: string
  rig: string
  status: 'active' | 'idle' | 'stuck' | 'offline'
  current_work?: string
  last_activity?: string
}

export interface TownStatus {
  healthy: boolean
  rigs: Rig[]
  active_agents: number
  running_convoys: number
  cost_today?: number
  cost_rate?: number // $/hr
}

export interface ActivityItem {
  id: string
  timestamp: string
  type: 'bead_update' | 'merge' | 'convoy' | 'polecat' | 'system'
  message: string
  actor?: string
  bead_id?: string
}

// Parsing helpers for gt/bd command outputs
export function parseBeadList(output: string): Bead[] {
  const beads: Bead[] = []
  const lines = output.trim().split('\n').filter(Boolean)

  for (const line of lines) {
    // Format: ga-xxx [P2] [type] status - title
    const match = line.match(/^(\S+)\s+\[P(\d)\]\s+\[(\w+)\]\s+(\w+)\s+-\s+(.+)$/)
    if (match) {
      beads.push({
        id: match[1],
        priority: parseInt(match[2]),
        type: match[3] as BeadType,
        status: match[4] as BeadStatus,
        title: match[5],
        created: '',
        updated: '',
      })
    }
  }

  return beads
}

export function parseConvoyList(output: string): Convoy[] {
  if (!output.trim()) {
    return []
  }

  try {
    const data = JSON.parse(output)
    const convoys = Array.isArray(data) ? data : data.convoys || []

    return convoys.map((c: Record<string, unknown>) => ({
      id: String(c.id || ''),
      name: String(c.name || ''),
      beads: Array.isArray(c.beads) ? c.beads.map(String) : [],
      progress: typeof c.progress === 'number' ? c.progress : 0,
      active_polecats: typeof c.active_polecats === 'number' ? c.active_polecats : 0,
      status: normalizeConvoyStatus(c.status),
      created: String(c.created || ''),
      eta: c.eta ? String(c.eta) : undefined,
      polecats: Array.isArray(c.polecats) ? c.polecats.map(String) : undefined,
    }))
  } catch {
    return []
  }
}

function normalizeConvoyStatus(status: unknown): Convoy['status'] {
  const s = String(status).toLowerCase()
  if (s === 'running' || s === 'active' || s === 'in_progress') return 'running'
  if (s === 'completed' || s === 'done' || s === 'finished') return 'completed'
  if (s === 'paused' || s === 'stopped') return 'paused'
  if (s === 'failed' || s === 'error') return 'failed'
  return 'running'
}

export function parseTownStatus(statusOutput: string, rigsOutput: string): TownStatus {
  // Parse gt status and gt rigs output
  const rigs: Rig[] = []

  // Parse rigs from gt rigs output
  const rigLines = rigsOutput.trim().split('\n').filter(Boolean)
  for (const line of rigLines) {
    // Simple parsing - adjust based on actual format
    const name = line.trim()
    if (name && !name.startsWith('#')) {
      rigs.push({
        name,
        path: '',
        polecats: [],
        beads_count: { open: 0, in_progress: 0, closed: 0, blocked: 0 },
      })
    }
  }

  return {
    healthy: true, // Determine from status output
    rigs,
    active_agents: 0,
    running_convoys: 0,
  }
}
