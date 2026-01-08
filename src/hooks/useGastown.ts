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
  Rig,
  Polecat,
} from '../types/gastown'

// Additional types for local use (re-export from types)
export type { Bead, BeadStatus, Rig, Polecat }

// Extended Rig type with health status for comparison view
export interface RigWithHealth extends Rig {
  health: 'healthy' | 'degraded' | 'unhealthy'
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

// Helper to run gt/bd commands via Tauri
export async function runCommand(cmd: string, args: string[]): Promise<CommandResult> {
  return invoke<CommandResult>('run_gt_command', { cmd, args })
}

// Check if running in Tauri context
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

// Check if in browser (for SSR safety)
const isBrowser = typeof window !== 'undefined'

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

// Parse bd list output
function parseBeadsOutput(output: string): Bead[] {
  const lines = output.trim().split('\n').filter(Boolean)
  const beads: Bead[] = []

  for (const line of lines) {
    // Parse format: "id [Priority] [type] status - title"
    const match = line.match(/^(\S+)\s+\[P?(\d)\]\s+\[([^\]]+)\]\s+(\w+)\s+-\s+(.+)$/)
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
}

// Parse gt polecat list output
function parsePolecatsOutput(output: string, rigName: string): Polecat[] {
  const lines = output.trim().split('\n').filter(Boolean)
  const polecats: Polecat[] = []

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 1 && parts[0]) {
      polecats.push({
        name: parts[0].replace(/[^\w-]/g, ''),
        rig: rigName,
        status: line.includes('active') ? 'active' : line.includes('stuck') ? 'stuck' : 'idle',
        current_work: undefined,
      })
    }
  }
  return polecats
}

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

      // TODO: Implement actual parsing when we know the format
      return []
    },
    refetchInterval: 2000,
    staleTime: 1000,
  })
}

// Fetch all rigs in the town
export function useRigs() {
  return useQuery({
    queryKey: ['rigs'],
    queryFn: async () => {
      const result = await runCommand('gt', ['rigs'])
      if (result.exit_code !== 0) {
        throw new Error(result.stderr || 'Failed to list rigs')
      }
      return result.stdout.trim().split('\n').filter(Boolean)
    },
    refetchInterval: 10000,
    enabled: isBrowser,
  })
}

// Beads for dashboard (status filter) or rig view (rig filter)
export function useBeads(rigOrStatus?: string, status?: BeadStatus) {
  return useQuery({
    queryKey: ['beads', rigOrStatus, status],
    queryFn: async (): Promise<Bead[]> => {
      if (!isTauri()) {
        const filterStatus = status || (rigOrStatus as BeadStatus)
        return filterStatus
          ? mockBeads.filter((b) => b.status === filterStatus)
          : mockBeads
      }

      const args = ['list']
      const filterStatus = status || rigOrStatus
      if (filterStatus && ['open', 'in_progress', 'closed'].includes(filterStatus)) {
        args.push('--status', filterStatus)
      }

      const result = await runCommand('bd', args)
      if (result.exit_code !== 0 && !result.stdout) {
        console.warn('bd list failed:', result.stderr)
        return []
      }

      return parseBeadsOutput(result.stdout)
    },
    refetchInterval: 5000,
    staleTime: 2000,
    enabled: isBrowser,
  })
}

// Fetch polecats for a rig
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

// Fetch merge queue status for a rig
export function useMergeQueue(rig: string) {
  return useQuery({
    queryKey: ['mergeQueue', rig],
    queryFn: async () => {
      const result = await runCommand('gt', ['refinery', 'queue', rig])
      if (result.exit_code !== 0 && !result.stdout) {
        return [] as MergeQueueItem[]
      }
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
      queryClient.invalidateQueries({ queryKey: ['polecats'] })
      queryClient.invalidateQueries({ queryKey: ['mergeQueue'] })
    },
  })
}

