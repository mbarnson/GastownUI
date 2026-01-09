/**
 * FTUEAudioManager - Voice-guided audio for FTUE flow
 *
 * Provides:
 * - Voice clip playback mapped to FTUE step IDs
 * - Background music with automatic ducking during voice
 * - Music toggle/control
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import type { FTUEStep, Platform } from './types'
import { getAudioContext, resumeAudioContext } from '../services/audio'

/** Voice script content for each FTUE step */
interface VoiceScript {
  /** Main script text (for TTS or display) */
  text: string
  /** Optional variants based on conditions */
  variants?: {
    condition: string
    text: string
  }[]
}

/** Voice scripts mapped to FTUE steps */
export const VOICE_SCRIPTS: Partial<Record<FTUEStep, VoiceScript>> = {
  welcome: {
    text: "Hey there! I'm your Gas Town assistant. I'll be helping you get set up—it usually takes about five minutes. Before we start, I should mention: Gas Town is designed for developers who are comfortable in the terminal and ready to run multiple AI coding agents in parallel. It's powerful, but it does use real API credits. Say 'let's go' when you're ready, or 'tell me more' if you want to know what we're setting up.",
  },
  // Voice model setup steps
  voice_setup_check: {
    text: "Let me check if the voice model is ready. This is what lets me talk to you instead of just displaying text.",
  },
  voice_disk_space_error: {
    text: "Hmm, looks like you'll need about four gigabytes free to download the voice model. You can free up some space and try again, or continue with text-only mode for now.",
  },
  voice_downloading: {
    text: "Downloading the voice model now. This is about one and a half gigabytes, so it might take a few minutes depending on your connection.",
  },
  voice_download_error: {
    text: "The download seems to have run into some trouble. Want to try again? Sometimes network issues are just temporary.",
  },
  voice_integrity_error: {
    text: "The download seems to have gotten corrupted. I've cleaned up the bad file. Want to try downloading again?",
  },
  voice_partial_error: {
    text: "Some parts of the download didn't complete successfully. I've saved your progress though. Want to retry just the parts that failed?",
  },
  voice_starting_server: {
    text: "Almost there. Starting up the voice server...",
  },
  voice_ready: {
    text: "Voice is ready! You can now talk to me, or type if you prefer.",
  },
  install_go: {
    text: "First thing we need is Go—it's the programming language that Gas Town and Beads are written in.",
    variants: [
      {
        condition: 'darwin_homebrew',
        text: "On Mac, the easiest way is with Homebrew. Run: brew install go. If you don't have Homebrew yet, you can get it at brew.sh, or download Go directly from go.dev. Let me know when Go is installed.",
      },
      {
        condition: 'darwin',
        text: "On Mac, you can install Homebrew first for easy package management, or download Go directly from go.dev. Let me know when Go is installed.",
      },
      {
        condition: 'linux',
        text: "On Linux, you can usually install Go with your package manager. For Ubuntu or Debian: sudo apt install golang-go. Or download it directly from go.dev. Let me know when it's ready.",
      },
      {
        condition: 'win32',
        text: "On Windows, head to go.dev/dl and download the installer. Run it, and make sure to check the box that adds Go to your PATH. Let me know when the installation finishes.",
      },
    ],
  },
  waiting_for_go: {
    text: "Let me check what you already have installed... Nice—you've got Go. That's all we need to install the tools.",
  },
  install_beads: {
    text: "Now let's install Beads—this is the issue tracker your agents will use to coordinate work. It's like Jira, but stored in Git and actually pleasant to use. Run this command in your terminal. This will download and compile Beads. It might take a minute or two the first time.",
  },
  waiting_for_beads: {
    text: "Beads is installed. Nice.",
  },
  install_gastown: {
    text: "One more tool: Gas Town itself. Same process—run this command. This is the orchestrator that coordinates all your coding agents. It'll take a minute to compile.",
  },
  waiting_for_gastown: {
    text: "Gas Town is ready. We're almost there.",
  },
  configure_workspace: {
    text: "Last step: we need to create your Gas Town workspace. This is your headquarters—the directory where all your projects and agents will live. The standard location is ~/gt. Does that work for you, or would you prefer somewhere else?",
  },
  creating_workspace: {
    text: "Creating your workspace...",
  },
  complete: {
    text: "You're all set! You've got a fresh Gas Town workspace. A few things you might want to do next: First, you could add a project. If you have a Git repository you want to work on, I can help you add it as a rig—that's what Gas Town calls a managed project. Or, you can start the Mayor—that's your main coordination agent. It's the one you'll talk to most often. What sounds good?",
  },
}

