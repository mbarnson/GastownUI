import { useEffect, useRef, useCallback, useState } from 'react'
import {
  playEarcon,
  resumeAudioContext,
  getAudioSettings,
  saveAudioSettings,
  type EarconType,
  type AudioSettings,
} from '../services/audio'

/**
 * Hook to play audio cues with automatic initialization
 *
 * Handles Web Audio API autoplay policies by initializing
 * on first user interaction.
 *
 * @example
 * ```tsx
 * function ConvoyCard({ convoy }) {
 *   const { play } = useAudioCues()
 *
 *   useEffect(() => {
 *     if (convoy.status === 'complete') {
 *       play('convoy_complete')
 *     }
 *   }, [convoy.status, play])
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useAudioCues() {
  const [initialized, setInitialized] = useState(false)
  const pendingRef = useRef<EarconType[]>([])

  // Initialize audio context on first user interaction
  useEffect(() => {
    if (initialized) return

    const handleInteraction = async () => {
      try {
        await resumeAudioContext()
        setInitialized(true)

        // Play any pending earcons
        pendingRef.current.forEach((type) => playEarcon(type))
        pendingRef.current = []
      } catch {
        // Ignore errors, audio may not be supported
      }

      // Remove listeners after initialization
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
    }

    document.addEventListener('click', handleInteraction)
    document.addEventListener('keydown', handleInteraction)

    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
    }
  }, [initialized])

  const play = useCallback(
    (type: EarconType) => {
      if (initialized) {
        playEarcon(type)
      } else {
        // Queue for later
        pendingRef.current.push(type)
      }
    },
    [initialized]
  )

  return { play, initialized }
}

/**
 * Hook that watches a value and plays an earcon when it changes
 *
 * @example
 * ```tsx
 * function TaskCounter({ completedCount }) {
 *   // Play success sound when count increases
 *   useAudioOnChange(completedCount, 'success', (prev, curr) => curr > prev)
 *   return <span>{completedCount}</span>
 * }
 * ```
 */
export function useAudioOnChange<T>(
  value: T,
  earcon: EarconType,
  shouldPlay: (prev: T | undefined, current: T) => boolean = () => true
) {
  const { play } = useAudioCues()
  const prevRef = useRef<T>()

  useEffect(() => {
    if (prevRef.current !== undefined && shouldPlay(prevRef.current, value)) {
      play(earcon)
    }
    prevRef.current = value
  }, [value, earcon, play, shouldPlay])
}

/**
 * Hook for convoy status change audio cues
 *
 * @example
 * ```tsx
 * function ConvoyList() {
 *   const { data: convoys } = useConvoys()
 *   useConvoyAudioCues(convoys)
 *   return <div>...</div>
 * }
 * ```
 */
export function useConvoyAudioCues(
  convoys: Array<{ id: string; status: string }> | undefined
) {
  const { play } = useAudioCues()
  const prevStatusRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (!convoys) return

    convoys.forEach((convoy) => {
      const prevStatus = prevStatusRef.current.get(convoy.id)

      if (prevStatus !== convoy.status) {
        // Status changed
        if (convoy.status === 'running' && !prevStatus) {
          play('convoy_start')
        } else if (convoy.status === 'complete') {
          play('convoy_complete')
        } else if (convoy.status === 'failed') {
          play('error')
        }
      }

      prevStatusRef.current.set(convoy.id, convoy.status)
    })
  }, [convoys, play])
}

/**
 * Hook for bead/task completion audio cues
 *
 * @example
 * ```tsx
 * function BeadList() {
 *   const { data: beads } = useBeads()
 *   useBeadAudioCues(beads)
 *   return <div>...</div>
 * }
 * ```
 */
export function useBeadAudioCues(
  beads: Array<{ id: string; status: string }> | undefined
) {
  const { play } = useAudioCues()
  const prevStatusRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (!beads) return

    beads.forEach((bead) => {
      const prevStatus = prevStatusRef.current.get(bead.id)

      if (prevStatus && prevStatus !== bead.status) {
        // Status changed
        if (bead.status === 'closed') {
          play('success')
        } else if (bead.status === 'blocked') {
          play('warning')
        } else if (bead.status === 'in_progress' && prevStatus === 'open') {
          play('notification')
        }
      }

      prevStatusRef.current.set(bead.id, bead.status)
    })
  }, [beads, play])
}

/**
 * Hook for agent status audio cues
 *
 * @example
 * ```tsx
 * function AgentList() {
 *   const { data: polecats } = usePolecats()
 *   useAgentAudioCues(polecats)
 *   return <div>...</div>
 * }
 * ```
 */
export function useAgentAudioCues(
  agents: Array<{ name: string; status: 'active' | 'idle' | 'stuck' }> | undefined
) {
  const { play } = useAudioCues()
  const prevStatusRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (!agents) return

    agents.forEach((agent) => {
      const prevStatus = prevStatusRef.current.get(agent.name)

      if (prevStatus && prevStatus !== agent.status) {
        if (agent.status === 'active') {
          play('agent_active')
        } else if (agent.status === 'idle') {
          play('agent_idle')
        } else if (agent.status === 'stuck') {
          play('error')
        }
      }

      prevStatusRef.current.set(agent.name, agent.status)
    })
  }, [agents, play])
}

/**
 * Hook to manage audio settings
 *
 * @example
 * ```tsx
 * function AudioSettingsPanel() {
 *   const { settings, updateSettings, toggleEnabled } = useAudioSettings()
 *
 *   return (
 *     <label>
 *       <input
 *         type="checkbox"
 *         checked={settings.enabled}
 *         onChange={toggleEnabled}
 *       />
 *       Enable sounds
 *     </label>
 *   )
 * }
 * ```
 */
export function useAudioSettings() {
  const [settings, setSettings] = useState<AudioSettings>(getAudioSettings)

  // Sync with localStorage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gastownui-audio-settings') {
        setSettings(getAudioSettings())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const updateSettings = useCallback((updates: Partial<AudioSettings>) => {
    saveAudioSettings(updates)
    setSettings((prev) => ({ ...prev, ...updates }))
  }, [])

  const toggleEnabled = useCallback(() => {
    updateSettings({ enabled: !settings.enabled })
  }, [settings.enabled, updateSettings])

  const toggleEarcons = useCallback(() => {
    updateSettings({ earcons: !settings.earcons })
  }, [settings.earcons, updateSettings])

  const setVolume = useCallback(
    (volume: number) => {
      updateSettings({ volume: Math.max(0, Math.min(1, volume)) })
    },
    [updateSettings]
  )

  const setSoundScheme = useCallback(
    (scheme: AudioSettings['soundScheme']) => {
      updateSettings({ soundScheme: scheme })
    },
    [updateSettings]
  )

  return {
    settings,
    updateSettings,
    toggleEnabled,
    toggleEarcons,
    setVolume,
    setSoundScheme,
  }
}

/**
 * Hook for click/UI feedback sounds
 *
 * @example
 * ```tsx
 * function Button({ onClick }) {
 *   const { playClick } = useClickSound()
 *
 *   return (
 *     <button onClick={(e) => {
 *       playClick()
 *       onClick(e)
 *     }}>
 *       Click me
 *     </button>
 *   )
 * }
 * ```
 */
export function useClickSound() {
  const { play } = useAudioCues()

  const playClick = useCallback(() => {
    play('click')
  }, [play])

  return { playClick }
}
