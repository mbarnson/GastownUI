import { useState } from 'react'
import {
  Terminal,
  Copy,
  ExternalLink,
  Circle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import {
  useTmuxSessions,
  useTmuxSessionDetail,
  useTmuxPaneContent,
  useAttachTmuxSession,
  useCopyConnectionString,
} from '../hooks/useTmux'
import { TerminalPreview } from './TerminalPreview'
import type { SessionHealth, TmuxSession } from '../types/tmux'

const healthColors: Record<SessionHealth, { dot: string; text: string; label: string }> = {
  active: { dot: 'text-green-400', text: 'text-green-400', label: 'Active' },
  processing: { dot: 'text-yellow-400', text: 'text-yellow-400', label: 'Processing' },
  idle: { dot: 'text-slate-400', text: 'text-slate-400', label: 'Idle' },
  stuck: { dot: 'text-red-400', text: 'text-red-400', label: 'Stuck' },
}

interface SessionCardProps {
  session: TmuxSession
  isExpanded: boolean
  onToggle: () => void
}

function SessionCard({ session, isExpanded, onToggle }: SessionCardProps) {
  const { data: details, isLoading } = useTmuxSessionDetail(
    isExpanded ? session.name : null
  )
  const { data: paneContent } = useTmuxPaneContent(
    isExpanded && details?.panes[0]?.pane_id
      ? details.panes[0].pane_id
      : null
  )
  const attachMutation = useAttachTmuxSession()
  const copyMutation = useCopyConnectionString()

  const health = details?.health ?? 'idle'
  const colors = healthColors[health]
  const connectionString = details?.connection_string ?? `tmux attach -t ${session.name}`

  const handleAttach = () => {
    attachMutation.mutate(session.name)
  }

  const handleCopy = () => {
    copyMutation.mutate(connectionString)
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all">
      {/* Session Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          <Terminal className="w-5 h-5 text-cyan-400" />
          <span className="font-medium text-white">{session.name}</span>
          {session.attached && (
            <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
              attached
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Circle className={`w-3 h-3 fill-current ${colors.dot}`} />
          <span className={`text-sm ${colors.text}`}>{colors.label}</span>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-700">
          {/* Terminal Preview */}
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : paneContent ? (
              <TerminalPreview
                content={paneContent}
                className="h-48 border border-slate-600"
              />
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-500 bg-slate-900/50 rounded-lg">
                No pane content available
              </div>
            )}
          </div>

          {/* Pane Info */}
          {details?.panes && details.panes.length > 0 && (
            <div className="px-4 pb-3">
              <div className="text-xs text-slate-400 mb-2">
                {details.panes.length} pane{details.panes.length !== 1 ? 's' : ''} •{' '}
                Running: {details.panes[0].pane_current_command}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={handleAttach}
              disabled={attachMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {attachMutation.isPending ? 'Opening...' : 'Attach'}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copyMutation.isSuccess ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Connection String */}
          <div className="px-4 pb-4">
            <code className="block w-full px-3 py-2 bg-slate-900 rounded text-xs text-slate-400 font-mono overflow-x-auto">
              {connectionString}
            </code>
          </div>
        </div>
      )}
    </div>
  )
}

export function TmuxPanel() {
  const { data: sessions, isLoading, error, refetch } = useTmuxSessions()
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  const toggleSession = (name: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400">
          <p className="font-medium">Failed to load tmux sessions</p>
          <p className="text-sm mt-1 text-red-400/80">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-white">TMUX SESSIONS</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <kbd className="px-2 py-1 bg-slate-700 rounded text-xs">Cmd+T</kbd>
          <span>to jump</span>
        </div>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-3" />
          Loading sessions...
        </div>
      ) : sessions?.length === 0 ? (
        <div className="text-center py-12">
          <Terminal className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No tmux sessions running</p>
          <p className="text-sm text-slate-500">
            Start a tmux session to see it here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions?.map((session) => (
            <SessionCard
              key={session.name}
              session={session}
              isExpanded={expandedSessions.has(session.name)}
              onToggle={() => toggleSession(session.name)}
            />
          ))}
        </div>
      )}

      {/* Footer Stats */}
      {sessions && sessions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between text-sm text-slate-400">
          <span>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} •{' '}
            {sessions.filter((s) => s.attached).length} attached
          </span>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      )}
    </div>
  )
}
