import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSetupStatus, useVisionServerStatus } from './useGastown'

/**
 * FTUE (First Time User Experience) State Machine
 *
 * Tracks the complete onboarding flow including:
 * - Dependency checking and installation
 * - Workspace creation
 * - Voice model download and initialization
 * - Consent collection
 * - Transitions between pre-baked and live voice
 */

// ============== State Types ==============

/**
 * Overall FTUE phase
 */
export type FTUEPhase =
  | 'checking'           // Initial load, checking status
  | 'needs_consent'      // Requires user consent before proceeding
  | 'needs_deps'         // Missing required dependencies
  | 'needs_workspace'    // Dependencies OK, need workspace
  | 'workspace_creating' // Creating workspace in progress
  | 'voice_setup'        // Setting up voice (download/start)
  | 'complete'           // FTUE finished, ready to use

/**
 * Voice subsystem state
 */
export type VoiceState =
  | 'not_started'    // Voice setup hasn't begun
  | 'downloading'    // Downloading LFM2.5 model
  | 'starting'       // Starting voice server
  | 'live'           // LFM2.5 running locally (full capability)
  | 'prebaked'       // Using pre-recorded voice responses
  | 'text_only'      // Text mode (no voice)
  | 'error'          // Voice setup failed

/**
 * Audio manager state for background music/ambiance
 */
export type AudioState =
  | 'off'        // No audio
  | 'loading'    // Loading audio assets
  | 'playing'    // Audio playing
  | 'paused'     // Audio paused
  | 'error'      // Audio failed

/**
 * Download progress tracking
 */
export interface DownloadProgress {
  isDownloading: boolean
  currentFile: string | null
  bytesDownloaded: number
  totalBytes: number
  percentage: number
  speedBps: number
  etaSeconds: number | null
}

/**
 * User consent state
 */
export interface ConsentState {
  microphoneGranted: boolean | null  // null = not asked yet
  termsAccepted: boolean
  dataCollectionAccepted: boolean | null  // null = not asked, can be optional
}

/**
 * Complete FTUE state
 */
export interface FTUEState {
  phase: FTUEPhase
  voiceState: VoiceState
  audioState: AudioState
  download: DownloadProgress
  consent: ConsentState

  // Derived/computed
  canProceed: boolean
  showTheatricalTransition: boolean
  errorMessage: string | null

  // Progress indicators
  overallProgress: number  // 0-100
  currentStepLabel: string
}

/**
 * Actions that can be dispatched to the state machine
 */
export type FTUEAction =
  | { type: 'START_CHECKING' }
  | { type: 'DEPS_CHECKED'; missing: number; hasWorkspace: boolean }
  | { type: 'CONSENT_GRANTED'; consent: Partial<ConsentState> }
  | { type: 'CONSENT_DECLINED'; field: keyof ConsentState }
  | { type: 'DEPS_INSTALLED' }
  | { type: 'WORKSPACE_CREATING' }
  | { type: 'WORKSPACE_CREATED' }
  | { type: 'WORKSPACE_FAILED'; error: string }
  | { type: 'VOICE_DOWNLOAD_START'; totalBytes: number }
  | { type: 'VOICE_DOWNLOAD_PROGRESS'; bytesDownloaded: number; speedBps: number }
  | { type: 'VOICE_DOWNLOAD_COMPLETE' }
  | { type: 'VOICE_STARTING' }
  | { type: 'VOICE_READY' }
  | { type: 'VOICE_FAILED'; error: string }
  | { type: 'USE_PREBAKED_VOICE' }
  | { type: 'USE_TEXT_ONLY' }
  | { type: 'SKIP_VOICE_SETUP' }
  | { type: 'AUDIO_LOADING' }
  | { type: 'AUDIO_READY' }
  | { type: 'AUDIO_PLAY' }
  | { type: 'AUDIO_PAUSE' }
  | { type: 'AUDIO_ERROR'; error: string }
  | { type: 'COMPLETE' }
  | { type: 'RESET' }

// ============== Initial State ==============

const initialDownloadProgress: DownloadProgress = {
  isDownloading: false,
  currentFile: null,
  bytesDownloaded: 0,
  totalBytes: 0,
  percentage: 0,
  speedBps: 0,
  etaSeconds: null,
}

const initialConsentState: ConsentState = {
  microphoneGranted: null,
  termsAccepted: false,
  dataCollectionAccepted: null,
}

const initialState: FTUEState = {
  phase: 'checking',
  voiceState: 'not_started',
  audioState: 'off',
  download: initialDownloadProgress,
  consent: initialConsentState,
  canProceed: false,
  showTheatricalTransition: false,
  errorMessage: null,
  overallProgress: 0,
  currentStepLabel: 'Checking your setup...',
}

// ============== Reducer ==============

