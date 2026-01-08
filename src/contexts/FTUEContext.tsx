import { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react'

/**
 * FTUE (First Time User Experience) State Machine
 *
 * Manages the onboarding flow with:
 * - Voice/music state
 * - Download progress tracking
 * - Text-mode support
 * - Consent flow
 * - Theatrical illusion transitions
 */

// ============================================================================
// Types
// ============================================================================

export type FTUEStage =
  | 'welcome'           // Initial greeting
  | 'consent'           // Terms, permissions, preferences
  | 'download'          // Model/asset downloads
  | 'setup'             // Configuration steps
  | 'tutorial'          // Interactive guidance
  | 'complete'          // All done, celebration

export type AudioMode = 'voice' | 'music' | 'both' | 'none'
export type InteractionMode = 'voice' | 'text' | 'hybrid'

export interface DownloadProgress {
  id: string
  name: string
  bytesDownloaded: number
  totalBytes: number
  status: 'pending' | 'downloading' | 'paused' | 'complete' | 'error'
  error?: string
}

export interface ConsentItem {
  id: string
  title: string
  description: string
  required: boolean
  accepted: boolean
}

export interface TheatricalTransition {
  type: 'fade' | 'slide' | 'reveal' | 'dissolve' | 'typewriter'
  duration: number
  delay: number
}

export interface FTUEState {
  // Current stage
  stage: FTUEStage
  stageProgress: number // 0-100 within current stage

  // Audio settings
  audioMode: AudioMode
  voiceReady: boolean
  musicReady: boolean
  voiceVolume: number
  musicVolume: number

  // Interaction mode
  interactionMode: InteractionMode
  textModeEnabled: boolean

  // Download tracking
  downloads: DownloadProgress[]
  overallDownloadProgress: number

  // Consent
  consents: ConsentItem[]
  allRequiredConsentsAccepted: boolean

  // Theatrical transitions
  currentTransition: TheatricalTransition | null
  transitionComplete: boolean

  // Completed steps for celebration
  completedSteps: string[]

  // Error handling
  error: string | null

  // Session tracking
  startedAt: number | null
  lastInteractionAt: number | null
  totalTimeMs: number
}

// ============================================================================
// Actions
// ============================================================================

type FTUEAction =
  | { type: 'SET_STAGE'; stage: FTUEStage }
  | { type: 'SET_STAGE_PROGRESS'; progress: number }
  | { type: 'SET_AUDIO_MODE'; mode: AudioMode }
  | { type: 'SET_VOICE_READY'; ready: boolean }
  | { type: 'SET_MUSIC_READY'; ready: boolean }
  | { type: 'SET_VOICE_VOLUME'; volume: number }
  | { type: 'SET_MUSIC_VOLUME'; volume: number }
  | { type: 'SET_INTERACTION_MODE'; mode: InteractionMode }
  | { type: 'SET_TEXT_MODE'; enabled: boolean }
  | { type: 'ADD_DOWNLOAD'; download: DownloadProgress }
  | { type: 'UPDATE_DOWNLOAD'; id: string; update: Partial<DownloadProgress> }
  | { type: 'REMOVE_DOWNLOAD'; id: string }
  | { type: 'SET_CONSENT'; id: string; accepted: boolean }
  | { type: 'SET_ALL_CONSENTS'; consents: ConsentItem[] }
  | { type: 'START_TRANSITION'; transition: TheatricalTransition }
  | { type: 'END_TRANSITION' }
  | { type: 'ADD_COMPLETED_STEP'; step: string }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'TOUCH_INTERACTION' }
  | { type: 'RESET' }

// ============================================================================
// Initial State
// ============================================================================

