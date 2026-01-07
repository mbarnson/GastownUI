import { useState } from 'react'
import { GitMerge, GripVertical, AlertTriangle, Check, Clock, Loader2 } from 'lucide-react'
import type { MergeQueueItem } from '../../hooks/useGastown'

interface MergeQueuePanelProps {
  items: MergeQueueItem[]
  rigId: string
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    label: 'Pending',
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    label: 'Processing',
  },
  conflict: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    label: 'Conflict',
  },
  merged: {
    icon: Check,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    label: 'Merged',
  },
}

export default function MergeQueuePanel({ items, rigId: _rigId }: MergeQueuePanelProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [orderedItems, setOrderedItems] = useState(items)

  // Update ordered items when props change
  if (items.length !== orderedItems.length ||
      items.some((item, idx) => item.id !== orderedItems[idx]?.id)) {
    setOrderedItems(items)
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    const newItems = [...orderedItems]
    const draggedIdx = newItems.findIndex((i) => i.id === draggedItem)
    const targetIdx = newItems.findIndex((i) => i.id === targetId)

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const [removed] = newItems.splice(draggedIdx, 1)
      newItems.splice(targetIdx, 0, removed)
      // Update positions
      newItems.forEach((item, idx) => {
        item.position = idx + 1
      })
      setOrderedItems(newItems)
      // TODO: Call mutation to persist order change
    }
    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <GitMerge className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-semibold text-white">Merge Queue</h2>
        <span className="ml-auto text-sm text-gray-400">
          {orderedItems.length} item{orderedItems.length !== 1 ? 's' : ''}
        </span>
      </div>

      {orderedItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <GitMerge className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No items in merge queue</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {orderedItems.map((item) => {
            const config = statusConfig[item.status]
            const StatusIcon = config.icon

            return (
              <li
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${draggedItem === item.id
                    ? 'opacity-50 border-purple-500 bg-purple-500/10'
                    : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }
                  cursor-grab active:cursor-grabbing
                `}
              >
                <GripVertical className="w-4 h-4 text-gray-500 flex-shrink-0" />

                <span className="text-gray-500 font-mono text-sm w-6">
                  #{item.position}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-cyan-400 truncate">
                    {item.branch}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {item.polecat}
                  </div>
                </div>

                <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${config.bg}`}>
                  <StatusIcon className={`w-3.5 h-3.5 ${config.color} ${item.status === 'processing' ? 'animate-spin' : ''}`} />
                  <span className={`text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
