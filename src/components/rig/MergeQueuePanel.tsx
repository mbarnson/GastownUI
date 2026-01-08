import { useState } from 'react'
import {
  GitMerge,
  GripVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'

export interface MergeRequest {
  id: string
  branch: string
  title: string
  author: string
  status: 'queued' | 'building' | 'testing' | 'merging' | 'merged' | 'failed'
  priority: number
  issueId?: string
  createdAt: string
  checks?: {
    build: 'pending' | 'running' | 'passed' | 'failed'
    tests: 'pending' | 'running' | 'passed' | 'failed'
    lint: 'pending' | 'running' | 'passed' | 'failed'
  }
}

interface MergeQueuePanelProps {
  mergeRequests: MergeRequest[]
  onReorder?: (requests: MergeRequest[]) => void
  onCancel?: (id: string) => void
  onRetry?: (id: string) => void
}

export default function MergeQueuePanel({
  mergeRequests,
  onReorder,
  onCancel,
  onRetry,
}: MergeQueuePanelProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    const draggedIndex = mergeRequests.findIndex((mr) => mr.id === draggedId)
    const targetIndex = mergeRequests.findIndex((mr) => mr.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newRequests = [...mergeRequests]
    const [removed] = newRequests.splice(draggedIndex, 1)
    newRequests.splice(targetIndex, 0, removed)

    onReorder?.(newRequests)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
  }

  const getStatusIcon = (status: MergeRequest['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-slate-400" />
      case 'building':
      case 'testing':
      case 'merging':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
      case 'merged':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />
    }
  }

  const getStatusText = (status: MergeRequest['status']) => {
    switch (status) {
      case 'queued':
        return 'Queued'
      case 'building':
        return 'Building...'
      case 'testing':
        return 'Testing...'
      case 'merging':
        return 'Merging...'
      case 'merged':
        return 'Merged'
      case 'failed':
        return 'Failed'
    }
  }

  const getCheckIcon = (check: 'pending' | 'running' | 'passed' | 'failed') => {
    switch (check) {
      case 'pending':
        return <Clock className="w-3 h-3 text-slate-500" />
      case 'running':
        return <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
      case 'passed':
        return <CheckCircle2 className="w-3 h-3 text-green-400" />
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-400" />
    }
  }

  const activeRequests = mergeRequests.filter((mr) => mr.status !== 'merged')
  const recentMerged = mergeRequests.filter((mr) => mr.status === 'merged').slice(0, 3)

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <GitMerge className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">Merge Queue</h3>
          {activeRequests.length > 0 && (
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
              {activeRequests.length}
            </span>
          )}
        </div>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto">
        {activeRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
            <GitMerge className="w-12 h-12 mb-2 opacity-50" />
            <p>Queue is empty</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {activeRequests.map((mr, index) => (
              <div
                key={mr.id}
                draggable={mr.status === 'queued'}
                onDragStart={(e) => handleDragStart(e, mr.id)}
                onDragOver={(e) => handleDragOver(e, mr.id)}
                onDragEnd={handleDragEnd}
                className={`
                  p-3 transition-colors
                  ${draggedId === mr.id ? 'opacity-50 bg-slate-800' : ''}
                  ${mr.status === 'queued' ? 'cursor-grab active:cursor-grabbing' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Drag handle */}
                  {mr.status === 'queued' && (
                    <div className="text-slate-500 mt-1">
                      <GripVertical className="w-4 h-4" />
                    </div>
                  )}

                  {/* Position indicator */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400 font-mono">
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(mr.status)}
                      <span className="text-white font-medium truncate">
                        {mr.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="font-mono truncate">{mr.branch}</span>
                      <span>by {mr.author}</span>
                      {mr.issueId && (
                        <span className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">
                          {mr.issueId}
                        </span>
                      )}
                    </div>

                    {/* Expanded checks */}
                    {expandedId === mr.id && mr.checks && (
                      <div className="mt-3 space-y-1.5 pl-1">
                        <div className="flex items-center gap-2 text-xs">
                          {getCheckIcon(mr.checks.build)}
                          <span className="text-slate-400">Build</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {getCheckIcon(mr.checks.tests)}
                          <span className="text-slate-400">Tests</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {getCheckIcon(mr.checks.lint)}
                          <span className="text-slate-400">Lint</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === mr.id ? null : mr.id)
                      }
                      className="p-1 text-slate-500 hover:text-white"
                    >
                      {expandedId === mr.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {mr.status === 'failed' && onRetry && (
                      <button
                        onClick={() => onRetry(mr.id)}
                        className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded"
                      >
                        Retry
                      </button>
                    )}

                    {mr.status === 'queued' && onCancel && (
                      <button
                        onClick={() => onCancel(mr.id)}
                        className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-white rounded"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent merged */}
      {recentMerged.length > 0 && (
        <div className="border-t border-slate-700 px-4 py-2">
          <div className="text-xs text-slate-500 mb-2">Recently merged</div>
          <div className="space-y-1">
            {recentMerged.map((mr) => (
              <div
                key={mr.id}
                className="flex items-center gap-2 text-xs text-slate-400"
              >
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                <span className="truncate">{mr.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Mock data for development
export const mockMergeRequests: MergeRequest[] = [
  {
    id: 'ga-s3p',
    branch: 'polecat/slit-mk4ny3d5',
    title: 'Mobile Companion view',
    author: 'slit',
    status: 'testing',
    priority: 2,
    issueId: 'ga-3i7',
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    checks: {
      build: 'passed',
      tests: 'running',
      lint: 'passed',
    },
  },
  {
    id: 'ga-1ei',
    branch: 'polecat/slit-mk4ny3d5',
    title: 'VisionOS Spatial Experience',
    author: 'slit',
    status: 'queued',
    priority: 3,
    issueId: 'ga-2t6',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    checks: {
      build: 'pending',
      tests: 'pending',
      lint: 'pending',
    },
  },
  {
    id: 'ga-7bi',
    branch: 'polecat/slit-mk4ny3d5',
    title: 'Browser tmux investigation',
    author: 'slit',
    status: 'merged',
    priority: 2,
    issueId: 'ga-e3e',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: 'ga-azw',
    branch: 'polecat/slit-mk4ny3d5',
    title: 'Design Mode - Visual Formula Editor',
    author: 'slit',
    status: 'merged',
    priority: 2,
    issueId: 'ga-drc',
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
  },
]
