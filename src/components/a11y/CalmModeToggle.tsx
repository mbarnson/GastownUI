import { Moon, Sparkles, Monitor } from 'lucide-react'
import { useCalmMode } from '../../contexts/CalmModeContext'

interface CalmModeToggleProps {
  /** Show label text */
  showLabel?: boolean
  /** Compact mode - icon only */
  compact?: boolean
  /** Additional class names */
  className?: string
}

export default function CalmModeToggle({
  showLabel = true,
  compact = false,
  className = '',
}: CalmModeToggleProps) {
  const { isCalm, manualCalmMode, toggleCalmMode, systemPrefersReducedMotion } = useCalmMode()

  // Determine current state for display
  const getStateLabel = () => {
    if (manualCalmMode === true) return 'On'
    if (manualCalmMode === false) return 'Off'
    return systemPrefersReducedMotion ? 'System (On)' : 'System (Off)'
  }

  const getStateIcon = () => {
    if (manualCalmMode === true) return <Moon className="w-4 h-4" />
    if (manualCalmMode === false) return <Sparkles className="w-4 h-4" />
    return <Monitor className="w-4 h-4" />
  }

  const getTooltip = () => {
    if (manualCalmMode === true) return 'Calm mode: On (click to turn off)'
    if (manualCalmMode === false) return 'Calm mode: Off (click to follow system)'
    return `Calm mode: Following system (${systemPrefersReducedMotion ? 'reduced motion' : 'normal'}). Click to enable.`
  }

  if (compact) {
    return (
      <button
        onClick={toggleCalmMode}
        title={getTooltip()}
        aria-label={`Calm mode: ${getStateLabel()}`}
        aria-pressed={isCalm}
        className={`
          p-2 rounded-lg transition-colors
          ${isCalm ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-400'}
          hover:bg-slate-600
          ${className}
        `}
      >
        {getStateIcon()}
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <span className="text-sm text-slate-400">Calm Mode</span>
      )}
      <button
        onClick={toggleCalmMode}
        title={getTooltip()}
        aria-label={`Calm mode: ${getStateLabel()}`}
        aria-pressed={isCalm}
        role="switch"
        className={`
          relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          transition-colors text-sm font-medium
          ${isCalm
            ? 'bg-slate-700 text-slate-200 border border-slate-600'
            : 'bg-slate-800 text-slate-400 border border-slate-700'
          }
          hover:bg-slate-600
        `}
      >
        {getStateIcon()}
        <span>{getStateLabel()}</span>
      </button>
    </div>
  )
}

/**
 * Inline calm mode indicator for status bars
 */
export function CalmModeIndicator() {
  const { isCalm } = useCalmMode()

  if (!isCalm) return null

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-300"
      title="Calm mode active - animations reduced"
    >
      <Moon className="w-3 h-3" />
      <span>Calm</span>
    </span>
  )
}