const initialState: FTUEState = {
  stage: 'welcome',
  stageProgress: 0,

  audioMode: 'both',
  voiceReady: false,
  musicReady: false,
  voiceVolume: 0.8,
  musicVolume: 0.5,

  interactionMode: 'hybrid',
  textModeEnabled: false,

  downloads: [],
  overallDownloadProgress: 0,

  consents: [],
  allRequiredConsentsAccepted: false,

  currentTransition: null,
  transitionComplete: true,

  completedSteps: [],

  error: null,

  startedAt: null,
  lastInteractionAt: null,
  totalTimeMs: 0,
}

// ============================================================================
// Reducer
// ============================================================================

function ftueReducer(state: FTUEState, action: FTUEAction): FTUEState {
  switch (action.type) {
    case 'SET_STAGE':
      return {
        ...state,
        stage: action.stage,
        stageProgress: 0,
        transitionComplete: false,
      }

    case 'SET_STAGE_PROGRESS':
      return {
        ...state,
        stageProgress: Math.max(0, Math.min(100, action.progress)),
      }

    case 'SET_AUDIO_MODE':
      return { ...state, audioMode: action.mode }

    case 'SET_VOICE_READY':
      return { ...state, voiceReady: action.ready }

    case 'SET_MUSIC_READY':
      return { ...state, musicReady: action.ready }

    case 'SET_VOICE_VOLUME':
      return { ...state, voiceVolume: Math.max(0, Math.min(1, action.volume)) }

    case 'SET_MUSIC_VOLUME':
      return { ...state, musicVolume: Math.max(0, Math.min(1, action.volume)) }

    case 'SET_INTERACTION_MODE':
      return { ...state, interactionMode: action.mode }

    case 'SET_TEXT_MODE':
      return { ...state, textModeEnabled: action.enabled }

    case 'ADD_DOWNLOAD':
      return {
        ...state,
        downloads: [...state.downloads, action.download],
      }

    case 'UPDATE_DOWNLOAD': {
      const downloads = state.downloads.map(d =>
        d.id === action.id ? { ...d, ...action.update } : d
      )
      const totalBytes = downloads.reduce((sum, d) => sum + d.totalBytes, 0)
      const downloadedBytes = downloads.reduce((sum, d) => sum + d.bytesDownloaded, 0)
      const overallDownloadProgress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0

      return {
        ...state,
        downloads,
        overallDownloadProgress,
      }
    }

    case 'REMOVE_DOWNLOAD':
      return {
        ...state,
        downloads: state.downloads.filter(d => d.id !== action.id),
      }

    case 'SET_CONSENT': {
      const consents = state.consents.map(c =>
        c.id === action.id ? { ...c, accepted: action.accepted } : c
      )
      const allRequiredConsentsAccepted = consents
        .filter(c => c.required)
        .every(c => c.accepted)

      return {
        ...state,
        consents,
        allRequiredConsentsAccepted,
      }
    }

    case 'SET_ALL_CONSENTS': {
      const allRequiredConsentsAccepted = action.consents
        .filter(c => c.required)
        .every(c => c.accepted)

      return {
        ...state,
        consents: action.consents,
        allRequiredConsentsAccepted,
      }
    }

    case 'START_TRANSITION':
      return {
        ...state,
        currentTransition: action.transition,
        transitionComplete: false,
      }

    case 'END_TRANSITION':
      return {
        ...state,
        currentTransition: null,
        transitionComplete: true,
      }

    case 'ADD_COMPLETED_STEP':
      if (state.completedSteps.includes(action.step)) {
        return state
      }
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.step],
      }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'TOUCH_INTERACTION': {
      const now = Date.now()
      const startedAt = state.startedAt ?? now
      const totalTimeMs = state.totalTimeMs + (state.lastInteractionAt ? now - state.lastInteractionAt : 0)

      return {
        ...state,
        startedAt,
        lastInteractionAt: now,
        totalTimeMs,
      }
    }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

// ============================================================================
// Context
// ============================================================================

interface FTUEContextValue {
  state: FTUEState

  // Stage navigation
  goToStage: (stage: FTUEStage) => void
  nextStage: () => void
  setStageProgress: (progress: number) => void

