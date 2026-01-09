// FTUE (First Time User Experience) Types

/** Steps in the FTUE flow */
export type FTUEStep =
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

/** Create initial FTUE state */
export function createInitialState(): FTUEState {
  return {
    step: 'checking_prerequisites',
    setupState: createEmptySetupState(),
    errorCount: 0,
    voiceEnabled: true,
    startedAt: new Date(),
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

// ============================================================================
// Text Mode Accessibility Types
// ============================================================================

/**
 * Text mode settings for accessibility
 */
export interface TextModeSettings {
  /** Whether text-only mode is enabled (no voice) */
  enabled: boolean
  /** Whether to show keyboard shortcuts hint */
  showKeyboardHints: boolean
  /** Whether to respect reduced motion preferences */
  respectReducedMotion: boolean
  /** Font size multiplier for readability */
  fontSizeMultiplier: number
  /** High contrast mode for better visibility */
  highContrast: boolean
}

/** Default text mode settings */
export const DEFAULT_TEXT_MODE_SETTINGS: TextModeSettings = {
  enabled: false,
  showKeyboardHints: true,
  respectReducedMotion: true,
  fontSizeMultiplier: 1.0,
  highContrast: false,
}

/**
 * Navigation direction for keyboard/button navigation
 */
export type NavigationDirection = 'next' | 'back' | 'skip'

/**
 * Step navigation event
 */
export interface StepNavigationEvent {
  direction: NavigationDirection
  fromStep: FTUEStep
  toStep: FTUEStep | null
  source: 'keyboard' | 'button' | 'auto'
}

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcuts {
  next: string[]  // e.g., ['Enter', 'ArrowRight']
  back: string[]  // e.g., ['ArrowLeft', 'Backspace']
  skip: string[]  // e.g., ['Escape']
  help: string[]  // e.g., ['?', 'F1']
}

/** Default keyboard shortcuts */
export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  next: ['Enter', 'ArrowRight'],
  back: ['ArrowLeft', 'Backspace'],
  skip: ['Escape'],
  help: ['?'],
}

/**
 * Text mode step definition with content
 */
export interface TextModeStepDefinition {
  id: FTUEStep
  label: string
  description: string
  /** Voice script text to display */
  scriptText: string
  /** Platform-specific script variants */
  scriptVariants?: {
    platform: Platform
    hasHomebrew?: boolean
    text: string
  }[]
  /** Command to display (if applicable) */
  command?: string
  /** Command description */
  commandDescription?: string
  /** Whether step requires detection before proceeding */
  requiresDetection?: boolean
  /** Setup state key to check for detection */
  detectionKey?: keyof SetupState
  /** Estimated time to complete (for screen reader context) */
  estimatedTime?: string
}

/**
 * ARIA live region configuration
 */
export interface LiveRegionConfig {
  /** Type of live region */
  type: 'polite' | 'assertive' | 'off'
  /** Whether to announce the entire region on updates */
  atomic: boolean
  /** Which parts of the region to announce */
  relevant?: 'additions' | 'removals' | 'text' | 'all'
}

/** Default live region configuration */
export const DEFAULT_LIVE_REGION: LiveRegionConfig = {
  type: 'polite',
  atomic: true,
  relevant: 'additions',
}