/** Get platform-specific voice script variant */
function getVoiceScript(
  step: FTUEStep,
  platform?: Platform,
  hasHomebrew?: boolean
): string | null {
  const script = VOICE_SCRIPTS[step]
  if (!script) return null

  // Check for platform-specific variants
  if (script.variants && platform) {
    // Try platform + homebrew combo first
    if (platform === 'darwin' && hasHomebrew) {
      const variant = script.variants.find((v) => v.condition === 'darwin_homebrew')
      if (variant) return variant.text
    }

    // Try platform match
    const platformVariant = script.variants.find((v) => v.condition === platform)
    if (platformVariant) return platformVariant.text
  }

  return script.text
}

/** Music ducking configuration */
const MUSIC_VOLUME_NORMAL = 0.3
const MUSIC_VOLUME_DUCKED = 0.08
const DUCK_FADE_TIME = 0.3 // seconds

/** Audio manager state */
export interface FTUEAudioState {
  /** Whether music is currently playing */
  musicPlaying: boolean
  /** Whether music is ducked for voice */
  musicDucked: boolean
  /** Whether voice is currently playing */
  voicePlaying: boolean
  /** Current step being narrated */
  currentStep: FTUEStep | null
  /** Whether audio is enabled globally */
  audioEnabled: boolean
}

export interface UseFTUEAudioManagerReturn {
  /** Current audio state */
  state: FTUEAudioState
  /** Play voice narration for a specific FTUE step */
  playVoiceClip: (step: FTUEStep, platform?: Platform, hasHomebrew?: boolean) => Promise<void>
  /** Start background music */
  startMusic: () => void
  /** Toggle music on/off */
  toggleMusic: () => void
  /** Stop music */
  stopMusic: () => void
  /** Stop all audio (voice + music) */
  stopAll: () => void
  /** Enable/disable audio globally */
  setAudioEnabled: (enabled: boolean) => void
  /** Get voice script text for display (non-audio fallback) */
  getScriptText: (step: FTUEStep, platform?: Platform, hasHomebrew?: boolean) => string | null
}

/**
 * FTUE Audio Manager Hook
 *
 * Manages voice narration and background music for the FTUE flow.
 * Voice playback automatically ducks music volume for clarity.
 *
 * @example
 * ```tsx
 * const { playVoiceClip, startMusic, toggleMusic, state } = useFTUEAudioManager()
 *
 * // Play step narration
 * await playVoiceClip('welcome')
 *
 * // Start ambient music (auto-ducks during voice)
 * startMusic()
 *
 * // Show music toggle
 * <button onClick={toggleMusic}>
 *   {state.musicPlaying ? '🔊' : '🔇'}
 * </button>
 * ```
 */