function computeDerivedState(state: FTUEState): FTUEState {
  let canProceed = false
  let overallProgress = 0
  let currentStepLabel = ''
  let showTheatricalTransition = false

  switch (state.phase) {
    case 'checking':
      overallProgress = 5
      currentStepLabel = 'Checking your setup...'
      break
    case 'needs_consent':
      overallProgress = 10
      currentStepLabel = 'Review permissions'
      canProceed = state.consent.termsAccepted
      break
    case 'needs_deps':
      overallProgress = 20
      currentStepLabel = 'Install dependencies'
      break
    case 'needs_workspace':
      overallProgress = 40
      currentStepLabel = 'Create workspace'
      canProceed = true
      break
    case 'workspace_creating':
      overallProgress = 50
      currentStepLabel = 'Creating workspace...'
      showTheatricalTransition = true
      break
    case 'voice_setup':
      if (state.voiceState === 'downloading') {
        overallProgress = 60 + (state.download.percentage * 0.25)
        currentStepLabel = `Downloading voice model (${state.download.percentage.toFixed(0)}%)`
      } else if (state.voiceState === 'starting') {
        overallProgress = 85
        currentStepLabel = 'Starting voice engine...'
        showTheatricalTransition = true
      } else {
        overallProgress = 70
        currentStepLabel = 'Setting up voice...'
      }
      break
    case 'complete':
      overallProgress = 100
      currentStepLabel = 'Ready!'
      canProceed = true
      showTheatricalTransition = true
      break
  }

  return {
    ...state,
    canProceed,
    overallProgress,
    currentStepLabel,
    showTheatricalTransition,
  }
}

function ftueReducer(state: FTUEState, action: FTUEAction): FTUEState {
  let newState = { ...state }

  switch (action.type) {
    case 'START_CHECKING':
      newState = { ...initialState, phase: 'checking' }
      break

    case 'DEPS_CHECKED':
      if (action.missing > 0) {
        newState.phase = 'needs_deps'
      } else if (!action.hasWorkspace) {
        newState.phase = 'needs_workspace'
      } else {
        newState.phase = 'voice_setup'
      }
      newState.errorMessage = null
      break

    case 'CONSENT_GRANTED':
      newState.consent = { ...state.consent, ...action.consent }
      // If terms accepted, move to next phase
      if (action.consent.termsAccepted && state.phase === 'needs_consent') {
        newState.phase = 'checking'
      }
      break

    case 'CONSENT_DECLINED':
      newState.consent = { ...state.consent, [action.field]: false }
      if (action.field === 'microphoneGranted') {
        // User declined mic, fall back to text-only
        newState.voiceState = 'text_only'
      }
      break

    case 'DEPS_INSTALLED':
      newState.phase = 'needs_workspace'
      break

    case 'WORKSPACE_CREATING':
      newState.phase = 'workspace_creating'
      break

    case 'WORKSPACE_CREATED':
      newState.phase = 'voice_setup'
      newState.voiceState = 'not_started'
      break

    case 'WORKSPACE_FAILED':
      newState.phase = 'needs_workspace'
      newState.errorMessage = action.error
      break

    case 'VOICE_DOWNLOAD_START':
      newState.voiceState = 'downloading'
      newState.download = {
        ...initialDownloadProgress,
        isDownloading: true,
        totalBytes: action.totalBytes,
        currentFile: 'LFM2.5-Audio-1.5B-GGUF',
      }
      break

    case 'VOICE_DOWNLOAD_PROGRESS':
      const percentage = state.download.totalBytes > 0
        ? (action.bytesDownloaded / state.download.totalBytes) * 100
        : 0
      const remainingBytes = state.download.totalBytes - action.bytesDownloaded
      const etaSeconds = action.speedBps > 0
        ? remainingBytes / action.speedBps
        : null
      newState.download = {
        ...state.download,
        bytesDownloaded: action.bytesDownloaded,
        percentage,
        speedBps: action.speedBps,
        etaSeconds,
      }
      break

    case 'VOICE_DOWNLOAD_COMPLETE':
      newState.download = {
        ...state.download,
        isDownloading: false,
        percentage: 100,
      }
      newState.voiceState = 'starting'
      break

    case 'VOICE_STARTING':
      newState.voiceState = 'starting'
      break

    case 'VOICE_READY':
      newState.voiceState = 'live'
      newState.phase = 'complete'
      break

    case 'VOICE_FAILED':
      newState.voiceState = 'error'
      newState.errorMessage = action.error
      // Don't block completion - offer fallback
      break

    case 'USE_PREBAKED_VOICE':
      newState.voiceState = 'prebaked'
      newState.phase = 'complete'
      break

    case 'USE_TEXT_ONLY':
      newState.voiceState = 'text_only'
      newState.phase = 'complete'
      break

    case 'SKIP_VOICE_SETUP':
      newState.voiceState = 'text_only'
      newState.phase = 'complete'
      break

    case 'AUDIO_LOADING':
      newState.audioState = 'loading'
      break

    case 'AUDIO_READY':
      newState.audioState = 'paused'
      break

    case 'AUDIO_PLAY':
      newState.audioState = 'playing'
      break

    case 'AUDIO_PAUSE':
      newState.audioState = 'paused'
      break

    case 'AUDIO_ERROR':
      newState.audioState = 'error'
      break

    case 'COMPLETE':
      newState.phase = 'complete'
      break

    case 'RESET':
      return initialState

    default:
      return state
  }

  return computeDerivedState(newState)
}

