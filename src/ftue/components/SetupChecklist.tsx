import { Check, Circle, Loader2, AlertCircle } from 'lucide-react'
import type { ChecklistItem as ChecklistItemType } from '../types'

interface SetupChecklistProps {
  items: ChecklistItemType[]
  currentItemId?: string
  /** Accessible label for the checklist */
  ariaLabel?: string
}

/**
 * Setup checklist showing Go, Beads, Gas Town, Workspace progress
 *
 * Accessibility features:
 * - Proper heading structure
 * - ARIA list role for screen readers
 * - Status announcements via aria-live
 * - Current item indication via aria-current
 */
export function SetupChecklist({
  items,
  currentItemId,
  ariaLabel = 'Setup progress checklist',
}: SetupChecklistProps) {
  const completedCount = items.filter((i) => i.status === 'complete').length

  return (
    <section
      className="bg-slate-800/80 rounded-xl border border-slate-700 p-6 w-full max-w-md"
      aria-label={ariaLabel}
    >
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200">Setup Checklist</h2>
        <span
          className="text-sm text-slate-500"
          aria-live="polite"
          aria-atomic="true"
        >
          {completedCount} of {items.length} complete
        </span>
      </header>
      <ul className="space-y-3" role="list" aria-label="Setup steps">
        {items.map((item, index) => (
          <ChecklistItem
            key={item.id}
            item={item}
            isActive={item.id === currentItemId}
            stepNumber={index + 1}
          />
        ))}
      </ul>
    </section>
  )
}

interface ChecklistItemProps {
  item: ChecklistItemType
  isActive: boolean
  stepNumber: number
}

/**
 * Single checklist item
 *
 * Accessibility: Uses li with proper aria-current and status info
 */
function ChecklistItem({ item, isActive, stepNumber }: ChecklistItemProps) {
  const getIcon = () => {
    switch (item.status) {
      case 'complete':
        return <Check className="w-5 h-5 text-green-400" aria-hidden="true" />
      case 'checking':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" aria-hidden="true" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-amber-400" aria-hidden="true" />
      default:
        return <Circle className="w-5 h-5 text-slate-500" aria-hidden="true" />
    }
  }

  const getTextColor = () => {
    if (item.status === 'complete') return 'text-green-300'
    if (item.status === 'error') return 'text-amber-300'
    if (isActive) return 'text-blue-300'
    return 'text-slate-400'
  }

  const getStatusText = () => {
    switch (item.status) {
      case 'complete':
        return 'completed'
      case 'checking':
        return 'in progress'
      case 'error':
        return 'needs attention'
      default:
        return 'pending'
    }
  }

  return (
    <li
      className={`
        flex items-center gap-3 p-3 rounded-lg transition-all
        ${isActive ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-slate-900/50'}
      `}
      aria-current={isActive ? 'step' : undefined}
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${getTextColor()}`}>
          <span className="sr-only">Step {stepNumber}: </span>
          {item.label}
          <span className="sr-only"> - {getStatusText()}</span>
        </div>
        {item.version && (
          <div className="text-xs text-slate-500 mt-0.5">
            v{item.version}
          </div>
        )}
      </div>
      {item.status === 'complete' && (
        <div className="text-xs text-green-500 font-medium" aria-hidden="true">
          Done
        </div>
      )}
      {item.status === 'error' && (
        <div className="text-xs text-amber-500 font-medium" aria-hidden="true">
          Update needed
        </div>
      )}
    </li>
  )
}