export function useFTUEAudioManager(): UseFTUEAudioManagerReturn {
  const [state, setState] = useState<FTUEAudioState>({
    musicPlaying: false,
    musicDucked: false,
    voicePlaying: false,
    currentStep: null,
    audioEnabled: true,
  })

  // Audio nodes
  const musicSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const musicGainRef = useRef<GainNode | null>(null)
  const musicBufferRef = useRef<AudioBuffer | null>(null)
  const voiceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Duck music when voice starts
  const duckMusic = useCallback(() => {
    const gain = musicGainRef.current
    if (!gain) return

    const ctx = gain.context
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(MUSIC_VOLUME_DUCKED, ctx.currentTime + DUCK_FADE_TIME)

    setState((prev) => ({ ...prev, musicDucked: true }))
  }, [])

  // Restore music volume when voice ends
  const unduckMusic = useCallback(() => {
    const gain = musicGainRef.current
    if (!gain) return

    const ctx = gain.context
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(MUSIC_VOLUME_NORMAL, ctx.currentTime + DUCK_FADE_TIME)

    setState((prev) => ({ ...prev, musicDucked: false }))
  }, [])

  // Create ambient/lofi music buffer (procedural)
  const createMusicBuffer = useCallback(async (ctx: AudioContext): Promise<AudioBuffer> => {
    // Create a gentle ambient drone
    // In production, this would load an actual audio file
    const duration = 60 // 60 seconds loop
    const sampleRate = ctx.sampleRate
    const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate)

    // Generate ambient pad sound (simple sine chord with slow modulation)
    const frequencies = [220, 277.18, 329.63, 440] // A3, C#4, E4, A4 (A major)

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate
        let sample = 0

        for (const freq of frequencies) {
          // Slight stereo spread
          const stereoOffset = channel === 0 ? 0.5 : -0.5
          // Slow LFO modulation
          const lfo = 1 + 0.1 * Math.sin(2 * Math.PI * 0.1 * t)
          sample += Math.sin(2 * Math.PI * (freq + stereoOffset) * t * lfo) * 0.15
        }

        // Gentle envelope for seamless loop
        const fadeTime = 2 // seconds
        const fadeIn = Math.min(1, t / fadeTime)
        const fadeOut = Math.min(1, (duration - t) / fadeTime)

        data[i] = sample * fadeIn * fadeOut
      }
    }

    return buffer
  }, [])

  // Start background music
  const startMusic = useCallback(async () => {
    if (!state.audioEnabled) return

    try {
      const ctx = getAudioContext()
      await resumeAudioContext()

      // Create or reuse music buffer
      if (!musicBufferRef.current) {
        musicBufferRef.current = await createMusicBuffer(ctx)
      }

      // Stop existing music
      if (musicSourceRef.current) {
        try {
          musicSourceRef.current.stop()
        } catch {
          // Ignore already stopped
        }
      }

      // Create gain node for ducking
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(MUSIC_VOLUME_NORMAL, ctx.currentTime)
      gain.connect(ctx.destination)
      musicGainRef.current = gain

      // Create source and play
      const source = ctx.createBufferSource()
      source.buffer = musicBufferRef.current
      source.loop = true
      source.connect(gain)
      source.start()
      musicSourceRef.current = source

      setState((prev) => ({ ...prev, musicPlaying: true }))

      // Duck if voice is playing
      if (state.voicePlaying) {
        duckMusic()
      }
    } catch (err) {
      console.warn('Failed to start FTUE music:', err)
    }
  }, [state.audioEnabled, state.voicePlaying, createMusicBuffer, duckMusic])

  // Stop music
  const stopMusic = useCallback(() => {
    if (musicSourceRef.current) {
      try {
        musicSourceRef.current.stop()
      } catch {
        // Ignore already stopped
      }
      musicSourceRef.current = null
    }

    if (musicGainRef.current) {
      musicGainRef.current.disconnect()
      musicGainRef.current = null
    }

    setState((prev) => ({ ...prev, musicPlaying: false, musicDucked: false }))
  }, [])

  // Toggle music
  const toggleMusic = useCallback(() => {
    if (state.musicPlaying) {
      stopMusic()
    } else {
      startMusic()
    }
  }, [state.musicPlaying, startMusic, stopMusic])

  // Play voice clip using Web Speech API (or TTS service in production)
  const playVoiceClip = useCallback(
    async (
      step: FTUEStep,
      platform?: Platform,
      hasHomebrew?: boolean
    ): Promise<void> => {
      if (!state.audioEnabled) return

      const text = getVoiceScript(step, platform, hasHomebrew)
      if (!text) return

      // Cancel any existing speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }

      return new Promise((resolve) => {
        // Use Web Speech API for now
        // In production, this would use LFM2.5-Audio or similar
        if (!window.speechSynthesis) {
          console.warn('Speech synthesis not available')
          resolve()
          return
        }

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.95 // Slightly slower for clarity
        utterance.pitch = 1.0
        utterance.volume = 1.0

        // Try to get a good voice
        const voices = window.speechSynthesis.getVoices()
        const preferredVoice = voices.find(
          (v) =>
            v.name.includes('Samantha') || // macOS
            v.name.includes('Karen') || // macOS
            v.name.includes('Google') || // Chrome
            v.lang.startsWith('en')
        )
        if (preferredVoice) {
          utterance.voice = preferredVoice
        }

        utterance.onstart = () => {
          setState((prev) => ({ ...prev, voicePlaying: true, currentStep: step }))
          duckMusic()
        }

        utterance.onend = () => {
          setState((prev) => ({ ...prev, voicePlaying: false, currentStep: null }))
          unduckMusic()
          resolve()
        }

        utterance.onerror = () => {
          setState((prev) => ({ ...prev, voicePlaying: false, currentStep: null }))
          unduckMusic()
          resolve()
        }

        voiceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      })
    },
    [state.audioEnabled, duckMusic, unduckMusic]
  )

  // Stop all audio
  const stopAll = useCallback(() => {
    // Stop voice
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setState((prev) => ({ ...prev, voicePlaying: false, currentStep: null }))

    // Stop music
    stopMusic()
  }, [stopMusic])

  // Set audio enabled
  const setAudioEnabled = useCallback(
    (enabled: boolean) => {
      setState((prev) => ({ ...prev, audioEnabled: enabled }))
      if (!enabled) {
        stopAll()
      }
    },
    [stopAll]
  )

  // Get script text for non-audio display
  const getScriptText = useCallback(
    (step: FTUEStep, platform?: Platform, hasHomebrew?: boolean): string | null => {
      return getVoiceScript(step, platform, hasHomebrew)
    },
    []
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (musicSourceRef.current) {
        try {
          musicSourceRef.current.stop()
        } catch {
          // Ignore
        }
      }
    }
  }, [])

  return {
    state,
    playVoiceClip,
    startMusic,
    toggleMusic,
    stopMusic,
    stopAll,
    setAudioEnabled,
    getScriptText,
  }
}

export default useFTUEAudioManager
