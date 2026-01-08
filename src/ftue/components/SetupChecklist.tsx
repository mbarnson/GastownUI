import { Check, Circle, Loader2, AlertCircle } from 'lucide-react'
import type { ChecklistItem as ChecklistItemType } from '../types'

interface SetupChecklistProps {
  items: ChecklistItemType[]
  currentItemId?: string
}

/** Setup checklist showing Go, Beads, Gas Town, Workspace progress */
export function SetupChecklist({ items, currentItemId }: SetupChecklistProps) {
  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-6 w-full max-w-md">
      <h2 className="text-lg font-semibold text-slate-200 mb-4">Setup Checklist</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            isActive={item.id === currentItemId}
          />
        ))}
      </div>
    </div>
  )
}

interface ChecklistItemProps {
  item: ChecklistItemType
  isActive: boolean
}

/** Single checklist item */
function ChecklistItem({ item, isActive }: ChecklistItemProps) {
  const getIcon = () => {
    switch (item.status) {
      case 'complete':
        return <Check className="w-5 h-5 text-green-400" />
      case 'checking':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-amber-400" />
      default:
        return <Circle className="w-5 h-5 text-slate-500" />
    }
  }

  const getTextColor = () => {
    if (item.status === 'complete') return 'text-green-300'
    if (item.status === 'error') return 'text-amber-300'
    if (isActive) return 'text-blue-300'
    return 'text-slate-400'
  }

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg transition-all
        ${isActive ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-slate-900/50'}
      `}
    >
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${getTextColor()}`}>
          {item.label}
        </div>
        {item.version && (
          <div className="text-xs text-slate-500 mt-0.5">
            v{item.version}
          </div>
        )}
      </div>
      {item.status === 'complete' && (
        <div className="text-xs text-green-500 font-medium">Done</div>
      )}
      {item.status === 'error' && (
        <div className="text-xs text-amber-500 font-medium">Update needed</div>
      )}
    </div>
  )
}
