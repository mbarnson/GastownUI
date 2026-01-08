import { Glasses, Eye } from 'lucide-react'
import { useSimplifyMode } from '../../contexts/SimplifyModeContext'

interface SimplifyModeToggleProps {
  /** Show label text */
  showLabel?: boolean
  /** Compact mode - icon only */
  compact?: boolean
  /** Additional class names */
  className?: string
}

export default function SimplifyModeToggle({
  showLabel = true,
  compact = false,
  className = '',
}: SimplifyModeToggleProps) {
  const { isSimplified, toggleSimplifyMode } = useSimplifyMode()

  const getTooltip = () => {
    return isSimplified
      ? 'Simplify mode: On (showing less detail)'
      : 'Simplify mode: Off (showing full detail)'
  }

  if (compact) {
    return (
      <button
        onClick={toggleSimplifyMode}
        title={getTooltip()}
        aria-label={`Simplify mode: ${isSimplified ? 'On' : 'Off'}`}
        aria-pressed={isSimplified}
        className={`
          p-2 rounded-lg transition-colors
          ${isSimplified ? 'bg-blue-700 text-blue-200' : 'bg-slate-800 text-slate-400'}
          hover:bg-slate-600
          ${className}
        `}
      >
        {isSimplified ? <Glasses className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <span className="text-sm text-slate-400">Simplify</span>
      )}
      <button
        onClick={toggleSimplifyMode}
        title={getTooltip()}
        aria-label={`Simplify mode: ${isSimplified ? 'On' : 'Off'}`}
        aria-pressed={isSimplified}
        role="switch"
        className={`
          relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          transition-colors text-sm font-medium
          ${isSimplified
            ? 'bg-blue-700 text-blue-100 border border-blue-600'
            : 'bg-slate-800 text-slate-400 border border-slate-700'
          }
          hover:bg-slate-600
        `}
      >
        {isSimplified ? (
          <Glasses className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
        <span>{isSimplified ? 'On' : 'Off'}</span>
      </button>
    </div>
  )
}

/**
 * Inline simplify mode indicator for status bars
 */
export function SimplifyModeIndicator() {
  const { isSimplified } = useSimplifyMode()

  if (!isSimplified) return null

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-700 text-blue-200"
      title="Simplify mode active - showing less detail"
    >
      <Glasses className="w-3 h-3" />
      <span>Simple</span>
    </span>
  )
}