// Close bead mutation
export function useCloseBead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ beadId, reason }: { beadId: string; reason?: string }): Promise<CommandResult> => {
      if (!isTauri()) {
        return { stdout: 'Mock close successful', stderr: '', exit_code: 0 }
      }

      const args = ['close', beadId]
      if (reason) {
        args.push('--reason', reason)
      }
      return runCommand('bd', args)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beads'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}

// Update bead status
export function useUpdateBead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ beadId, status }: { beadId: string; status: BeadStatus }) => {
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

export interface DependencyInfo {
  name: string
  installed: boolean
  version?: string
  path?: string
  install_instructions?: string
  install_url?: string
}

export interface SetupStatus {
  ready: boolean
  missing_count: number
  workspace_exists: boolean
  workspace_path?: string
  voice_guidance?: string
  dependencies: DependencyInfo[]
}

interface InstallResult {
  voice_response: string
  next_step?: string
}

const setupDependencies = [
  {
    key: 'go',
    name: 'Go',
    versionArgs: ['version'],
    versionRegex: /go(\d+\.\d+(?:\.\d+)?)/,
    install_instructions: 'Install Go from https://go.dev/dl/ or run: brew install go',
    install_url: 'https://go.dev/dl/',
  },
  {
    key: 'beads',
    name: 'Beads',
    versionArgs: ['version'],
    versionRegex: /(\d+\.\d+\.\d+)/,
    install_instructions: 'Run: go install github.com/steveyegge/beads/cmd/bd@latest',
    install_url: 'https://github.com/steveyegge/beads',
  },
  {
    key: 'gastown',
    name: 'Gastown',
    versionArgs: ['version'],
    versionRegex: /(\d+\.\d+\.\d+)/,
    install_instructions: 'Run: go install github.com/txgsync/gastown/cmd/gt@latest',
    install_url: 'https://github.com/txgsync/gastown',
  },
  {
    key: 'tmux',
    name: 'tmux',
    versionArgs: ['-V'],
    versionRegex: /tmux\s+([\d.]+)/,
    install_instructions: 'Install tmux: brew install tmux (macOS) or apt install tmux (Linux)',
    install_url: 'https://github.com/tmux/tmux',
  },
] as const

async function checkDependency(
  cmd: string,
  args: string[],
  versionRegex?: RegExp
): Promise<{ installed: boolean; version?: string }> {
  try {
    const result = await runCommand(cmd, args)
    if (result.exit_code !== 0) {
      return { installed: false }
    }
    const version = versionRegex ? result.stdout.match(versionRegex)?.[1] : undefined
    return { installed: true, version }
  } catch {
    return { installed: false }
  }
}

function buildVoiceGuidance(
  missing: DependencyInfo[],
  workspaceExists: boolean
): string | undefined {
  if (missing.length > 0) {
    return `Install ${missing[0].name} to continue.`
  }
  if (!workspaceExists) {
    return 'Create a workspace to finish setup.'
  }
  return 'All set. Welcome to Gas Town.'
}

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setupStatus'],
    queryFn: async (): Promise<SetupStatus> => {
      if (!isTauri()) {
        const dependencies = setupDependencies.map((dep) => ({
          name: dep.name,
          installed: true,
          version: 'dev',
        }))
        return {
          ready: true,
          missing_count: 0,
          workspace_exists: true,
          workspace_path: '~/gt',
          voice_guidance: 'All set. Welcome to Gas Town.',
          dependencies,
        }
      }

      const dependencies: DependencyInfo[] = []
      for (const dep of setupDependencies) {
        const { installed, version } = await checkDependency(
          dep.key === 'beads' ? 'bd' : dep.key === 'gastown' ? 'gt' : dep.key,
          dep.versionArgs,
          dep.versionRegex
        )
        dependencies.push({
          name: dep.name,
          installed,
          version,
          install_instructions: dep.install_instructions,
          install_url: dep.install_url,
        })
      }

      let workspace_exists = false
      let workspace_path: string | undefined
      try {
        const statusResult = await runCommand('gt', ['status'])
        workspace_exists = statusResult.exit_code === 0
      } catch {
        workspace_exists = false
      }

      const missing = dependencies.filter((dep) => !dep.installed)
      const ready = missing.length === 0 && workspace_exists

      return {
        ready,
        missing_count: missing.length,
        workspace_exists,
        workspace_path,
        voice_guidance: buildVoiceGuidance(missing, workspace_exists),
        dependencies,
      }
    },
    refetchInterval: 5000,
    staleTime: 2000,
    enabled: isBrowser,
  })
}

