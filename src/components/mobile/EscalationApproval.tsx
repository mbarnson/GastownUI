import { useState } from 'react'
import {
  AlertTriangle,
  Check,
  X,
  Clock,
  User,
  GitMerge,
  DollarSign,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react'

export interface Escalation {
  id: string
  type: 'merge_approval' | 'cost_override' | 'permission_request' | 'conflict_resolution'
  title: string
  description: string
  requestedBy: string
  requestedAt: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  context?: {
    beadId?: string
    convoyId?: string
    amount?: number
    branch?: string
  }
}

interface EscalationApprovalProps {
  escalations: Escalation[]
  onApprove: (id: string, comment?: string) => void
  onReject: (id: string, reason: string) => void
}

export default function EscalationApproval({
  escalations,
  onApprove,
  onReject,
}: EscalationApprovalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const getTypeIcon = (type: Escalation['type']) => {
    switch (type) {
      case 'merge_approval':
        return <GitMerge className="w-5 h-5 text-purple-400" />
      case 'cost_override':
        return <DollarSign className="w-5 h-5 text-green-400" />
      case 'permission_request':
        return <User className="w-5 h-5 text-blue-400" />
      case 'conflict_resolution':
        return <AlertTriangle className="w-5 h-5 text-orange-400" />
    }
  }

  const getUrgencyStyles = (urgency: Escalation['urgency']) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'low':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/50'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  const handleApprove = (id: string) => {
    onApprove(id)
    setExpandedId(null)
  }

  const handleReject = (id: string) => {
    if (rejectReason.trim()) {
      onReject(id, rejectReason)
      setRejectingId(null)
      setRejectReason('')
      setExpandedId(null)
    }
  }

  const pendingCount = escalations.length
  const criticalCount = escalations.filter((e) => e.urgency === 'critical').length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          <h2 className="text-white font-semibold">Escalations</h2>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
        {criticalCount > 0 && (
          <span className="text-red-400 text-sm font-medium">
            {criticalCount} critical
          </span>
        )}
      </div>

      {/* Escalation list */}
      <div className="flex-1 overflow-y-auto">
        {escalations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Check className="w-12 h-12 mb-2 opacity-50" />
            <p>No pending escalations</p>
            <p className="text-sm">You&apos;re all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {escalations.map((escalation) => (
              <div
                key={escalation.id}
                className={`${
                  escalation.urgency === 'critical'
                    ? 'bg-red-900/10 border-l-2 border-red-500'
                    : 'bg-slate-900/50'
                }`}
              >
                {/* Main card */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === escalation.id ? null : escalation.id)
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getTypeIcon(escalation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded border ${getUrgencyStyles(escalation.urgency)}`}
                        >
                          {escalation.urgency}
                        </span>
                      </div>
                      <p className="text-white font-medium">{escalation.title}</p>
                      <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                        {escalation.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-slate-500 text-xs">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {escalation.requestedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(escalation.requestedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-slate-500">
                      {expandedId === escalation.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === escalation.id && (
                  <div className="px-4 pb-4 border-t border-slate-700/50">
                    {/* Context info */}
                    {escalation.context && (
                      <div className="flex flex-wrap gap-2 py-3">
                        {escalation.context.beadId && (
                          <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded font-mono">
                            {escalation.context.beadId}
                          </span>
                        )}
                        {escalation.context.convoyId && (
                          <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded font-mono">
                            {escalation.context.convoyId}
                          </span>
                        )}
                        {escalation.context.branch && (
                          <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded font-mono">
                            {escalation.context.branch}
                          </span>
                        )}
                        {escalation.context.amount !== undefined && (
                          <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">
                            ${escalation.context.amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Reject reason input */}
                    {rejectingId === escalation.id ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <MessageSquare className="w-4 h-4" />
                          <span>Rejection reason (required)</span>
                        </div>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Explain why you're rejecting this..."
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(escalation.id)}
                            disabled={!rejectReason.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-red-400 text-white rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Confirm Reject
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(null)
                              setRejectReason('')
                            }}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Action buttons */
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleApprove(escalation.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectingId(escalation.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Mock escalations for development
export const mockEscalations: Escalation[] = [
  {
    id: '1',
    type: 'merge_approval',
    title: 'Voice Integration Merge',
    description:
      'Polecat furiosa is requesting approval to merge the voice integration feature branch into main.',
    requestedBy: 'furiosa',
    requestedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    urgency: 'high',
    context: {
      beadId: 'ga-mmy',
      branch: 'feature/voice-integration',
    },
  },
  {
    id: '2',
    type: 'cost_override',
    title: 'Cost Threshold Override',
    description:
      'Request to increase daily spending limit from $50 to $100 for intensive testing phase.',
    requestedBy: 'witness',
    requestedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    urgency: 'medium',
    context: {
      amount: 100,
      convoyId: 'convoy-001',
    },
  },
  {
    id: '3',
    type: 'conflict_resolution',
    title: 'Merge Conflict in TmuxPanel',
    description:
      'Multiple branches have conflicting changes to TmuxPanel.tsx. Manual resolution required.',
    requestedBy: 'refinery',
    requestedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    urgency: 'critical',
    context: {
      beadId: 'ga-01g',
      branch: 'main',
    },
  },
]
