import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

// Types
export interface CommandResult {
  stdout: string
  stderr: string
  exit_code: number
}

export interface Bead {
  id: string
  title: string
  status: 'open' | 'in_progress' | 'closed'
  priority: string
  type: string
  assignee?: string
  created: string
  updated: string
}

export interface Polecat {
  name: string
  rig: string
  status: 'active' | 'idle' | 'stuck'
  currentWork?: string
  branch?: string
}

export interface CrewMember {
  name: string
  rig: string
  status: 'active' | 'idle'
  worktree?: string
}

export interface MergeQueueItem {
  id: string
  branch: string
  polecat: string
  status: 'pending' | 'processing' | 'conflict' | 'merged'
  position: number
}

// Helper to run gt/bd commands
async function runCommand(cmd: string, args: string[]): Promise<CommandResult> {
  return invoke<CommandResult>('run_gt_command', { cmd, args })
}

// Parse bd list --json output
function parseBeadsOutput(output: string): Bead[] {
  const lines = output.trim().split('\n').filter(Boolean)
  const beads: Bead[] = []

  for (const line of lines) {
    // Parse format: "id [Priority] [type] status - title"
    const match = line.match(/^(\S+)\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(\w+)\s+-\s+(.+)$/)
    if (match) {
      beads.push({
        id: match[1],
        priority: match[2],
        type: match[3],
        status: match[4] as Bead['status'],
        title: match[5],
        created: '',
        updated: '',
      })
    }
  }
  return beads
}

// Parse gt polecat list output
function parsePolecatsOutput(output: string, rigName: string): Polecat[] {
  const lines = output.trim().split('\n').filter(Boolean)
  const polecats: Polecat[] = []

  for (const line of lines) {
    // Parse polecat lines - format varies but typically includes name and status
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 1 && parts[0]) {
      polecats.push({
        name: parts[0].replace(/[^\w-]/g, ''),
        rig: rigName,
        status: line.includes('active') ? 'active' : line.includes('stuck') ? 'stuck' : 'idle',
        currentWork: undefined,
      })
    }
  }
  return polecats
}

// Hooks

// Check if we're in a browser environment (Tauri APIs not available during SSR)
const isBrowser = typeof window !== 'undefined'

/**
 * Fetch all rigs in the town
 */
export function useRigs() {
  return useQuery({
    queryKey: ['rigs'],
    queryFn: async () => {
      const result = await runCommand('gt', ['rigs'])
      if (result.exit_code !== 0) {
        throw new Error(result.stderr || 'Failed to list rigs')
      }
      // Parse rig names from output
      return result.stdout.trim().split('\n').filter(Boolean)
    },
    refetchInterval: 10000, // Poll every 10s
    enabled: isBrowser, // Only run on client (Tauri not available during SSR)
  })
}

/**
 * Fetch beads for a specific rig
 */
export function useBeads(rig: string, status?: Bead['status']) {
  return useQuery({
    queryKey: ['beads', rig, status],
    queryFn: async () => {
      const args = ['list']
      if (status) {
        args.push('--status', status)
      }
      const result = await runCommand('bd', args)
      if (result.exit_code !== 0 && !result.stdout) {
        throw new Error(result.stderr || 'Failed to list beads')
      }
      return parseBeadsOutput(result.stdout)
    },
    refetchInterval: 5000, // Poll every 5s as per PRD
    enabled: isBrowser,
  })
}

/**
 * Fetch polecats for a rig
 */
export function usePolecats(rig: string) {
  return useQuery({
    queryKey: ['polecats', rig],
    queryFn: async () => {
      const result = await runCommand('gt', ['polecat', 'list', rig])
      if (result.exit_code !== 0 && !result.stdout) {
        throw new Error(result.stderr || 'Failed to list polecats')
      }
      return parsePolecatsOutput(result.stdout, rig)
    },
    refetchInterval: 5000,
    enabled: isBrowser,
  })
}

/**
 * Fetch merge queue status for a rig
 */
export function useMergeQueue(rig: string) {
  return useQuery({
    queryKey: ['mergeQueue', rig],
    queryFn: async () => {
      // gt mq status <rig> - returns merge queue state
      const result = await runCommand('gt', ['mq', 'status', rig])
      if (result.exit_code !== 0 && !result.stdout) {
        // No merge queue items is not an error
        return [] as MergeQueueItem[]
      }
      // Parse MQ output - format TBD based on actual gt output
      const items: MergeQueueItem[] = []
      const lines = result.stdout.trim().split('\n').filter(Boolean)
      lines.forEach((line, idx) => {
        const parts = line.split(/\s+/)
        if (parts.length >= 2) {
          items.push({
            id: parts[0],
            branch: parts[1] || parts[0],
            polecat: parts[2] || 'unknown',
            status: 'pending',
            position: idx + 1,
          })
        }
      })
      return items
    },
    refetchInterval: 5000,
    enabled: isBrowser,
  })
}

/**
 * Sling work to a rig
 */
export function useSling() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bead, rig }: { bead: string; rig: string }) => {
      const result = await runCommand('gt', ['sling', bead, rig])
      if (result.exit_code !== 0) {
        throw new Error(result.stderr || 'Failed to sling work')
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beads'] })
      queryClient.invalidateQueries({ queryKey: ['polecats'] })
      queryClient.invalidateQueries({ queryKey: ['mergeQueue'] })
    },
  })
}

/**
 * Close a bead
 */
export function useCloseBead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ beadId, reason }: { beadId: string; reason?: string }) => {
      const args = ['close', beadId]
      if (reason) {
        args.push('--reason', reason)
      }
      const result = await runCommand('bd', args)
      if (result.exit_code !== 0) {
        throw new Error(result.stderr || 'Failed to close bead')
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beads'] })
    },
  })
}

/**
 * Update bead status
 */
export function useUpdateBead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ beadId, status }: { beadId: string; status: Bead['status'] }) => {
      const result = await runCommand('bd', ['update', beadId, '--status', status])
      if (result.exit_code !== 0) {
        throw new Error(result.stderr || 'Failed to update bead')
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beads'] })
    },
  })
}