  // Audio controls
  setAudioMode: (mode: AudioMode) => void
  setVoiceReady: (ready: boolean) => void
  setMusicReady: (ready: boolean) => void
  setVoiceVolume: (volume: number) => void
  setMusicVolume: (volume: number) => void

  // Interaction mode
  setInteractionMode: (mode: InteractionMode) => void
  setTextMode: (enabled: boolean) => void

  // Downloads
  addDownload: (download: DownloadProgress) => void
  updateDownload: (id: string, update: Partial<DownloadProgress>) => void
  removeDownload: (id: string) => void

  // Consent
  setConsent: (id: string, accepted: boolean) => void
  initializeConsents: (consents: ConsentItem[]) => void

  // Transitions
  startTransition: (transition: TheatricalTransition) => void
  endTransition: () => void

  // Progress tracking
  addCompletedStep: (step: string) => void

  // Error handling
  setError: (error: string | null) => void

  // Session
  touchInteraction: () => void
  reset: () => void

  // Helpers
  isAudioEnabled: boolean
  isVoiceEnabled: boolean
  isMusicEnabled: boolean
  canProceed: boolean
}

const FTUEContext = createContext<FTUEContextValue | null>(null)

// ============================================================================
// Provider
// ============================================================================

const STORAGE_KEY = 'gastownui-ftue-state'

const stageOrder: FTUEStage[] = ['welcome', 'consent', 'download', 'setup', 'tutorial', 'complete']

interface FTUEProviderProps {
  children: ReactNode
  /** Skip loading saved state (for testing) */
  skipRestore?: boolean
}

