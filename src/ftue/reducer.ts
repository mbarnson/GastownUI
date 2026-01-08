// FTUE State Machine Reducer with localStorage Persistence

import {
  type FTUEState,
  type FTUEAction,
  type FTUEStep,
  type FTUEProgress,
  createInitialState,
  determineStartStep,
  FTUE_STORAGE_KEY,
} from './types'

/** FTUE reducer - handles all state transitions */
export function ftueReducer(state: FTUEState, action: FTUEAction): FTUEState {
  const newState = ftueReducerCore(state, action)

  // Persist progress to localStorage on every state change
  if (typeof window !== 'undefined') {
    persistProgress(newState)
  }

  return newState
}

/** Core reducer logic */
function ftueReducerCore(state: FTUEState, action: FTUEAction): FTUEState {
  switch (action.type) {
    case 'INITIAL_CHECK': {
      // Determine starting step based on detected setup state
      const startStep = determineStartStep(action.setupState)
      return {
        ...state,
        step: startStep === 'complete' ? 'complete' : 'welcome',
        setupState: action.setupState,
      }
    }

    case 'PROCEED': {
      // Advance to next step based on current step
      return {
        ...state,
        step: getNextStep(state.step, state.setupState),
        lastError: undefined,
      }
    }

    case 'GO_DETECTED': {
      const newSetupState = {
        ...state.setupState,
        hasGo: true,
        goVersion: action.version,
      }
      return {
        ...state,
        setupState: newSetupState,
        step: determineNextAfterDetection(state.step, 'go', newSetupState),
      }
    }

    case 'BD_DETECTED': {
      const version = action.version
      const hasBdMinVersion = compareVersions(version, '0.43.0') >= 0
      const newSetupState = {
        ...state.setupState,
        hasBd: true,
        bdVersion: version,
        hasBdMinVersion,
      }
      return {
        ...state,
        setupState: newSetupState,
        step: hasBdMinVersion
          ? determineNextAfterDetection(state.step, 'bd', newSetupState)
          : state.step,
        lastError: hasBdMinVersion
          ? undefined
          : `Beads ${version} is installed but we need at least 0.43.0. Run the install command again to update.`,
      }
    }

    case 'GT_DETECTED': {
      const version = action.version
      const hasGtMinVersion = compareVersions(version, '0.2.0') >= 0
      const newSetupState = {
        ...state.setupState,
        hasGt: true,
        gtVersion: version,
        hasGtMinVersion,
      }
      return {
        ...state,
        setupState: newSetupState,
        step: hasGtMinVersion
          ? determineNextAfterDetection(state.step, 'gt', newSetupState)
          : state.step,
        lastError: hasGtMinVersion
          ? undefined
          : `Gas Town ${version} is installed but we need at least 0.2.0. Run the install command again to update.`,
      }
    }

    case 'WORKSPACE_CREATED': {
      const newSetupState = {
        ...state.setupState,
        hasWorkspace: true,
        workspacePath: action.path,
      }
      return {
        ...state,
        setupState: newSetupState,
        step: 'complete',
        customPath: action.path,
      }
    }

    case 'SET_CUSTOM_PATH': {
      return {
        ...state,
        customPath: action.path,
        step: 'creating_workspace',
      }
    }

    case 'ERROR': {
      return {
        ...state,
        errorCount: state.errorCount + 1,
        lastError: action.error,
      }
    }

    case 'SKIP': {
      return {
        ...state,
        step: 'skipped',
      }
    }

    case 'RETRY': {
      // Go back to the appropriate install step based on current state
      return {
        ...state,
        lastError: undefined,
        step: determineRetryStep(state),
      }
    }

    case 'TOGGLE_VOICE': {
      return {
        ...state,
        voiceEnabled: !state.voiceEnabled,
      }
    }

    case 'VOICE_RESPONSE': {
      // Handle voice responses - map to appropriate actions
      const response = action.response.toLowerCase().trim()

      if (response.includes("let's go") || response.includes('ready') || response.includes('start')) {
        return ftueReducerCore(state, { type: 'PROCEED' })
      }

      if (response.includes('skip')) {
        return ftueReducerCore(state, { type: 'SKIP' })
      }

      // Default: stay in current state
      return state
    }

    case 'START_ADD_RIG': {
      return {
        ...state,
        step: 'add_first_rig',
      }
    }

    case 'SET_RIG_URL': {
      return {
        ...state,
        firstRigUrl: action.url,
      }
    }

    case 'RIG_ADDED': {
      const newSetupState = {
        ...state.setupState,
        workspaceRigs: [...(state.setupState.workspaceRigs || []), action.rigName],
      }
      return {
        ...state,
        setupState: newSetupState,
        step: 'complete',
      }
    }

    case 'START_MAYOR': {
      return {
        ...state,
        step: 'start_mayor',
      }
    }

    case 'MAYOR_STARTED': {
      return {
        ...state,
        step: 'complete',
      }
    }

    case 'GO_DASHBOARD': {
      // Will be handled by router navigation
      return state
    }

    default:
      return state
  }
}

