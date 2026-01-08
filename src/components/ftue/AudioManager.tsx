import { createContext, useContext, useCallback, useEffect, useRef, useState, ReactNode } from 'react'
import { useFTUE } from '../../contexts/FTUEContext'
import { useCalmMode } from '../../contexts/CalmModeContext'
import { Volume2, VolumeX, Music } from 'lucide-react'

/**
 * FTUE Audio Manager
 *
 * Manages background music during onboarding:
 * - 3 Hairspring tracks at 20% volume
 * - Duck to 10% during voice clips
 * - Crossfade between scenes
 * - Mute toggle and fade out on completion
 */

// ============================================================================
// Types
// ============================================================================

interface MusicTrack {
  id: string
  name: string
  src: string
  duration?: number
}

interface AudioState {
  isPlaying: boolean
  isMuted: boolean
  currentTrackIndex: number
  volume: number
  isDucked: boolean
}

interface AudioContextValue {
  state: AudioState
  play: () => void
  pause: () => void
  toggle: () => void
  mute: () => void
  unmute: () => void
  toggleMute: () => void
  duck: () => void
  unduck: () => void
  nextTrack: () => void
  fadeOut: (duration?: number) => Promise<void>
  setVolume: (volume: number) => void
}

// ============================================================================
// Music Tracks
// ============================================================================

// Hairspring tracks - placeholder URLs for bundled audio assets
const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'melodic_1',
    name: 'Melodic Flow',
    src: '/audio/hairspring/melodic_1.mp3',
  },
  {
    id: 'melodic_5',
    name: 'Ambient Dreams',
    src: '/audio/hairspring/melodic_5.mp3',
  },
  {
    id: 'vibing_2',
    name: 'Gentle Vibes',
    src: '/audio/hairspring/vibing_2.mp3',
  },
]

// Volume constants
const NORMAL_VOLUME = 0.2 // 20%
const DUCKED_VOLUME = 0.1 // 10%
const CROSSFADE_DURATION = 2000 // 2 seconds

// ============================================================================
// Context
// ============================================================================

const AudioContext = createContext<AudioContextValue | null>(null)

// ============================================================================
// Provider
// ============================================================================

interface AudioProviderProps {
  children: ReactNode
  /** Custom tracks (for testing) */
  tracks?: MusicTrack[]
  /** Disable audio playback */
  disabled?: boolean
}