export function useInstallDependency() {
  return useMutation({
    mutationFn: async (dependency: string): Promise<InstallResult> => {
      const key = dependency.toLowerCase()
      if (key === 'go') {
        return {
          voice_response: 'Install Go from https://go.dev/dl/ or run: brew install go',
          next_step: 'https://go.dev/dl/',
        }
      }
      if (key === 'beads' || key === 'bd') {
        return {
          voice_response: 'Run: go install github.com/steveyegge/beads/cmd/bd@latest',
          next_step: 'https://github.com/steveyegge/beads',
        }
      }
      if (key === 'gastown' || key === 'gt') {
        return {
          voice_response: 'Run: go install github.com/txgsync/gastown/cmd/gt@latest',
          next_step: 'https://github.com/txgsync/gastown',
        }
      }
      if (key === 'tmux') {
        return {
          voice_response: 'Install tmux: brew install tmux (macOS) or apt install tmux (Linux)',
          next_step: 'https://github.com/tmux/tmux',
        }
      }
      return {
        voice_response: `No installer available for ${dependency}.`,
      }
    },
  })
}

export function useCreateWorkspace() {
  return useMutation({
    mutationFn: async (path?: string): Promise<InstallResult> => {
      if (!path) {
        return { voice_response: 'Provide a workspace path to continue.' }
      }
      return {
        voice_response: `Create a workspace at ${path} and run: gt init ${path}`,
      }
    },
  })
}

// Setup state for FTUE banner
export interface SetupState {
  hasGo: boolean
  hasBd: boolean
  hasBdMinVersion: boolean
  hasGt: boolean
  hasGtMinVersion: boolean
  hasWorkspace: boolean
  workspacePath?: string
}

// Check Gas Town setup state (for FTUE banner)
export function useSetupState() {
  return useQuery({
    queryKey: ['setupState'],
    queryFn: async (): Promise<SetupState> => {
      if (!isTauri()) {
        // Return mock complete state in development
        return {
          hasGo: true,
          hasBd: true,
          hasBdMinVersion: true,
          hasGt: true,
          hasGtMinVersion: true,
          hasWorkspace: true,
          workspacePath: '~/gt',
        }
      }

      // Check for bd and gt
      const [bdResult, gtResult] = await Promise.all([
        runCommand('bd', ['version']).catch(() => null),
        runCommand('gt', ['version']).catch(() => null),
      ])

      const hasBd = bdResult?.exit_code === 0
      const hasGt = gtResult?.exit_code === 0

      // Parse versions
      const bdVersion = bdResult?.stdout?.match(/bd version (\d+\.\d+\.\d+)/)?.[1]
      const gtVersion = gtResult?.stdout?.match(/gt version (\d+\.\d+\.\d+)/)?.[1]

      const hasBdMinVersion = bdVersion ? compareVersions(bdVersion, '0.43.0') >= 0 : false
      const hasGtMinVersion = gtVersion ? compareVersions(gtVersion, '0.2.0') >= 0 : false

      // Check workspace
      let hasWorkspace = false
      let workspacePath: string | undefined
      if (hasGt) {
        const statusResult = await runCommand('gt', ['status']).catch(() => null)
        hasWorkspace = statusResult?.exit_code === 0
        // Could parse workspace path from output if needed
      }

      return {
        hasGo: true, // If bd/gt work, Go is installed
        hasBd,
        hasBdMinVersion,
        hasGt,
        hasGtMinVersion,
        hasWorkspace,
        workspacePath,
      }
    },
    staleTime: 60000, // Cache for 1 minute
    enabled: isBrowser,
  })
}

// Simple version comparison
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA > numB) return 1
    if (numA < numB) return -1
  }
  return 0
}

/**
 * Parse polecat list output for comparison view
 */
