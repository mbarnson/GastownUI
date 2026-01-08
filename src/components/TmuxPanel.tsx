import { Terminal, Monitor, Copy, ExternalLink, AlertCircle } from 'lucide-react'
import { useTmuxSessions, isTauri } from '../hooks/useGastown'
import type { TmuxSession } from '../types/gastown'

interface TmuxPanelProps {
  compact?: boolean
}

export default function TmuxPanel({ compact = false }: TmuxPanelProps) {
  // Check if we're in Tauri context
  const inTauri = isTauri()

  // Only fetch sessions if in Tauri
  const { data: sessions, isLoading, error } = useTmuxSessions()

  // Browser fallback - show friendly message instead of cryptic errors
  if (!inTauri) {
    return <BrowserFallback compact={compact} />
  }

  if (isLoading) {
    return <LoadingState compact={compact} />
  }

  if (error) {
    return <ErrorState error={error} compact={compact} />
  }

  const activeSessions = sessions || []

  return (
    <div
      className={`bg-slate-800/50 border border-slate-700 rounded-xl ${compact ? 'p-4' : 'p-6'}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          className={`font-semibold text-white flex items-center gap-2 ${compact ? 'text-base' : 'text-lg'}`}
        >
          <Terminal className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          Tmux Sessions
        </h2>
        <span className="text-xs text-slate-500 font-mono">
          Cmd+T to jump
        </span>
      </div>

      {activeSessions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {activeSessions.map((session) => (
            <SessionCard key={session.name} session={session} compact={compact} />
          ))}
        </div>
      )}
    </div>
  )
}

// Browser fallback component
function BrowserFallback({ compact }: { compact: boolean }) {
  return (
    <div
      className={`bg-slate-800/50 border border-amber-500/30 rounded-xl ${compact ? 'p-4' : 'p-6'}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-amber-900/30 rounded-lg">
          <Monitor className="w-5 h-5 text-amber-400" />
        </div>
        <h2 className="font-semibold text-white">Tmux Sessions</h2>
      </div>

      <div className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-200 font-medium mb-1">
            This feature requires the desktop app
          </p>
          <p className="text-slate-400 text-sm">
            Tmux session management is only available when running GastownUI as
            a native desktop application via Tauri.
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Run{' '}
            <code className="px-1.5 py-0.5 bg-slate-800 rounded text-cyan-400">
              npm run tauri:dev
            </code>{' '}
            for full functionality.
          </p>
        </div>
      </div>
    </div>
  )
}

// Session card component
function SessionCard({
  session,
  compact,
}: {
  session: TmuxSession
  compact: boolean
}) {
  const attachCmd = `tmux attach -t ${session.name}`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(attachCmd)
  }

  return (
    <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              session.attached ? 'bg-green-500' : 'bg-slate-500'
            }`}
          />
          <span className="text-white font-medium font-mono text-sm">
            {session.name}
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            session.attached
              ? 'bg-green-900/50 text-green-400'
              : 'bg-slate-700 text-slate-400'
          }`}
        >
          {session.attached ? 'Attached' : 'Detached'}
        </span>
      </div>

      {!compact && (
        <>
          {/* Session preview placeholder */}
          <div className="bg-black/50 rounded border border-slate-700 p-3 mb-3 font-mono text-xs text-slate-400">
            <div className="flex items-center gap-2 text-green-400">
              <span>$</span>
              <span className="animate-pulse">_</span>
            </div>
            <p className="text-slate-500 mt-1">
              {session.windows} window{session.windows !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium rounded transition-colors"
              title="Attach to session"
            >
              <ExternalLink className="w-3 h-3" />
              Attach
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded transition-colors"
              title={attachCmd}
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Loading state
function LoadingState({ compact }: { compact: boolean }) {
  return (
    <div
      className={`bg-slate-800/50 border border-slate-700 rounded-xl ${compact ? 'p-4' : 'p-6'}`}
    >
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-700 rounded w-1/3" />
        <div className="h-20 bg-slate-700 rounded" />
        <div className="h-20 bg-slate-700 rounded" />
      </div>
    </div>
  )
}

// Empty state
function EmptyState() {
  return (
    <div className="text-center py-8">
      <Terminal className="w-12 h-12 mx-auto mb-2 text-slate-600" />
      <p className="text-slate-500">No tmux sessions found</p>
      <p className="text-slate-600 text-sm mt-1">
        Start a session with <code className="text-cyan-400">tmux new</code>
      </p>
    </div>
  )
}

// Error state
function ErrorState({
  error,
  compact,
}: {
  error: Error
  compact: boolean
}) {
  return (
    <div
      className={`bg-slate-800/50 border border-red-500/30 rounded-xl ${compact ? 'p-4' : 'p-6'}`}
    >
      <div className="flex items-center gap-2 text-red-400 mb-2">
        <AlertCircle className="w-5 h-5" />
        <span className="font-medium">Error loading sessions</span>
      </div>
      <p className="text-slate-400 text-sm">{error.message}</p>
    </div>
  )
}