export function AudioProvider({
  children,
  tracks = MUSIC_TRACKS,
  disabled = false,
}: AudioProviderProps) {
  const { state: ftueState } = useFTUE()
  const { isCalm } = useCalmMode()

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const nextAudioRef = useRef<HTMLAudioElement | null>(null)
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isMuted: false,
    currentTrackIndex: 0,
    volume: NORMAL_VOLUME,
    isDucked: false,
  })

  // Initialize audio element
  useEffect(() => {
    if (disabled || typeof window === 'undefined') return

    audioRef.current = new Audio()
    audioRef.current.loop = false
    audioRef.current.volume = state.isMuted ? 0 : state.volume

    // Load first track
    if (tracks.length > 0) {
      audioRef.current.src = tracks[0].src
      audioRef.current.load()
    }

    // Handle track end - auto-advance to next
    audioRef.current.addEventListener('ended', () => {
      setState(prev => {
        const nextIndex = (prev.currentTrackIndex + 1) % tracks.length
        if (audioRef.current && tracks[nextIndex]) {
          audioRef.current.src = tracks[nextIndex].src
          audioRef.current.play().catch(() => {})
        }
        return { ...prev, currentTrackIndex: nextIndex }
      })
    })

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current)
      }
    }
  }, [disabled, tracks])

  // Sync volume with state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.isMuted ? 0 : state.volume
    }
  }, [state.volume, state.isMuted])

  // Respect FTUE audio settings
  useEffect(() => {
    if (!ftueState.isMusicEnabled || isCalm) {
      setState(prev => ({ ...prev, isMuted: true }))
    }
  }, [ftueState.isMusicEnabled, isCalm])

  // Duck when voice is playing
  useEffect(() => {
    if (ftueState.voiceReady) {
      // When voice starts, duck
      setState(prev => ({
        ...prev,
        isDucked: true,
        volume: DUCKED_VOLUME,
      }))
    } else {
      // When voice stops, unduck
      setState(prev => ({
        ...prev,
        isDucked: false,
        volume: NORMAL_VOLUME,
      }))
    }
  }, [ftueState.voiceReady])

  // Playback controls
  const play = useCallback(() => {
    if (disabled || !audioRef.current) return

    audioRef.current.play().catch(() => {
      // Autoplay blocked - wait for user interaction
    })
    setState(prev => ({ ...prev, isPlaying: true }))
  }, [disabled])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setState(prev => ({ ...prev, isPlaying: false }))
  }, [])

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause()
    } else {
      play()
    }
  }, [state.isPlaying, play, pause])

  // Mute controls
  const mute = useCallback(() => {
    setState(prev => ({ ...prev, isMuted: true }))
  }, [])

  const unmute = useCallback(() => {
    setState(prev => ({ ...prev, isMuted: false }))
  }, [])

  const toggleMute = useCallback(() => {
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }))
  }, [])

  // Ducking for voice clips
  const duck = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDucked: true,
      volume: DUCKED_VOLUME,
    }))
  }, [])

  const unduck = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDucked: false,
      volume: NORMAL_VOLUME,
    }))
  }, [])

  // Track navigation
  const nextTrack = useCallback(() => {
    setState(prev => {
      const nextIndex = (prev.currentTrackIndex + 1) % tracks.length
      if (audioRef.current && tracks[nextIndex]) {
        audioRef.current.src = tracks[nextIndex].src
        if (prev.isPlaying) {
          audioRef.current.play().catch(() => {})
        }
      }
      return { ...prev, currentTrackIndex: nextIndex }
    })
  }, [tracks])

  // Crossfade to next track
  const crossfadeToNext = useCallback(async () => {
    if (!audioRef.current || disabled) return

    const nextIndex = (state.currentTrackIndex + 1) % tracks.length
    const nextTrackData = tracks[nextIndex]
    if (!nextTrackData) return

    // Create next audio element
    nextAudioRef.current = new Audio(nextTrackData.src)
    nextAudioRef.current.volume = 0

    try {
      await nextAudioRef.current.play()

      // Crossfade
      const steps = 20
      const interval = CROSSFADE_DURATION / steps
      const volumeStep = state.volume / steps

      for (let i = 0; i <= steps; i++) {
        await new Promise(resolve => setTimeout(resolve, interval))
        if (audioRef.current) {
          audioRef.current.volume = Math.max(0, state.volume - volumeStep * i)
        }
        if (nextAudioRef.current) {
          nextAudioRef.current.volume = Math.min(state.volume, volumeStep * i)
        }
      }

      // Swap references
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      audioRef.current = nextAudioRef.current
      nextAudioRef.current = null

      setState(prev => ({ ...prev, currentTrackIndex: nextIndex }))
    } catch {
      // Crossfade failed, fall back to simple switch
      nextTrack()
    }
  }, [state.currentTrackIndex, state.volume, tracks, disabled, nextTrack])

  // Fade out
  const fadeOut = useCallback(async (duration = 1000) => {
    if (!audioRef.current || !state.isPlaying) return

    const steps = 20
    const interval = duration / steps
    const volumeStep = state.volume / steps

    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, interval))
      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, state.volume - volumeStep * i)
      }
    }

    pause()
    setState(prev => ({ ...prev, volume: NORMAL_VOLUME }))
  }, [state.isPlaying, state.volume, pause])

  // Set volume
  const setVolume = useCallback((volume: number) => {
    setState(prev => ({
      ...prev,
      volume: Math.max(0, Math.min(1, volume)),
    }))
  }, [])

  const value: AudioContextValue = {
    state,
    play,
    pause,
    toggle,
    mute,
    unmute,
    toggleMute,
    duck,
    unduck,
    nextTrack,
    fadeOut,
    setVolume,
  }

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  )
}

