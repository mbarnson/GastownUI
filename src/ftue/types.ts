// FTUE (First Time User Experience) Types

/** Steps in the FTUE flow */
export type FTUEStep =
  | 'consent'                     // Voice model consent screen (first step)
  | 'checking_disk_space'         // Checking if there's enough space for voice
  | 'insufficient_space'          // Not enough disk space for voice model
  | 'welcome'
  | 'checking_prerequisites'
  | 'install_go'
  | 'waiting_for_go'
  | 'install_beads'
  | 'waiting_for_beads'
  | 'install_gastown'
  | 'waiting_for_gastown'
  | 'configure_workspace'
  | 'creating_workspace'
  | 'complete'
  | 'add_first_rig'
  | 'start_mayor'
  | 'skipped'

/** Platform detection */
export type Platform = 'darwin' | 'linux' | 'win32'
export type Arch = 'arm64' | 'x64'

/** System setup state detected at runtime */
export interface SetupState {
  // Prerequisites
  hasGo: boolean
  goVersion?: string

  // Gas Town tools
  hasBd: boolean
  bdVersion?: string
  hasBdMinVersion: boolean  // >= 0.43.0

  hasGt: boolean
  gtVersion?: string
  hasGtMinVersion: boolean  // >= 0.2.0

  // Optional but recommended
  hasTmux: boolean
  tmuxVersion?: string

  // Workspace
  hasWorkspace: boolean
  workspacePath?: string
  workspaceRigs?: string[]

  // System info
  platform: Platform
  arch: Arch
  hasHomebrew?: boolean  // macOS only

  // For error recovery
  pathIncludesGobin: boolean
  lastError?: string
}

/** Voice model download state */
export interface VoiceModelState {
  /** Whether voice mode was chosen in consent */
  voiceModeChosen: boolean
  /** Download in progress */
  downloading: boolean
  /** Download complete and model ready */
  ready: boolean
  /** Download progress (0-100) */
  progress: number
  /** Bytes downloaded */
  bytesDownloaded: number
  /** Total bytes to download */
  totalBytes: number
  /** Download speed in bytes per second */
  bytesPerSecond: number
  /** Estimated seconds remaining */
  estimatedSecondsRemaining: number
  /** Download error if any */
  error?: string
  /** Number of retry attempts */
  retryCount: number
}

/** Disk space info from backend */
export interface DiskSpaceInfo {
  availableBytes: number
  totalBytes: number
  sufficientForVoice: boolean
  availableHuman: string
  requiredBytes: number
  requiredHuman: string
}

/** FTUE state machine state */
export interface FTUEState {
  step: FTUEStep
  setupState: SetupState
  customPath?: string
  firstRigUrl?: string
  errorCount: number
  lastError?: string
  voiceEnabled: boolean
  startedAt: Date
  /** Voice model download state */
  voiceModelState: VoiceModelState
  /** Disk space info from last check */
  diskSpaceInfo?: DiskSpaceInfo
}

/** Persisted progress for resume */
export interface FTUEProgress {
  startedAt: string
  lastStep: FTUEStep
  completedSteps: FTUEStep[]
  customPath?: string
  errors: string[]
}

/** Actions for FTUE state machine */
export type FTUEAction =
  | { type: 'INITIAL_CHECK'; setupState: SetupState }
  | { type: 'PROCEED' }
  | { type: 'GO_DETECTED'; version: string }
  | { type: 'BD_DETECTED'; version: string }
  | { type: 'GT_DETECTED'; version: string }
  | { type: 'WORKSPACE_CREATED'; path: string }
  | { type: 'SET_CUSTOM_PATH'; path: string }
  | { type: 'ERROR'; error: string }
  | { type: 'SKIP' }
  | { type: 'RETRY' }
  | { type: 'TOGGLE_VOICE' }
  | { type: 'VOICE_RESPONSE'; response: string }
  | { type: 'START_ADD_RIG' }
  | { type: 'SET_RIG_URL'; url: string }
  | { type: 'RIG_ADDED'; rigName: string }
  | { type: 'START_MAYOR' }
  | { type: 'MAYOR_STARTED' }
  | { type: 'GO_DASHBOARD' }
  // Voice model consent flow actions
  | { type: 'ENABLE_VOICE' }                                    // User chose voice mode
  | { type: 'SKIP_VOICE' }                                      // User chose text-only mode
  | { type: 'DISK_SPACE_CHECKED'; info: DiskSpaceInfo }         // Disk space check complete
  | { type: 'CHECK_DISK_SPACE_AGAIN' }                          // Retry disk space check
  | { type: 'VOICE_DOWNLOAD_STARTED' }                          // Voice model download started
  | { type: 'VOICE_DOWNLOAD_PROGRESS'; bytes: number; total: number; speed: number }  // Download progress
  | { type: 'VOICE_DOWNLOAD_COMPLETE' }                         // Download finished successfully
  | { type: 'VOICE_DOWNLOAD_FAILED'; error: string }            // Download failed
  | { type: 'VOICE_DOWNLOAD_RETRY' }                            // Retry failed download