// ============== Hook ==============

export interface UseFTUEStateMachineOptions {
  /** Skip voice setup entirely */
  skipVoice?: boolean
  /** Start with consent flow */
  requireConsent?: boolean
  /** Auto-start checking on mount */
  autoStart?: boolean
}

export function useFTUEStateMachine(options: UseFTUEStateMachineOptions = {}) {
  const { skipVoice = false, requireConsent = false, autoStart = true } = options

  const [state, setState] = useState<FTUEState>(() => {
    if (requireConsent) {
      return computeDerivedState({ ...initialState, phase: 'needs_consent' })
    }
    return computeDerivedState(initialState)
  })

  // Dispatch action to state machine
  const dispatch = useCallback((action: FTUEAction) => {
    setState((prev) => ftueReducer(prev, action))
  }, [])

  // Query hooks for external state
  const { data: setupStatus, refetch: refetchSetup } = useSetupStatus()
  const { data: voiceStatus } = useVisionServerStatus()

  // Sync external state with state machine
  useEffect(() => {
    if (state.phase === 'checking' && setupStatus) {
      dispatch({
        type: 'DEPS_CHECKED',
        missing: setupStatus.missing_count,
        hasWorkspace: setupStatus.workspace_exists,
      })
    }
  }, [state.phase, setupStatus, dispatch])

  // Auto-transition to voice ready when server is ready
  useEffect(() => {
    if (state.phase === 'voice_setup' && voiceStatus?.ready) {
      dispatch({ type: 'VOICE_READY' })
    }
  }, [state.phase, voiceStatus?.ready, dispatch])

  // Skip voice if option set
  useEffect(() => {
    if (skipVoice && state.phase === 'voice_setup') {
      dispatch({ type: 'SKIP_VOICE_SETUP' })
    }
  }, [skipVoice, state.phase, dispatch])

  // Action helpers
  const actions = useMemo(() => ({
    startChecking: () => {
      dispatch({ type: 'START_CHECKING' })
      refetchSetup()
    },

    grantConsent: (consent: Partial<ConsentState>) => {
      dispatch({ type: 'CONSENT_GRANTED', consent })
    },

    declineConsent: (field: keyof ConsentState) => {
      dispatch({ type: 'CONSENT_DECLINED', field })
    },

    depsInstalled: () => {
      dispatch({ type: 'DEPS_INSTALLED' })
      refetchSetup()
    },

    startWorkspaceCreation: () => {
      dispatch({ type: 'WORKSPACE_CREATING' })
    },

    workspaceCreated: () => {
      dispatch({ type: 'WORKSPACE_CREATED' })
    },

    workspaceFailed: (error: string) => {
      dispatch({ type: 'WORKSPACE_FAILED', error })
    },

    startVoiceDownload: (totalBytes: number) => {
      dispatch({ type: 'VOICE_DOWNLOAD_START', totalBytes })
    },

    updateDownloadProgress: (bytesDownloaded: number, speedBps: number) => {
      dispatch({ type: 'VOICE_DOWNLOAD_PROGRESS', bytesDownloaded, speedBps })
    },

    voiceDownloadComplete: () => {
      dispatch({ type: 'VOICE_DOWNLOAD_COMPLETE' })
    },

    startVoiceServer: () => {
      dispatch({ type: 'VOICE_STARTING' })
    },

    voiceReady: () => {
      dispatch({ type: 'VOICE_READY' })
    },

    voiceFailed: (error: string) => {
      dispatch({ type: 'VOICE_FAILED', error })
    },

    usePrebaked: () => {
      dispatch({ type: 'USE_PREBAKED_VOICE' })
    },

    useTextOnly: () => {
      dispatch({ type: 'USE_TEXT_ONLY' })
    },

    skipVoiceSetup: () => {
      dispatch({ type: 'SKIP_VOICE_SETUP' })
    },

    complete: () => {
      dispatch({ type: 'COMPLETE' })
    },

    reset: () => {
      dispatch({ type: 'RESET' })
    },
  }), [dispatch, refetchSetup])

  // Auto-start on mount
  useEffect(() => {
    if (autoStart && state.phase === 'checking') {
      refetchSetup()
    }
  }, [autoStart, state.phase, refetchSetup])

  return {
    state,
    actions,
    dispatch,
    // Convenience accessors
    phase: state.phase,
    voiceState: state.voiceState,
    audioState: state.audioState,
    download: state.download,
    consent: state.consent,
    progress: state.overallProgress,
    stepLabel: state.currentStepLabel,
    canProceed: state.canProceed,
    showTransition: state.showTheatricalTransition,
    error: state.errorMessage,
  }
}

export default useFTUEStateMachine