// ============================================================================
// Hook
// ============================================================================

export function useAudio(): AudioContextValue {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider')
  }
  return context
}

// ============================================================================
// Components
// ============================================================================

/**
 * Compact audio control for header/toolbar
 */
interface AudioControlProps {
  className?: string
}

export function AudioControl({ className = '' }: AudioControlProps) {
  const { state, toggle, toggleMute } = useAudio()

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={toggle}
        className={`
          p-2 rounded-lg transition-colors
          ${state.isPlaying
            ? 'bg-cyan-500/20 text-cyan-400'
            : 'bg-slate-700 text-slate-400 hover:text-white'
          }
        `}
        aria-label={state.isPlaying ? 'Pause music' : 'Play music'}
      >
        <Music className="w-4 h-4" />
      </button>

      <button
        onClick={toggleMute}
        className={`
          p-2 rounded-lg transition-colors
          ${state.isMuted
            ? 'bg-red-500/20 text-red-400'
            : 'bg-slate-700 text-slate-400 hover:text-white'
          }
        `}
        aria-label={state.isMuted ? 'Unmute' : 'Mute'}
      >
        {state.isMuted ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}

/**
 * Expanded audio panel with track info and volume
 */
interface AudioPanelProps {
  tracks?: MusicTrack[]
  className?: string
}

export function AudioPanel({ tracks = MUSIC_TRACKS, className = '' }: AudioPanelProps) {
  const { state, toggle, toggleMute, nextTrack, setVolume } = useAudio()

  const currentTrack = tracks[state.currentTrackIndex]

  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 p-4 ${className}`}>
      {/* Track info */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${state.isPlaying ? 'bg-cyan-500/20' : 'bg-slate-700'}
          `}
        >
          <Music className={`w-5 h-5 ${state.isPlaying ? 'text-cyan-400' : 'text-slate-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">
            {currentTrack?.name || 'No track'}
          </p>
          <p className="text-sm text-slate-400">
            Track {state.currentTrackIndex + 1} of {tracks.length}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={toggle}
          className={`
            flex-1 py-2 px-4 rounded-lg font-medium transition-colors
            ${state.isPlaying
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }
          `}
        >
          {state.isPlaying ? 'Pause' : 'Play'}
        </button>

        <button
          onClick={nextTrack}
          className="py-2 px-4 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
        >
          Next
        </button>

        <button
          onClick={toggleMute}
          className={`
            p-2 rounded-lg transition-colors
            ${state.isMuted
              ? 'bg-red-500/20 text-red-400'
              : 'bg-slate-700 text-slate-400 hover:text-white'
            }
          `}
          aria-label={state.isMuted ? 'Unmute' : 'Mute'}
        >
          {state.isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Volume slider */}
      <div className="flex items-center gap-3">
        <Volume2 className="w-4 h-4 text-slate-400" />
        <input
          type="range"
          min="0"
          max="100"
          value={state.volume * 100}
          onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
          className="flex-1 h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
          aria-label="Volume"
        />
        <span className="text-sm text-slate-400 w-10 text-right">
          {Math.round(state.volume * 100)}%
        </span>
      </div>

      {/* Ducking indicator */}
      {state.isDucked && (
        <p className="mt-3 text-xs text-yellow-400">
          Volume ducked for voice playback
        </p>
      )}
    </div>
  )
}

/**
 * Simple mute button for minimal UI
 */
export function MuteButton({ className = '' }: { className?: string }) {
  const { state, toggleMute } = useAudio()

  return (
    <button
      onClick={toggleMute}
      className={`
        p-2 rounded-full transition-colors
        ${state.isMuted
          ? 'bg-slate-700 text-slate-400'
          : 'bg-cyan-500/20 text-cyan-400'
        }
        ${className}
      `}
      aria-label={state.isMuted ? 'Unmute background music' : 'Mute background music'}
    >
      {state.isMuted ? (
        <VolumeX className="w-5 h-5" />
      ) : (
        <Volume2 className="w-5 h-5" />
      )}
    </button>
  )
}
