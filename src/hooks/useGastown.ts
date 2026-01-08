import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type {
  Bead,
  BeadStatus,
  Convoy,
  TownStatus,
  CommandResult,
  TmuxSession,
  ActivityItem,
  parseBeadList,
} from '../types/gastown'

// Helper to run gt/bd commands via Tauri
async function runCommand(cmd: string, args: string[]): Promise<CommandResult> {
  return invoke<CommandResult>('run_gt_command', { cmd, args })
}

// Check if running in Tauri context
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

// Mock data for development without Tauri
const mockBeads: Bead[] = [
  {
    id: 'ga-9mv',
    title: 'Dashboard View - The Refinery Floor',
    status: 'in_progress',
    type: 'feature',
    priority: 2,
    assignee: 'GastownUI/slit',
    created: '2026-01-07',
    updated: '2026-01-07',
  },
  {
    id: 'ga-mmy',
    title: 'Voice Command Interface - Snarky LFM2.5',
    status: 'open',
    type: 'feature',
    priority: 1,
    created: '2026-01-07',
    updated: '2026-01-07',
  },
  {
    id: 'ga-egk',
    title: 'Tmux Integration Panel - Window into chaos',
    status: 'open',
    type: 'feature',
    priority: 2,
    created: '2026-01-07',
    updated: '2026-01-07',
  },
]

const mockConvoys: Convoy[] = [
  {
    id: 'convoy-001',
    name: 'Phase 1: Core UI MVP',
    beads: ['ga-9mv', 'ga-mmy', 'ga-egk', 'ga-jj2'],
    progress: 25,
    active_polecats: 2,
    status: 'running',
    created: '2026-01-07',
    eta: '~2 hours',
  },
]

const mockTownStatus: TownStatus = {
  healthy: true,
  rigs: [
    {
      name: 'GastownUI',
      path: '/Users/patbarnson/gt/GastownUI',
      polecats: [
        {
          name: 'slit',
          rig: 'GastownUI',
          status: 'active',
          current_work: 'ga-9mv',
          last_activity: new Date().toISOString(),
        },
        {
          name: 'furiosa',
          rig: 'GastownUI',
          status: 'idle',
          last_activity: new Date().toISOString(),
        },
      ],
      beads_count: { open: 3, in_progress: 1, closed: 1, blocked: 0 },
    },
  ],
  active_agents: 2,
  running_convoys: 1,
  cost_today: 47.23,
  cost_rate: 12.5,
}

const mockActivity: ActivityItem[] = [
  {
    id: 'act-1',
    timestamp: new Date().toISOString(),
    type: 'bead_update',
    message: 'Polecat slit claimed ga-9mv',
    actor: 'slit',
    bead_id: 'ga-9mv',
  },
  {
    id: 'act-2',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    type: 'merge',
    message: 'Refinery merged ga-6tk (scaffold) to main',
    actor: 'refinery',
    bead_id: 'ga-6tk',
  },
  {
    id: 'act-3',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    type: 'convoy',
    message: 'Convoy "Phase 1: Core UI MVP" started',
    actor: 'mayor',
  },
]

// Real-time convoy status (2s polling)
export function useConvoys() {
  return useQuery({
    queryKey: ['convoys'],
    queryFn: async (): Promise<Convoy[]> => {
      if (!isTauri()) {
        return mockConvoys
      }

      const result = await runCommand('gt', ['convoy', 'list'])
      if (result.exit_code !== 0) {
        console.warn('gt convoy list failed:', result.stderr)
        return []
      }

      // Parse convoy list output
      // TODO: Implement actual parsing when we know the format
      return []
    },
    refetchInterval: 2000, // Poll every 2s
    staleTime: 1000,
  })
}

// Beads for a rig or all beads
export function useBeads(status?: BeadStatus) {
  return useQuery({
    queryKey: ['beads', status],
    queryFn: async (): Promise<Bead[]> => {
      if (!isTauri()) {
        return status
          ? mockBeads.filter((b) => b.status === status)
          : mockBeads
      }

      const args = ['list']
      if (status) {
        args.push('--status', status)
      }

      const result = await runCommand('bd', args)
      if (result.exit_code !== 0) {
        console.warn('bd list failed:', result.stderr)
        return []
      }

      // Parse bead list output
      const beads: Bead[] = []
      const lines = result.stdout.trim().split('\n').filter(Boolean)

      for (const line of lines) {
        // Format: ga-xxx [P2] [type] status - title
        const match = line.match(
          /^(\S+)\s+\[P(\d)\]\s+\[(\w+)\]\s+(\w+)\s+-\s+(.+)$/
        )
        if (match) {
          beads.push({
            id: match[1],
            priority: parseInt(match[2]),
            type: match[3] as Bead['type'],
            status: match[4] as BeadStatus,
            title: match[5],
            created: '',
            updated: '',
          })
        }
      }

      return beads
    },
    refetchInterval: 5000, // Poll every 5s
    staleTime: 2000,
  })
}

// Town status (health, rigs, agents)
export function useTownStatus() {
  return useQuery({
    queryKey: ['townStatus'],
    queryFn: async (): Promise<TownStatus> => {
      if (!isTauri()) {
        return mockTownStatus
      }

      const [statusResult, rigsResult] = await Promise.all([
        runCommand('gt', ['status']),
        runCommand('gt', ['rigs']),
      ])

      // Parse outputs into TownStatus
      // TODO: Implement actual parsing
      return {
        healthy: statusResult.exit_code === 0,
        rigs: [],
        active_agents: 0,
        running_convoys: 0,
      }
    },
    refetchInterval: 5000,
    staleTime: 2000,
  })
}

// Activity feed
export function useActivityFeed() {
  return useQuery({
    queryKey: ['activity'],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!isTauri()) {
        return mockActivity
      }

      // TODO: Read from beads interactions.jsonl
      return []
    },
    refetchInterval: 3000,
    staleTime: 1000,
  })
}

// Tmux sessions
export function useTmuxSessions() {
  return useQuery({
    queryKey: ['tmuxSessions'],
    queryFn: async (): Promise<TmuxSession[]> => {
      if (!isTauri()) {
        return [
          { name: 'gastown-slit', windows: 1, attached: true },
          { name: 'gastown-refinery', windows: 1, attached: false },
        ]
      }

      return invoke<TmuxSession[]>('list_tmux_sessions')
    },
    refetchInterval: 5000,
    staleTime: 2000,
  })
}

// Sling work mutation
export function useSling() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      bead,
      rig,
    }: {
      bead: string
      rig: string
    }): Promise<CommandResult> => {
      if (!isTauri()) {
        return { stdout: 'Mock sling successful', stderr: '', exit_code: 0 }
      }

      return runCommand('gt', ['sling', bead, rig])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convoys'] })
      queryClient.invalidateQueries({ queryKey: ['beads'] })
    },
  })
}

// Close bead mutation
export function useCloseBead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (beadId: string): Promise<CommandResult> => {
      if (!isTauri()) {
        return { stdout: 'Mock close successful', stderr: '', exit_code: 0 }
      }

      return runCommand('bd', ['close', beadId])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beads'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}
