import { useState, useCallback, useEffect, useRef } from 'react'
import { useFTUE } from '../contexts/FTUEContext'

/**
 * FTUE Voice Hook
 *
 * Plays pre-baked voice clips during the First-Time User Experience.
 * Uses the manifest at /assets/voice/ftue/manifest.json for clip metadata.
 * Integrates with FTUEContext to trigger music ducking via voiceReady state.
 */

// ============================================================================
// Types
// ============================================================================

export interface VoiceClip {
  id: string
  filename: string
  script: string
  duration: number | null
  generated: boolean
}

export interface VoiceManifest {
  version: string
  description: string
  model: string
  format: string
  sampleRate: number
  channels: number
  normalization: {
    targetLUFS: number
    truePeak: number
  }
  clips: VoiceClip[]
}

export interface UseFTUEVoiceOptions {
  /** Path to voice assets (default: /assets/voice/ftue) */
  basePath?: string
  /** Callback when clip finishes playing */
  onClipEnd?: (clipId: string) => void
  /** Callback on error */
  onError?: (error: string) => void
}

export interface UseFTUEVoiceReturn {
  /** Play a clip by ID */
  playClip: (clipId: string) => Promise<void>
  /** Stop currently playing clip */
  stopClip: () => void
  /** Whether a clip is currently playing */
  isPlaying: boolean
  /** Currently playing clip ID */
  currentClipId: string | null
  /** Loaded manifest */
  manifest: VoiceManifest | null
  /** Loading state */
  isLoading: boolean
  /** Error message */
  error: string | null
  /** Get clip by ID */
  getClip: (clipId: string) => VoiceClip | undefined
}

// ============================================================================
// Default manifest path
// ============================================================================

const DEFAULT_BASE_PATH = '/assets/voice/ftue'

// ============================================================================
// Hook
// ============================================================================

export function useFTUEVoice(options: UseFTUEVoiceOptions = {}): UseFTUEVoiceReturn {
  const {
    basePath = DEFAULT_BASE_PATH,
    onClipEnd,
    onError,
  } = options

  const { setVoiceReady, isVoiceEnabled } = useFTUE()

  const [manifest, setManifest] = useState<VoiceManifest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentClipId, setCurrentClipId] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mountedRef = useRef(true)

  // Load manifest on mount
  useEffect(() => {
    mountedRef.current = true

    async function loadManifest() {
      try {
        const response = await fetch(`${basePath}/manifest.json`)
        if (!response.ok) {
          throw new Error(`Failed to load manifest: ${response.statusText}`)
        }
        const data = await response.json()
        if (mountedRef.current) {
          setManifest(data)
          setIsLoading(false)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load voice manifest'
        if (mountedRef.current) {
          setError(message)
          setIsLoading(false)
          onError?.(message)
        }
      }
    }

    loadManifest()

    return () => {
      mountedRef.current = false
      // Clean up audio on unmount
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [basePath, onError])

  // Get clip by ID
  const getClip = useCallback((clipId: string): VoiceClip | undefined => {
    return manifest?.clips.find(c => c.id === clipId)
  }, [manifest])

  // Play a clip by ID
  const playClip = useCallback(async (clipId: string): Promise<void> => {
    // Don't play if voice is disabled
    if (!isVoiceEnabled) {
      return
    }

    const clip = getClip(clipId)
    if (!clip) {
      const message = `Voice clip not found: ${clipId}`
      setError(message)
      onError?.(message)
      return
    }

    // Stop any currently playing clip
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio(`${basePath}/${clip.filename}`)
      audioRef.current = audio

      // Set voiceReady to true to trigger music ducking
      setVoiceReady(true)
      setIsPlaying(true)
      setCurrentClipId(clipId)
      setError(null)

      audio.onended = () => {
        if (mountedRef.current) {
          setVoiceReady(false)
          setIsPlaying(false)
          setCurrentClipId(null)
          onClipEnd?.(clipId)
        }
        audioRef.current = null
        resolve()
      }

      audio.onerror = () => {
        const message = `Failed to play clip: ${clipId}`
        if (mountedRef.current) {
          setError(message)
          setVoiceReady(false)
          setIsPlaying(false)
          setCurrentClipId(null)
          onError?.(message)
        }
        audioRef.current = null
        reject(new Error(message))
      }

      audio.play().catch((err) => {
        const message = err instanceof Error ? err.message : 'Playback failed'
        if (mountedRef.current) {
          setError(message)
          setVoiceReady(false)
          setIsPlaying(false)
          setCurrentClipId(null)
          onError?.(message)
        }
        audioRef.current = null
        reject(err)
      })
    })
  }, [basePath, getClip, isVoiceEnabled, onClipEnd, onError, setVoiceReady])

  // Stop currently playing clip
  const stopClip = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setVoiceReady(false)
    setIsPlaying(false)
    setCurrentClipId(null)
  }, [setVoiceReady])

  return {
    playClip,
    stopClip,
    isPlaying,
    currentClipId,
    manifest,
    isLoading,
    error,
    getClip,
  }
}

// ============================================================================
// Convenience hook for auto-playing on mount
// ============================================================================

export interface UseAutoPlayVoiceOptions extends UseFTUEVoiceOptions {
  /** Clip ID to auto-play */
  clipId: string
  /** Delay before playing (ms) */
  delay?: number
  /** Skip auto-play */
  skip?: boolean
}

export function useAutoPlayVoice(options: UseAutoPlayVoiceOptions) {
  const { clipId, delay = 500, skip = false, ...voiceOptions } = options
  const voice = useFTUEVoice(voiceOptions)
  const hasPlayedRef = useRef(false)

  useEffect(() => {
    if (skip || hasPlayedRef.current || voice.isLoading) {
      return
    }

    const timer = setTimeout(() => {
      if (!hasPlayedRef.current) {
        hasPlayedRef.current = true
        voice.playClip(clipId).catch(() => {
          // Error already handled in useFTUEVoice
        })
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [clipId, delay, skip, voice.isLoading, voice.playClip])

  return voice
}