export function FTUEProvider({ children, skipRestore = false }: FTUEProviderProps) {
  const [state, dispatch] = useReducer(ftueReducer, initialState, (initial) => {
    if (skipRestore || typeof window === 'undefined') {
      return initial
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge saved state with initial to handle schema changes
        return { ...initial, ...parsed }
      }
    } catch {
      // Ignore parse errors
    }

    return initial
  })

  // Persist state changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore storage errors
    }
  }, [state])

  // Stage navigation
  const goToStage = useCallback((stage: FTUEStage) => {
    dispatch({ type: 'SET_STAGE', stage })
  }, [])

  const nextStage = useCallback(() => {
    const currentIndex = stageOrder.indexOf(state.stage)
    if (currentIndex < stageOrder.length - 1) {
      dispatch({ type: 'SET_STAGE', stage: stageOrder[currentIndex + 1] })
    }
  }, [state.stage])

  const setStageProgress = useCallback((progress: number) => {
    dispatch({ type: 'SET_STAGE_PROGRESS', progress })
  }, [])

  // Audio controls
  const setAudioMode = useCallback((mode: AudioMode) => {
    dispatch({ type: 'SET_AUDIO_MODE', mode })
  }, [])

  const setVoiceReady = useCallback((ready: boolean) => {
    dispatch({ type: 'SET_VOICE_READY', ready })
  }, [])

  const setMusicReady = useCallback((ready: boolean) => {
    dispatch({ type: 'SET_MUSIC_READY', ready })
  }, [])

  const setVoiceVolume = useCallback((volume: number) => {
    dispatch({ type: 'SET_VOICE_VOLUME', volume })
  }, [])

  const setMusicVolume = useCallback((volume: number) => {
    dispatch({ type: 'SET_MUSIC_VOLUME', volume })
  }, [])

  // Interaction mode
  const setInteractionMode = useCallback((mode: InteractionMode) => {
    dispatch({ type: 'SET_INTERACTION_MODE', mode })
  }, [])

  const setTextMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_TEXT_MODE', enabled })
  }, [])

  // Downloads
  const addDownload = useCallback((download: DownloadProgress) => {
    dispatch({ type: 'ADD_DOWNLOAD', download })
  }, [])

  const updateDownload = useCallback((id: string, update: Partial<DownloadProgress>) => {
    dispatch({ type: 'UPDATE_DOWNLOAD', id, update })
  }, [])

  const removeDownload = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_DOWNLOAD', id })
  }, [])

  // Consent
  const setConsent = useCallback((id: string, accepted: boolean) => {
    dispatch({ type: 'SET_CONSENT', id, accepted })
  }, [])

  const initializeConsents = useCallback((consents: ConsentItem[]) => {
    dispatch({ type: 'SET_ALL_CONSENTS', consents })
  }, [])

  // Transitions
  const startTransition = useCallback((transition: TheatricalTransition) => {
    dispatch({ type: 'START_TRANSITION', transition })
  }, [])

  const endTransition = useCallback(() => {
    dispatch({ type: 'END_TRANSITION' })
  }, [])

  // Progress tracking
  const addCompletedStep = useCallback((step: string) => {
    dispatch({ type: 'ADD_COMPLETED_STEP', step })
  }, [])

  // Error handling
  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', error })
  }, [])

  // Session
  const touchInteraction = useCallback(() => {
    dispatch({ type: 'TOUCH_INTERACTION' })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Computed helpers
  const isAudioEnabled = state.audioMode !== 'none'
  const isVoiceEnabled = state.audioMode === 'voice' || state.audioMode === 'both'
  const isMusicEnabled = state.audioMode === 'music' || state.audioMode === 'both'

  const canProceed = (() => {
    switch (state.stage) {
      case 'consent':
        return state.allRequiredConsentsAccepted
      case 'download':
        return state.overallDownloadProgress >= 100
      default:
        return state.stageProgress >= 100 || state.transitionComplete
    }
  })()

  const value: FTUEContextValue = {
    state,
    goToStage,
    nextStage,
    setStageProgress,
    setAudioMode,
    setVoiceReady,
    setMusicReady,
    setVoiceVolume,
    setMusicVolume,
    setInteractionMode,
    setTextMode,
    addDownload,
    updateDownload,
    removeDownload,
    setConsent,
    initializeConsents,
    startTransition,
    endTransition,
    addCompletedStep,
    setError,
    touchInteraction,
    reset,
    isAudioEnabled,
    isVoiceEnabled,
    isMusicEnabled,
    canProceed,
  }

  return (
    <FTUEContext.Provider value={value}>
      {children}
    </FTUEContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useFTUE(): FTUEContextValue {
  const context = useContext(FTUEContext)
  if (!context) {
    throw new Error('useFTUE must be used within FTUEProvider')
  }
  return context
}

// ============================================================================
// Theatrical Transition Helpers
// ============================================================================

export const transitions = {
  fade: (duration = 500, delay = 0): TheatricalTransition => ({
    type: 'fade',
    duration,
    delay,
  }),

  slide: (duration = 400, delay = 0): TheatricalTransition => ({
    type: 'slide',
    duration,
    delay,
  }),

  reveal: (duration = 800, delay = 200): TheatricalTransition => ({
    type: 'reveal',
    duration,
    delay,
  }),

  dissolve: (duration = 600, delay = 100): TheatricalTransition => ({
    type: 'dissolve',
    duration,
    delay,
  }),

  typewriter: (duration = 1000, delay = 0): TheatricalTransition => ({
    type: 'typewriter',
    duration,
    delay,
  }),
}

// ============================================================================
// Default Consents
// ============================================================================

export const defaultConsents: ConsentItem[] = [
  {
    id: 'terms',
    title: 'Terms of Service',
    description: 'I agree to the Gas Town Terms of Service',
    required: true,
    accepted: false,
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    description: 'I acknowledge the Privacy Policy',
    required: true,
    accepted: false,
  },
  {
    id: 'voice',
    title: 'Voice Features',
    description: 'Enable voice commands and audio feedback',
    required: false,
    accepted: true,
  },
  {
    id: 'analytics',
    title: 'Usage Analytics',
    description: 'Help improve Gas Town by sharing anonymous usage data',
    required: false,
    accepted: false,
  },
]
