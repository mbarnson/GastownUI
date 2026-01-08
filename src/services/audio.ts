/**
 * Audio Service for GastownUI
 *
 * Provides earcons (short audio cues) for status changes:
 * - Convoy progress notifications
 * - Completion sounds
 * - Error alerts
 * - General UI feedback
 *
 * Uses Web Audio API for low-latency playback and
 * procedural audio generation for customizable earcons.
 */

export type EarconType =
  | 'success' // Task/bead completed
  | 'error' // Error occurred
  | 'warning' // Warning/attention needed
  | 'notification' // General notification
  | 'progress' // Progress update
  | 'convoy_start' // Convoy started
  | 'convoy_complete' // Convoy finished
  | 'agent_active' // Agent became active
  | 'agent_idle' // Agent became idle
  | 'click' // UI click feedback

export interface AudioSettings {
  /** Whether audio is enabled */
  enabled: boolean
  /** Master volume (0-1) */
  volume: number
  /** Enable earcons for status changes */
  earcons: boolean
  /** Enable voice announcements (future) */
  voiceAnnouncements: boolean
  /** Sound scheme preset */
  soundScheme: 'default' | 'minimal' | 'spatial' | 'custom'
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  enabled: true,
  volume: 0.5,
  earcons: true,
  voiceAnnouncements: false,
  soundScheme: 'default',
}

const AUDIO_SETTINGS_KEY = 'gastownui-audio-settings'

/**
 * Get audio settings from localStorage
 */
export function getAudioSettings(): AudioSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_AUDIO_SETTINGS

  try {
    const stored = localStorage.getItem(AUDIO_SETTINGS_KEY)
    if (stored) {
      return { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_AUDIO_SETTINGS
}

/**
 * Save audio settings to localStorage
 */
export function saveAudioSettings(settings: Partial<AudioSettings>): void {
  if (typeof localStorage === 'undefined') return

  const current = getAudioSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(updated))
}

// Singleton audio context
let audioContext: AudioContext | null = null

/**
 * Get or create the shared AudioContext
 * Must be called after user interaction due to autoplay policies
 */
export function getAudioContext(): AudioContext {
  if (!audioContext && typeof AudioContext !== 'undefined') {
    audioContext = new AudioContext()
  }
  if (!audioContext) {
    throw new Error('Web Audio API not supported')
  }
  return audioContext
}

/**
 * Resume audio context if suspended (required after user interaction)
 */
export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}

/**
 * Earcon definitions using procedural audio
 * Each earcon is defined by frequency patterns and envelope
 */
interface EarconDefinition {
  // Frequency in Hz (or array for multi-tone)
  frequency: number | number[]
  // Duration in seconds
  duration: number
  // Attack time (seconds)
  attack: number
  // Decay time (seconds)
  decay: number
  // Wave type
  waveType: OscillatorType
  // Optional: frequency ramp (end frequency)
  frequencyEnd?: number | number[]
  // Optional: detune for stereo/spatial effect
  detune?: number
}

const EARCON_DEFINITIONS: Record<EarconType, EarconDefinition> = {
  success: {
    frequency: [523.25, 659.25, 783.99], // C5, E5, G5 (major chord)
    duration: 0.3,
    attack: 0.01,
    decay: 0.15,
    waveType: 'sine',
  },
  error: {
    frequency: [220, 185], // A3, F#3 (dissonant)
    duration: 0.4,
    attack: 0.01,
    decay: 0.2,
    waveType: 'sawtooth',
  },
  warning: {
    frequency: [440, 554.37], // A4, C#5
    duration: 0.25,
    attack: 0.01,
    decay: 0.1,
    waveType: 'triangle',
  },
  notification: {
    frequency: 880, // A5
    duration: 0.15,
    attack: 0.01,
    decay: 0.08,
    waveType: 'sine',
  },
  progress: {
    frequency: 659.25, // E5
    frequencyEnd: 783.99, // G5
    duration: 0.2,
    attack: 0.01,
    decay: 0.1,
    waveType: 'sine',
  },
  convoy_start: {
    frequency: [261.63, 329.63, 392.0, 523.25], // C4, E4, G4, C5 (ascending)
    duration: 0.5,
    attack: 0.02,
    decay: 0.2,
    waveType: 'sine',
  },
  convoy_complete: {
    frequency: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6 (fanfare)
    duration: 0.6,
    attack: 0.01,
    decay: 0.3,
    waveType: 'sine',
  },
  agent_active: {
    frequency: 440, // A4
    frequencyEnd: 880, // A5
    duration: 0.2,
    attack: 0.01,
    decay: 0.1,
    waveType: 'sine',
  },
  agent_idle: {
    frequency: 880, // A5
    frequencyEnd: 440, // A4
    duration: 0.2,
    attack: 0.01,
    decay: 0.1,
    waveType: 'sine',
  },
  click: {
    frequency: 1000,
    duration: 0.05,
    attack: 0.001,
    decay: 0.03,
    waveType: 'sine',
  },
}