function parsePolecatListForComparison(output: string, rigName: string): Polecat[] {
  const lines = output.split('\n').filter(line => line.trim())
  const polecats: Polecat[] = []

  for (const line of lines) {
    // Parse polecat lines like: "nux [active] - Working on ga-xxx"
    const match = line.match(/^(\S+)\s+\[(\w+)\](?:\s+-\s+(.+))?$/)
    if (match) {
      const statusMap: Record<string, Polecat['status']> = {
        active: 'active',
        idle: 'idle',
        stuck: 'stuck',
        error: 'stuck',
        offline: 'offline',
      }
      polecats.push({
        name: match[1],
        rig: rigName,
        status: statusMap[match[2]] || 'idle',
        current_work: match[3],
      })
    }
  }

  return polecats
}

/**
 * Hook for fetching detailed rig status with polecats and beads for comparison
 */
export function useRigStatus(rigName: string) {
  return useQuery({
    queryKey: ['rig', rigName, 'status'],
    queryFn: async (): Promise<RigWithHealth> => {
      // Get polecat list for this rig
      const polecatResult = await runCommand('gt', ['polecat', 'list', rigName])
      const polecats = polecatResult.exit_code === 0
        ? parsePolecatListForComparison(polecatResult.stdout, rigName)
        : []

      // Get beads stats for this rig
      const statsResult = await runCommand('bd', ['stats', '--json'])
      let beads_count = { open: 0, in_progress: 0, closed: 0, blocked: 0 }

      if (statsResult.exit_code === 0) {
        try {
          const stats = JSON.parse(statsResult.stdout)
          beads_count = {
            open: stats.open || 0,
            in_progress: stats.in_progress || 0,
            closed: stats.closed || 0,
            blocked: stats.blocked || 0,
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Determine health based on blocked count and polecat status
      const hasErrors = polecats.some(p => p.status === 'stuck')
      const hasBlocked = beads_count.blocked > 0
      const health: RigWithHealth['health'] = hasErrors ? 'unhealthy' : hasBlocked ? 'degraded' : 'healthy'

      return {
        name: rigName,
        path: '',
        polecats,
        beads_count,
        health,
      }
    },
    refetchInterval: 5000,
    enabled: !!rigName,
  })
}

/**
 * Stop all Gas Town work (emergency stop)
 * Calls gt stop --all to halt all agents
 */
export function useStopAll() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<CommandResult> => {
      if (!isTauri()) {
        // Mock response for development
        return { stdout: 'Mock emergency stop - all agents stopped', stderr: '', exit_code: 0 }
      }

      return runCommand('gt', ['stop', '--all'])
    },
    onSuccess: () => {
      // Invalidate all queries to refresh state after stop
      queryClient.invalidateQueries({ queryKey: ['convoys'] })
      queryClient.invalidateQueries({ queryKey: ['beads'] })
      queryClient.invalidateQueries({ queryKey: ['polecats'] })
      queryClient.invalidateQueries({ queryKey: ['townStatus'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
    },
  })
}

/**
 * Hook for fetching multiple rig statuses for comparison
 */
export function useRigComparison(rigNames: string[]) {
  return useQuery({
    queryKey: ['rigs', 'comparison', rigNames],
    queryFn: async (): Promise<RigWithHealth[]> => {
      const results = await Promise.all(
        rigNames.map(async (name) => {
          // Get polecat list for this rig
          const polecatResult = await runCommand('gt', ['polecat', 'list', name])
          const polecats = polecatResult.exit_code === 0
            ? parsePolecatListForComparison(polecatResult.stdout, name)
            : []

          // Determine health
          const hasErrors = polecats.some(p => p.status === 'stuck')
          const health: RigWithHealth['health'] = hasErrors ? 'unhealthy' : 'healthy'

          return {
            name,
            path: '',
            polecats,
            beads_count: { open: 0, in_progress: 0, closed: 0, blocked: 0 },
            health,
          }
        })
      )
      return results
    },
    refetchInterval: 5000,
    enabled: rigNames.length > 0,
  })
}