/** Checklist item for UI */
export interface ChecklistItem {
  id: string
  label: string
  status: 'pending' | 'checking' | 'complete' | 'error'
  version?: string
}

/** Default checklist items */
export const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'go', label: 'Go programming language', status: 'pending' },
  { id: 'beads', label: 'Beads (issue tracker)', status: 'pending' },
  { id: 'gastown', label: 'Gas Town (orchestrator)', status: 'pending' },
  { id: 'workspace', label: 'Workspace initialization', status: 'pending' },
]

/** Minimum required versions */
export const MIN_VERSIONS = {
  bd: '0.43.0',
  gt: '0.2.0',
} as const

/** Default workspace path */
export const DEFAULT_WORKSPACE_PATH = '~/gt'

/** LocalStorage key for FTUE progress */
export const FTUE_STORAGE_KEY = 'gastownui-ftue-progress'

/** Create default/empty setup state */
export function createEmptySetupState(): SetupState {
  return {
    hasGo: false,
    hasBd: false,
    hasBdMinVersion: false,
    hasGt: false,
    hasGtMinVersion: false,
    hasTmux: false,
    hasWorkspace: false,
    platform: 'darwin',
    arch: 'arm64',
    pathIncludesGobin: false,
  }
}

/** Create initial voice model state */
export function createInitialVoiceModelState(): VoiceModelState {
  return {
    voiceModeChosen: false,
    downloading: false,
    ready: false,
    progress: 0,
    bytesDownloaded: 0,
    totalBytes: 0,
    bytesPerSecond: 0,
    estimatedSecondsRemaining: 0,
    retryCount: 0,
  }
}

/** Create initial FTUE state */
export function createInitialState(): FTUEState {
  return {
    step: 'consent',  // Start with voice consent screen
    setupState: createEmptySetupState(),
    errorCount: 0,
    voiceEnabled: false,  // Not enabled until user chooses
    startedAt: new Date(),
    voiceModelState: createInitialVoiceModelState(),
  }
}

/** Get checklist status based on setup state */
export function getChecklistFromSetup(setupState: SetupState): ChecklistItem[] {
  return [
    {
      id: 'go',
      label: 'Go programming language',
      status: setupState.hasGo ? 'complete' : 'pending',
      version: setupState.goVersion,
    },
    {
      id: 'beads',
      label: 'Beads (issue tracker)',
      status: setupState.hasBdMinVersion ? 'complete' : setupState.hasBd ? 'error' : 'pending',
      version: setupState.bdVersion,
    },
    {
      id: 'gastown',
      label: 'Gas Town (orchestrator)',
      status: setupState.hasGtMinVersion ? 'complete' : setupState.hasGt ? 'error' : 'pending',
      version: setupState.gtVersion,
    },
    {
      id: 'workspace',
      label: 'Workspace initialization',
      status: setupState.hasWorkspace ? 'complete' : 'pending',
    },
  ]
}

/** Check if setup is fully complete */
export function isSetupComplete(setupState: SetupState): boolean {
  return (
    setupState.hasGo &&
    setupState.hasBdMinVersion &&
    setupState.hasGtMinVersion &&
    setupState.hasWorkspace
  )
}

/** Determine which step to start from based on setup state */
export function determineStartStep(setupState: SetupState): FTUEStep {
  if (isSetupComplete(setupState)) {
    return 'complete'
  }

  // Has tools but no workspace - quick setup
  if (setupState.hasGtMinVersion && setupState.hasBdMinVersion && !setupState.hasWorkspace) {
    return 'configure_workspace'
  }

  // Has Go but missing tools
  if (setupState.hasGo && !setupState.hasBdMinVersion) {
    return 'install_beads'
  }

  if (setupState.hasGo && setupState.hasBdMinVersion && !setupState.hasGtMinVersion) {
    return 'install_gastown'
  }

  // No Go - full FTUE
  if (!setupState.hasGo) {
    return 'install_go'
  }

  return 'welcome'
}