/** Get next step in the flow */
function getNextStep(currentStep: FTUEStep, setupState: {
  hasGo: boolean
  hasBdMinVersion: boolean
  hasGtMinVersion: boolean
  hasWorkspace: boolean
}): FTUEStep {
  const stepOrder: FTUEStep[] = [
    'welcome',
    'checking_prerequisites',
    'install_go',
    'waiting_for_go',
    'install_beads',
    'waiting_for_beads',
    'install_gastown',
    'waiting_for_gastown',
    'configure_workspace',
    'creating_workspace',
    'complete',
  ]

  const currentIndex = stepOrder.indexOf(currentStep)
  if (currentIndex === -1 || currentIndex >= stepOrder.length - 1) {
    return currentStep
  }

  // Skip steps that are already complete
  let nextStep = stepOrder[currentIndex + 1]

  // Skip Go steps if Go is installed
  if (nextStep === 'install_go' && setupState.hasGo) {
    nextStep = 'install_beads'
  }
  if (nextStep === 'waiting_for_go' && setupState.hasGo) {
    nextStep = 'install_beads'
  }

  // Skip Beads steps if Beads is installed
  if (nextStep === 'install_beads' && setupState.hasBdMinVersion) {
    nextStep = 'install_gastown'
  }
  if (nextStep === 'waiting_for_beads' && setupState.hasBdMinVersion) {
    nextStep = 'install_gastown'
  }

  // Skip Gas Town steps if Gas Town is installed
  if (nextStep === 'install_gastown' && setupState.hasGtMinVersion) {
    nextStep = 'configure_workspace'
  }
  if (nextStep === 'waiting_for_gastown' && setupState.hasGtMinVersion) {
    nextStep = 'configure_workspace'
  }

  // Skip workspace if already exists
  if (nextStep === 'configure_workspace' && setupState.hasWorkspace) {
    nextStep = 'complete'
  }
  if (nextStep === 'creating_workspace' && setupState.hasWorkspace) {
    nextStep = 'complete'
  }

  return nextStep
}

/** Determine next step after tool detection */
function determineNextAfterDetection(
  currentStep: FTUEStep,
  detected: 'go' | 'bd' | 'gt',
  setupState: {
    hasGo: boolean
    hasBdMinVersion: boolean
    hasGtMinVersion: boolean
    hasWorkspace: boolean
  }
): FTUEStep {
  if (detected === 'go' && (currentStep === 'install_go' || currentStep === 'waiting_for_go')) {
    return setupState.hasBdMinVersion ? 'install_gastown' : 'install_beads'
  }

  if (detected === 'bd' && (currentStep === 'install_beads' || currentStep === 'waiting_for_beads')) {
    return setupState.hasGtMinVersion ? 'configure_workspace' : 'install_gastown'
  }

  if (detected === 'gt' && (currentStep === 'install_gastown' || currentStep === 'waiting_for_gastown')) {
    return setupState.hasWorkspace ? 'complete' : 'configure_workspace'
  }

  return currentStep
}

/** Determine which step to retry from */
function determineRetryStep(state: FTUEState): FTUEStep {
  if (!state.setupState.hasGo) return 'install_go'
  if (!state.setupState.hasBdMinVersion) return 'install_beads'
  if (!state.setupState.hasGtMinVersion) return 'install_gastown'
  if (!state.setupState.hasWorkspace) return 'configure_workspace'
  return 'welcome'
}

/** Compare semver versions */
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

/** Persist FTUE progress to localStorage */
function persistProgress(state: FTUEState): void {
  try {
    const progress: FTUEProgress = {
      startedAt: state.startedAt.toISOString(),
      lastStep: state.step,
      completedSteps: getCompletedSteps(state),
      customPath: state.customPath,
      errors: state.lastError ? [state.lastError] : [],
    }
    localStorage.setItem(FTUE_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // localStorage might not be available
  }
}

/** Get list of completed steps */
function getCompletedSteps(state: FTUEState): FTUEStep[] {
  const steps: FTUEStep[] = []
  if (state.setupState.hasGo) {
    steps.push('install_go', 'waiting_for_go')
  }
  if (state.setupState.hasBdMinVersion) {
    steps.push('install_beads', 'waiting_for_beads')
  }
  if (state.setupState.hasGtMinVersion) {
    steps.push('install_gastown', 'waiting_for_gastown')
  }
  if (state.setupState.hasWorkspace) {
    steps.push('configure_workspace', 'creating_workspace')
  }
  return steps
}

/** Load persisted progress from localStorage */
export function loadPersistedProgress(): FTUEProgress | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(FTUE_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as FTUEProgress
  } catch {
    return null
  }
}

/** Clear persisted progress */
export function clearPersistedProgress(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(FTUE_STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}

/** Check if FTUE should be shown based on persisted state */
export function shouldShowFTUE(): boolean {
  const progress = loadPersistedProgress()

  // No progress = show FTUE
  if (!progress) return true

  // If we have progress and it's not complete, show FTUE
  if (progress.lastStep !== 'complete' && progress.lastStep !== 'skipped') {
    return true
  }

  // FTUE was completed or skipped
  return false
}