// Minimal sound scheme (shorter, quieter)
const MINIMAL_DEFINITIONS: Partial<Record<EarconType, Partial<EarconDefinition>>> = {
  success: { duration: 0.15, decay: 0.08 },
  error: { duration: 0.2 },
  notification: { duration: 0.1 },
  convoy_start: { frequency: 523.25, duration: 0.2 },
  convoy_complete: { frequency: [523.25, 783.99], duration: 0.3 },
}

/**
 * Play a single oscillator tone
 */
function playTone(
  ctx: AudioContext,
  gainNode: GainNode,
  frequency: number,
  frequencyEnd: number | undefined,
  duration: number,
  attack: number,
  decay: number,
  waveType: OscillatorType,
  delay: number = 0
): void {
  const osc = ctx.createOscillator()
  const envGain = ctx.createGain()

  osc.type = waveType
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay)

  if (frequencyEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(
      frequencyEnd,
      ctx.currentTime + delay + duration
    )
  }

  // ADSR envelope (simplified: attack, sustain at peak, decay)
  const startTime = ctx.currentTime + delay
  envGain.gain.setValueAtTime(0, startTime)
  envGain.gain.linearRampToValueAtTime(1, startTime + attack)
  envGain.gain.setValueAtTime(1, startTime + duration - decay)
  envGain.gain.linearRampToValueAtTime(0, startTime + duration)

  osc.connect(envGain)
  envGain.connect(gainNode)

  osc.start(startTime)
  osc.stop(startTime + duration + 0.01)
}

/**
 * Play an earcon sound
 */
export function playEarcon(type: EarconType, volumeOverride?: number): void {
  const settings = getAudioSettings()

  if (!settings.enabled || !settings.earcons) return

  try {
    const ctx = getAudioContext()

    // Resume if suspended
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    // Get earcon definition with scheme adjustments
    let def = { ...EARCON_DEFINITIONS[type] }

    if (settings.soundScheme === 'minimal' && MINIMAL_DEFINITIONS[type]) {
      def = { ...def, ...MINIMAL_DEFINITIONS[type] }
    }

    // Create master gain
    const masterGain = ctx.createGain()
    const volume = volumeOverride ?? settings.volume
    masterGain.gain.setValueAtTime(volume * 0.3, ctx.currentTime) // Scale down
    masterGain.connect(ctx.destination)

    // Play tones
    const frequencies = Array.isArray(def.frequency)
      ? def.frequency
      : [def.frequency]

    const frequencyEnds = def.frequencyEnd
      ? Array.isArray(def.frequencyEnd)
        ? def.frequencyEnd
        : [def.frequencyEnd]
      : undefined

    // For chord-based earcons, play simultaneously
    // For melodic ones (convoy_start/complete), add slight delay
    const isMelodic = type === 'convoy_start' || type === 'convoy_complete'
    const noteDelay = isMelodic ? 0.08 : 0

    frequencies.forEach((freq, i) => {
      const freqEnd = frequencyEnds?.[i] ?? frequencyEnds?.[0]
      playTone(
        ctx,
        masterGain,
        freq,
        freqEnd,
        def.duration,
        def.attack,
        def.decay,
        def.waveType,
        i * noteDelay
      )
    })
  } catch (err) {
    console.warn('Failed to play earcon:', err)
  }
}

/**
 * Audio service class for more complex scenarios
 */
export class AudioService {
  private static instance: AudioService | null = null

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService()
    }
    return AudioService.instance
  }

  /**
   * Initialize audio (call after user interaction)
   */
  async init(): Promise<void> {
    await resumeAudioContext()
  }

  /**
   * Play an earcon
   */
  play(type: EarconType): void {
    playEarcon(type)
  }

  /**
   * Play a success sound
   */
  success(): void {
    playEarcon('success')
  }

  /**
   * Play an error sound
   */
  error(): void {
    playEarcon('error')
  }

  /**
   * Play a notification sound
   */
  notify(): void {
    playEarcon('notification')
  }

  /**
   * Play convoy start sound
   */
  convoyStart(): void {
    playEarcon('convoy_start')
  }

  /**
   * Play convoy complete sound
   */
  convoyComplete(): void {
    playEarcon('convoy_complete')
  }

  /**
   * Get current settings
   */
  getSettings(): AudioSettings {
    return getAudioSettings()
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<AudioSettings>): void {
    saveAudioSettings(settings)
  }
}

export const audioService = AudioService.getInstance()
