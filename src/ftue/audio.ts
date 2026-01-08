/**
 * FTUE Audio Manager
 *
 * Coordinates audio during the First-Time User Experience:
 * - Voice clip playback with ducking (lowers music volume)
 * - Background music sequencing with crossfades
 * - Mute/unmute controls with fade
 * - Completion fade-out
 */

export interface AudioTrack {
  /** Track identifier */
  id: string
  /** Track URL or base64 data */
  src: string
  /** Volume level (0-1) */
  volume: number
  /** Whether to loop */
  loop: boolean
}

export interface VoiceClip {
  /** Clip identifier */
  id: string
  /** Audio URL or base64 data */
  src: string
  /** Duration in seconds (optional, auto-detected if not provided) */
  duration?: number
}

export interface FTUEAudioConfig {
  /** Background music volume (default: 0.2 = 20%) */
  musicVolume?: number
  /** Voice clip volume (default: 1.0) */
  voiceVolume?: number
  /** Music volume during voice playback (default: 0.05 = 5%) */
  duckingVolume?: number
  /** Crossfade duration in seconds (default: 2) */
  crossfadeDuration?: number
  /** Fade out duration on completion (default: 3) */
  fadeOutDuration?: number
}

const DEFAULT_CONFIG: Required<FTUEAudioConfig> = {
  musicVolume: 0.2,
  voiceVolume: 1.0,
  duckingVolume: 0.05,
  crossfadeDuration: 2,
  fadeOutDuration: 3,
}

type AudioState = 'stopped' | 'playing' | 'paused' | 'ducked'

/**
 * FTUE Audio Manager for coordinating voice, music, and sound effects
 *
 * @example
 * ```typescript
 * const audioManager = new FTUEAudioManager()
 *
 * // Start background music
 * await audioManager.startMusic([
 *   { id: 'ambient1', src: '/audio/ambient1.mp3', volume: 1, loop: true },
 *   { id: 'ambient2', src: '/audio/ambient2.mp3', volume: 1, loop: true },
 * ])
 *
 * // Play voice with auto-ducking
 * await audioManager.playVoice({ id: 'welcome', src: '/audio/welcome.mp3' })
 *
 * // Fade out on FTUE completion
 * await audioManager.fadeOutAll()
 * ```
 */
export class FTUEAudioManager {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private voiceGain: GainNode | null = null

  private musicSources: Map<string, AudioBufferSourceNode> = new Map()
  private musicBuffers: Map<string, AudioBuffer> = new Map()
  private currentMusicIndex = 0
  private musicTracks: AudioTrack[] = []

  private voiceSource: AudioBufferSourceNode | null = null
  private isVoicePlaying = false

  private config: Required<FTUEAudioConfig>
  private state: AudioState = 'stopped'
  private isMuted = false
  private preMuteVolume = 1

