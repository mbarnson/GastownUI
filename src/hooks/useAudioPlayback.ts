import { useRef, useState, useCallback, useEffect } from 'react'

export type PlaybackState = 'idle' | 'playing' | 'interrupted'

interface AudioPlaybackState {
  state: PlaybackState
  isPlaying: boolean
  duration: number // accumulated duration of queued audio
}

/**
 * Decode base64 audio chunk to Float32Array samples
 */
function decodeAudioChunk(base64Chunk: string): Float32Array {
  const binaryString = atob(base64Chunk)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Float32Array(bytes.buffer)
}

/**
 * Audio stream player for streaming base64 audio chunks
 * Schedules chunks for seamless playback with interrupt support
 */
class AudioStreamPlayer {
  private context: AudioContext | null = null
  private nextStartTime = 0
  private closeTimer: ReturnType<typeof setTimeout> | null = null
  private activeSources: AudioBufferSourceNode[] = []
  private onStateChange: ((state: PlaybackState) => void) | null = null
  private totalDuration = 0
  private playbackStartTime = 0

  constructor(onStateChange?: (state: PlaybackState) => void) {
    this.onStateChange = onStateChange || null
  }

  enqueue(base64Chunk: string, sampleRate: number): boolean {
    if (!base64Chunk) {
      return false
    }

    if (!this.context || this.context.sampleRate !== sampleRate) {
      this.reset(sampleRate)
    }

    if (!this.context) {
      return false
    }

    const samples = decodeAudioChunk(base64Chunk)
    if (samples.length === 0) {
      return false
    }

    const buffer = this.context.createBuffer(1, samples.length, sampleRate)
    buffer.copyToChannel(samples, 0)

    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.connect(this.context.destination)

    const startAt = Math.max(this.context.currentTime, this.nextStartTime)
    source.start(startAt)
    this.nextStartTime = startAt + buffer.duration
    this.totalDuration += buffer.duration

    // Track active source for interrupt
    this.activeSources.push(source)
    source.onended = () => {
      const idx = this.activeSources.indexOf(source)
      if (idx !== -1) {
        this.activeSources.splice(idx, 1)
      }
      // Check if all audio finished
      if (this.activeSources.length === 0 && this.onStateChange) {
        this.onStateChange('idle')
      }
    }

    // Notify playing state
    if (this.onStateChange && this.activeSources.length === 1) {
      this.playbackStartTime = this.context.currentTime
      this.onStateChange('playing')
    }

    return true
  }

  reset(sampleRate: number) {
    this.stop()
    this.context = new AudioContext({ sampleRate })
    this.nextStartTime = this.context.currentTime
    this.totalDuration = 0
    this.playbackStartTime = this.context.currentTime
  }

  /**
   * Interrupt playback immediately (user requested)
   */
  interrupt() {
    if (!this.context) return

    // Stop all active sources
    for (const source of this.activeSources) {
      try {
        source.stop()
      } catch {
        // Ignore errors from already-stopped sources
      }
    }
    this.activeSources = []

    if (this.onStateChange) {
      this.onStateChange('interrupted')
    }

    this.closeContext()
  }

  /**
   * Stop playback gracefully (called when stream ends)
   */
  stop() {
    if (!this.context) return
    this.closeContext()
  }

  private closeContext() {
    if (!this.context) return

    const context = this.context
    const delay = Math.max(0, this.nextStartTime - context.currentTime)

    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
    }

    this.closeTimer = setTimeout(() => {
      context.close()
      if (this.onStateChange && this.activeSources.length === 0) {
        this.onStateChange('idle')
      }
    }, (delay + 0.05) * 1000)

    this.context = null
    this.nextStartTime = 0
    this.totalDuration = 0
  }

  /**
   * Get current playback progress (0-1)
   */
  getProgress(): number {
    if (!this.context || this.totalDuration === 0) return 0
    const elapsed = this.context.currentTime - this.playbackStartTime
    return Math.min(1, elapsed / this.totalDuration)
  }

  /**
   * Check if any audio is currently playing
   */
  isPlaying(): boolean {
    return this.activeSources.length > 0
  }
}

export interface UseAudioPlaybackReturn {
  /** Current playback state */
  state: PlaybackState
  /** Whether audio is currently playing */
  isPlaying: boolean
  /** Enqueue a base64 audio chunk for playback */
  enqueue: (base64Chunk: string, sampleRate: number) => void
  /** Interrupt playback immediately (user action) */
  interrupt: () => void
  /** Stop playback gracefully (stream ended) */
  stop: () => void
  /** Reset the player for a new stream */
  reset: () => void
}

/**
 * Hook for managing streaming audio playback with state tracking and interrupt support
 *
 * Features:
 * - Seamless streaming playback from base64 chunks
 * - Speaking indicator via state tracking
 * - Interrupt/cancel support
 * - Automatic cleanup
 *
 * @example
 * ```tsx
 * const { isPlaying, enqueue, interrupt } = useAudioPlayback()
 *
 * // In stream handler
 * onAudioChunk: (chunk, sampleRate) => enqueue(chunk, sampleRate)
 *
 * // Show speaking indicator
 * {isPlaying && <SpeakingIndicator />}
 *
 * // Interrupt button
 * <button onClick={interrupt}>Stop Speaking</button>
 * ```
 */
export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [state, setState] = useState<PlaybackState>('idle')
  const playerRef = useRef<AudioStreamPlayer | null>(null)

  // Create player with state callback
  const getPlayer = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new AudioStreamPlayer((newState) => {
        setState(newState)
      })
    }
    return playerRef.current
  }, [])

  const enqueue = useCallback((base64Chunk: string, sampleRate: number) => {
    getPlayer().enqueue(base64Chunk, sampleRate)
  }, [getPlayer])

  const interrupt = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.interrupt()
    }
  }, [])

  const stop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop()
    }
  }, [])

  const reset = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop()
    }
    playerRef.current = null
    setState('idle')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.stop()
      }
    }
  }, [])

  return {
    state,
    isPlaying: state === 'playing',
    enqueue,
    interrupt,
    stop,
    reset,
  }
}

export default useAudioPlayback
