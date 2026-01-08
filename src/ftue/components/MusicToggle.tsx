import { useState, useEffect, useCallback } from 'react'
import { Volume2, VolumeX, Music } from 'lucide-react'
import {
  startFTUEMusic,
  toggleFTUEMusicMute,
  getFTUEMusicState,
  checkMusicAssetsAvailable,
} from '../music'

interface MusicToggleProps {
  /** Whether music should be enabled */
  enabled?: boolean
  /** Callback when music availability changes */
  onAvailabilityChange?: (available: boolean) => void
  /** Optional class name */
  className?: string
}

/**
 * Music toggle button for FTUE scenes
 *
 * Automatically starts background music when mounted.
 * Shows mute/unmute toggle and loading state.
 *
 * @example
 * ```tsx
 * <MusicToggle enabled className="absolute top-4 right-4" />
 * ```
 */
export function MusicToggle({
  enabled = true,
  onAvailabilityChange,
  className = '',
}: MusicToggleProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(false)
  const [cleanupFn, setCleanupFn] = useState<(() => void) | null>(null)

  // Check availability and start music on mount
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function initMusic() {
      try {
        // Check if music assets are bundled
        const available = await checkMusicAssetsAvailable()

        if (cancelled) return

        setIsAvailable(available)
        onAvailabilityChange?.(available)

        if (available) {
          const cleanup = await startFTUEMusic()
          if (cancelled) {
            cleanup()
            return
          }
          setCleanupFn(() => cleanup)
          setIsMuted(false)
        }
      } catch {
        if (!cancelled) {
          setIsAvailable(false)
          onAvailabilityChange?.(false)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    initMusic()

    return () => {
      cancelled = true
      if (cleanupFn) {
        cleanupFn()
      }
    }
  }, [enabled, onAvailabilityChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupFn) {
        cleanupFn()
      }
    }
  }, [cleanupFn])

  const handleToggle = useCallback(() => {
    const newMuteState = toggleFTUEMusicMute()
    setIsMuted(newMuteState)
  }, [])

  // Don't render if disabled or music unavailable
  if (!enabled || (!isLoading && !isAvailable)) {
    return null
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-3 py-2
        bg-slate-800/50 hover:bg-slate-700/50
        border border-slate-700 rounded-lg
        text-sm text-slate-400 hover:text-slate-200
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-blue-500/50
        ${className}
      `}
      title={isMuted ? 'Unmute music' : 'Mute music'}
      aria-label={isMuted ? 'Unmute background music' : 'Mute background music'}
    >
      {isLoading ? (
        <>
          <Music className="w-4 h-4 animate-pulse" />
          <span className="sr-only">Loading music...</span>
        </>
      ) : isMuted ? (
        <>
          <VolumeX className="w-4 h-4" />
          <span className="hidden sm:inline">Unmute</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4" />
          <span className="hidden sm:inline">Music</span>
        </>
      )}
    </button>
  )
}

/**
 * Compact music indicator without text label
 */
export function MusicIndicator({
  enabled = true,
  className = '',
}: {
  enabled?: boolean
  className?: string
}) {
  const [state, setState] = useState(getFTUEMusicState())

  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      setState(getFTUEMusicState())
    }, 500)

    return () => clearInterval(interval)
  }, [enabled])

  if (!enabled || !state.isPlaying) {
    return null
  }

  return (
    <div
      className={`flex items-center gap-1 text-xs text-slate-500 ${className}`}
      aria-live="polite"
    >
      <Music className="w-3 h-3" />
      <span className="sr-only">
        Background music {state.isMuted ? 'muted' : 'playing'}
      </span>
      {/* Animated dots to show music is playing */}
      {!state.isMuted && (
        <div className="flex gap-0.5">
          <div className="w-0.5 h-2 bg-slate-500 animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-0.5 h-3 bg-slate-500 animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-0.5 h-2 bg-slate-500 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      )}
    </div>
  )
}