  constructor(config?: FTUEAudioConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (this.audioContext) return

    this.audioContext = new AudioContext()

    // Create gain nodes
    this.masterGain = this.audioContext.createGain()
    this.masterGain.connect(this.audioContext.destination)

    this.musicGain = this.audioContext.createGain()
    this.musicGain.gain.value = this.config.musicVolume
    this.musicGain.connect(this.masterGain)

    this.voiceGain = this.audioContext.createGain()
    this.voiceGain.gain.value = this.config.voiceVolume
    this.voiceGain.connect(this.masterGain)

    // Resume if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  /**
   * Load an audio file and return an AudioBuffer
   */
  private async loadAudio(src: string): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio not initialized')

    let arrayBuffer: ArrayBuffer

    if (src.startsWith('data:')) {
      // Base64 encoded audio
      const base64 = src.split(',')[1]
      const binaryString = atob(base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      arrayBuffer = bytes.buffer
    } else {
      // URL
      const response = await fetch(src)
      arrayBuffer = await response.arrayBuffer()
    }

    return this.audioContext.decodeAudioData(arrayBuffer)
  }

  /**
   * Start background music with the provided tracks
   * Tracks will be played in sequence with crossfades
   */
  async startMusic(tracks: AudioTrack[]): Promise<void> {
    await this.init()
    if (!this.audioContext || !this.musicGain) return

    this.musicTracks = tracks
    this.currentMusicIndex = 0

    // Preload all tracks
    for (const track of tracks) {
      if (!this.musicBuffers.has(track.id)) {
        const buffer = await this.loadAudio(track.src)
        this.musicBuffers.set(track.id, buffer)
      }
    }

    // Start first track
    if (tracks.length > 0) {
      await this.playMusicTrack(0)
      this.state = 'playing'
    }
  }

  /**
   * Play a specific music track by index
   */
  private async playMusicTrack(index: number): Promise<void> {
    if (!this.audioContext || !this.musicGain) return
    if (index >= this.musicTracks.length) return

    const track = this.musicTracks[index]
    const buffer = this.musicBuffers.get(track.id)
    if (!buffer) return

    // Create source
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = track.loop

    // Create individual gain for this track
    const trackGain = this.audioContext.createGain()
    trackGain.gain.value = track.volume
    source.connect(trackGain)
    trackGain.connect(this.musicGain)

    // Handle track end (for non-looping tracks)
    if (!track.loop) {
      source.onended = () => {
        this.musicSources.delete(track.id)
        // Play next track with crossfade
        this.currentMusicIndex = (this.currentMusicIndex + 1) % this.musicTracks.length
        this.crossfadeToTrack(this.currentMusicIndex)
      }
    }

    source.start()
    this.musicSources.set(track.id, source)
  }

  /**
   * Crossfade to a new track
   */
  private async crossfadeToTrack(index: number): Promise<void> {
    if (!this.audioContext || !this.musicGain) return

    const duration = this.config.crossfadeDuration
    const now = this.audioContext.currentTime

    // Fade out current tracks
    for (const [id, source] of this.musicSources) {
      const track = this.musicTracks.find((t) => t.id === id)
      if (track) {
        // Create a gain envelope
        const envelope = this.audioContext.createGain()
        envelope.gain.setValueAtTime(track.volume, now)
        envelope.gain.linearRampToValueAtTime(0, now + duration)

        // Stop source after fade
        setTimeout(() => {
          try {
            source.stop()
          } catch {
            // Ignore if already stopped
          }
          this.musicSources.delete(id)
        }, duration * 1000)
      }
    }

    // Start new track with fade in
    await this.playMusicTrack(index)
  }

  /**
   * Play a voice clip with automatic music ducking
   */
  async playVoice(clip: VoiceClip): Promise<void> {
    await this.init()
    if (!this.audioContext || !this.voiceGain || !this.musicGain) return

    // Stop any currently playing voice
    if (this.voiceSource) {
      try {
        this.voiceSource.stop()
      } catch {
        // Ignore if already stopped
      }
    }

    // Load voice clip
    const buffer = await this.loadAudio(clip.src)

    // Duck music
    const now = this.audioContext.currentTime
    this.musicGain.gain.linearRampToValueAtTime(
      this.config.duckingVolume,
      now + 0.3
    )
    this.state = 'ducked'

    // Create and play voice source
    this.voiceSource = this.audioContext.createBufferSource()
    this.voiceSource.buffer = buffer
    this.voiceSource.connect(this.voiceGain)

    this.isVoicePlaying = true

    // Restore music when voice ends
    this.voiceSource.onended = () => {
      this.isVoicePlaying = false
      this.voiceSource = null

      if (this.audioContext && this.musicGain && this.state !== 'stopped') {
        const endTime = this.audioContext.currentTime
        this.musicGain.gain.linearRampToValueAtTime(
          this.config.musicVolume,
          endTime + 0.5
        )
        this.state = 'playing'
      }
    }

    this.voiceSource.start()

    // Return promise that resolves when voice ends
    return new Promise((resolve) => {
      if (this.voiceSource) {
        this.voiceSource.onended = () => {
          this.isVoicePlaying = false
          this.voiceSource = null

          if (this.audioContext && this.musicGain && this.state !== 'stopped') {
            const endTime = this.audioContext.currentTime
            this.musicGain.gain.linearRampToValueAtTime(
              this.config.musicVolume,
              endTime + 0.5
            )
            this.state = 'playing'
          }

          resolve()
        }
      } else {
        resolve()
      }
    })
  }

  /**
   * Play a voice clip and wait for it to finish
   */
  async playVoiceAndWait(clip: VoiceClip): Promise<void> {
    return this.playVoice(clip)
  }

  /**
   * Stop voice playback
   */
  stopVoice(): void {
    if (this.voiceSource) {
      try {
        this.voiceSource.stop()
      } catch {
        // Ignore if already stopped
      }
      this.voiceSource = null
      this.isVoicePlaying = false
    }
  }

  /**
   * Mute all audio with fade
   */
  mute(fadeDuration = 0.5): void {
    if (!this.audioContext || !this.masterGain || this.isMuted) return

    this.preMuteVolume = this.masterGain.gain.value
    const now = this.audioContext.currentTime
    this.masterGain.gain.linearRampToValueAtTime(0, now + fadeDuration)
    this.isMuted = true
  }

  /**
   * Unmute all audio with fade
   */
  unmute(fadeDuration = 0.5): void {
    if (!this.audioContext || !this.masterGain || !this.isMuted) return

    const now = this.audioContext.currentTime
    this.masterGain.gain.linearRampToValueAtTime(
      this.preMuteVolume,
      now + fadeDuration
    )
    this.isMuted = false
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    if (this.isMuted) {
      this.unmute()
    } else {
      this.mute()
    }
    return this.isMuted
  }

  /**
   * Fade out all audio (for FTUE completion)
   */
  async fadeOutAll(): Promise<void> {
    if (!this.audioContext || !this.masterGain) return

    const duration = this.config.fadeOutDuration
    const now = this.audioContext.currentTime

    this.masterGain.gain.linearRampToValueAtTime(0, now + duration)

    return new Promise((resolve) => {
      setTimeout(() => {
        this.stopAll()
        resolve()
      }, duration * 1000)
    })
  }

  /**
   * Stop all audio immediately
   */
  stopAll(): void {
    // Stop voice
    this.stopVoice()

    // Stop all music sources
    for (const source of this.musicSources.values()) {
      try {
        source.stop()
      } catch {
        // Ignore if already stopped
      }
    }
    this.musicSources.clear()

    this.state = 'stopped'
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    if (!this.masterGain) return
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume))
  }

  /**
   * Set music volume
   */
  setMusicVolume(volume: number): void {
    if (!this.musicGain) return
    this.config.musicVolume = Math.max(0, Math.min(1, volume))
    if (!this.isVoicePlaying) {
      this.musicGain.gain.value = this.config.musicVolume
    }
  }

  /**
   * Set voice volume
   */
  setVoiceVolume(volume: number): void {
    if (!this.voiceGain) return
    this.config.voiceVolume = Math.max(0, Math.min(1, volume))
    this.voiceGain.gain.value = this.config.voiceVolume
  }

  /**
   * Get current state
   */
  getState(): AudioState {
    return this.state
  }

  /**
   * Check if muted
   */
  getIsMuted(): boolean {
    return this.isMuted
  }

  /**
   * Check if voice is playing
   */
  getIsVoicePlaying(): boolean {
    return this.isVoicePlaying
  }

  /**
   * Cleanup and release resources
   */
  async dispose(): Promise<void> {
    this.stopAll()

    if (this.audioContext) {
      await this.audioContext.close()
      this.audioContext = null
    }

    this.masterGain = null
    this.musicGain = null
    this.voiceGain = null
    this.musicBuffers.clear()
  }
}

// Singleton instance for convenience
let audioManagerInstance: FTUEAudioManager | null = null

/**
 * Get the singleton FTUE audio manager instance
 */
export function getFTUEAudioManager(config?: FTUEAudioConfig): FTUEAudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new FTUEAudioManager(config)
  }
  return audioManagerInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export async function resetFTUEAudioManager(): Promise<void> {
  if (audioManagerInstance) {
    await audioManagerInstance.dispose()
    audioManagerInstance = null
  }
}
