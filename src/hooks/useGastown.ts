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
} from '../types/gastown'

// Additional types from rig view
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
        currentWork: undefined,
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

// ============== Vision Integration ==============

export interface VisionServerStatus {
  running: boolean
  ready: boolean
  url: string
}

export interface VisionResponse {
  description: string
  latency_ms: number
}

export interface ScreenshotResult {
  image_base64: string
  width: number
  height: number
}

// Check vision server status
export function useVisionServerStatus() {
  return useQuery({
    queryKey: ['visionServerStatus'],
    queryFn: async (): Promise<VisionServerStatus> => {
      if (!isTauri()) {
        return { running: false, ready: false, url: 'http://127.0.0.1:8081' }
      }
      return invoke<VisionServerStatus>('get_vision_server_status')
    },
    refetchInterval: 5000,
    staleTime: 2000,
    enabled: isBrowser,
  })
}

// Start vision server (on demand)
export function useStartVisionServer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<VisionServerStatus> => {
      if (!isTauri()) {
        return { running: true, ready: true, url: 'http://127.0.0.1:8081' }
      }
      return invoke<VisionServerStatus>('start_vision_server', { config: null })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visionServerStatus'] })
    },
  })
}

// Stop vision server
export function useStopVisionServer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!isTauri()) {
        return
      }
      return invoke<void>('stop_vision_server')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visionServerStatus'] })
    },
  })
}

// Capture screenshot only (without analysis)
export function useCaptureScreenshot() {
  return useMutation({
    mutationFn: async (): Promise<ScreenshotResult> => {
      if (!isTauri()) {
        // Mock screenshot in dev
        return {
          image_base64: 'mock_base64_data',
          width: 1920,
          height: 1080,
        }
      }
      return invoke<ScreenshotResult>('capture_screenshot')
    },
  })
}

// Describe screen - captures screenshot and analyzes it
// This is the main "what am I looking at?" function
export function useDescribeScreen() {
  return useMutation({
    mutationFn: async (customPrompt?: string): Promise<VisionResponse> => {
      if (!isTauri()) {
        // Mock response in dev
        return {
          description: 'Mock: You are looking at the GastownUI dashboard. It shows 2 active convoys, 3 polecats (2 active, 1 idle), and 5 open beads. The merge queue has 2 items pending.',
          latency_ms: 1500,
        }
      }
      return invoke<VisionResponse>('describe_screen', { customPrompt: customPrompt || null })
    },
  })
}

// Describe an arbitrary image
export function useDescribeImage() {
  return useMutation({
    mutationFn: async ({ imageBase64, prompt }: { imageBase64: string; prompt?: string }): Promise<VisionResponse> => {
      if (!isTauri()) {
        return {
          description: 'Mock: Image description not available in dev mode.',
          latency_ms: 1000,
        }
      }
      return invoke<VisionResponse>('describe_image', {
        imageBase64,
        prompt: prompt || null,
      })
    },
  })
}

// ============== FTUE Setup Integration ==============

export interface DependencyInfo {
  name: string
  installed: boolean
  version: string | null
  path: string | null
  install_url: string
  install_instructions: string
}

export interface SetupStatus {
  ready: boolean
  dependencies: DependencyInfo[]
  workspace_exists: boolean
  workspace_path: string | null
  missing_count: number
  voice_guidance: string
}

export interface InstallResult {
  success: boolean
  message: string
  next_step: string | null
  voice_response: string
}

// Check all dependencies and workspace status
export function useSetupStatus() {
  return useQuery({
    queryKey: ['setupStatus'],
    queryFn: async (): Promise<SetupStatus> => {
      if (!isTauri()) {
        // Mock status for dev mode
        return {
          ready: false,
          dependencies: [
            { name: 'Git', installed: true, version: '2.39.0', path: '/usr/bin/git', install_url: '', install_instructions: '' },
            { name: 'Go', installed: true, version: 'go1.21.5', path: '/usr/local/go/bin/go', install_url: '', install_instructions: '' },
            { name: 'tmux', installed: true, version: 'tmux 3.3a', path: '/usr/local/bin/tmux', install_url: '', install_instructions: '' },
            { name: 'gt (Gas Town CLI)', installed: false, version: null, path: null, install_url: 'https://github.com/txgsync/gastown', install_instructions: 'go install github.com/txgsync/gastown/cmd/gt@latest' },
            { name: 'bd (Beads CLI)', installed: false, version: null, path: null, install_url: 'https://github.com/txgsync/beads', install_instructions: 'go install github.com/txgsync/beads/cmd/bd@latest' },
          ],
          workspace_exists: false,
          workspace_path: null,
          missing_count: 2,
          voice_guidance: "You're missing gt and bd. The Gas Town tools need Go installed first, which you have. Say 'install gt' to continue.",
        }
      }
      return invoke<SetupStatus>('get_setup_status')
    },
    staleTime: 30000, // Don't refetch too often
    enabled: isBrowser,
  })
}

// Install a specific dependency
export function useInstallDependency() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string): Promise<InstallResult> => {
      if (!isTauri()) {
        return {
          success: true,
          message: `Mock: ${name} installed`,
          next_step: null,
          voice_response: `Mock: ${name} has been installed successfully.`,
        }
      }
      return invoke<InstallResult>('install_dependency', { name })
    },
    onSuccess: () => {
      // Refresh setup status after installation
      queryClient.invalidateQueries({ queryKey: ['setupStatus'] })
    },
  })
}

// Create a Gas Town workspace
export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (path?: string): Promise<InstallResult> => {
      if (!isTauri()) {
        return {
          success: true,
          message: 'Mock: Workspace created at ~/gt',
          next_step: null,
          voice_response: 'Mock: Your Gas Town workspace is ready!',
        }
      }
      return invoke<InstallResult>('create_workspace', { path: path || null })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setupStatus'] })
    },
  })
}
