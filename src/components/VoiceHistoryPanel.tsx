import { useState, useRef, useCallback } from 'react'
import {
  Search,
  X,
  Play,
  Clock,
  Trash2,
  Download,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  Command,
} from 'lucide-react'
import {
  useVoiceHistory,
  exportHistory,
  type VoiceHistoryEntry,
} from '../hooks/useVoiceHistory'

interface VoiceHistoryPanelProps {
  /** Optional callback when replaying a voice command */
  onReplay?: (entry: VoiceHistoryEntry) => void
  /** Optional class name */
  className?: string
}

/**
 * Voice command history panel with:
 * - Scrollable history with timestamps
 * - Search functionality
 * - Replay capability
 * - Date grouping
 * - Statistics
 *
 * @example
 * ```tsx
 * <VoiceHistoryPanel onReplay={(entry) => replayCommand(entry)} />
 * ```
 */
export function VoiceHistoryPanel({
  onReplay,
  className = '',
}: VoiceHistoryPanelProps) {
  const {
    groupedHistory,
    searchQuery,
    setSearchQuery,
    clearHistory,
    removeEntry,
    stats,
  } = useVoiceHistory()

  const [expandedDates, setExpandedDates] = useState<Set<string>>(
    new Set([new Date().toDateString()]) // Expand today by default
  )
  const [showStats, setShowStats] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const toggleDate = useCallback((date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }, [])

  const handleExport = useCallback(() => {
    const data = exportHistory()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voice-history-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleClearHistory = useCallback(() => {
    if (window.confirm('Clear all voice history? This cannot be undone.')) {
      clearHistory()
    }
  }, [clearHistory])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    }
  }

  return (
    <div
      className={`flex flex-col h-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          Voice History
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            title="Show statistics"
          >
            <Command className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            title="Export history"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearHistory}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
            title="Clear history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statistics */}
      {showStats && (
        <div className="px-4 py-2 bg-slate-800/30 border-b border-slate-700 grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-slate-400">Total</div>
            <div className="text-slate-200 font-medium">{stats.totalEntries}</div>
          </div>
          <div className="text-center">
            <div className="text-emerald-400">Success</div>
            <div className="text-slate-200 font-medium">
              {stats.successfulEntries}
            </div>
          </div>
          <div className="text-center">
            <div className="text-amber-400">With Actions</div>
            <div className="text-slate-200 font-medium">
              {stats.entriesWithActions}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history..."
            className="w-full pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {groupedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            {searchQuery ? 'No matching entries' : 'No voice history yet'}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {groupedHistory.map(({ date, entries }) => (
              <div key={date}>
                {/* Date Header */}
                <button
                  onClick={() => toggleDate(date)}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-slate-800/50 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  {expandedDates.has(date) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="font-medium">{formatDate(date)}</span>
                  <span className="text-slate-500 text-xs">
                    ({entries.length})
                  </span>
                </button>

                {/* Entries for this date */}
                {expandedDates.has(date) && (
                  <div className="divide-y divide-slate-800/50">
                    {entries.map((entry) => (
                      <HistoryEntry
                        key={entry.id}
                        entry={entry}
                        formatTime={formatTime}
                        onReplay={onReplay}
                        onRemove={removeEntry}
                      />
                    ))}
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

interface HistoryEntryProps {
  entry: VoiceHistoryEntry
  formatTime: (date: Date) => string
  onReplay?: (entry: VoiceHistoryEntry) => void
  onRemove: (id: string) => void
}

function HistoryEntry({
  entry,
  formatTime,
  onReplay,
  onRemove,
}: HistoryEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="px-4 py-3 hover:bg-slate-800/30 transition-colors">
      {/* Main row */}
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-0.5">
          {entry.success ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500">
              {formatTime(entry.timestamp)}
            </span>
            {entry.duration && (
              <span className="text-xs text-slate-600">
                {entry.duration.toFixed(1)}s
              </span>
            )}
            {entry.actions && entry.actions.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                {entry.actions.length} action
                {entry.actions.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* User input */}
          <p className="text-sm text-slate-300 line-clamp-2">{entry.userText}</p>

          {/* Expandable response */}
          {isExpanded && (
            <div className="mt-2 p-2 bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-400">{entry.assistantText}</p>
              {entry.actions && entry.actions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <p className="text-xs text-slate-500 mb-1">Actions:</p>
                  <ul className="text-xs text-amber-400 space-y-0.5">
                    {entry.actions.map((action, i) => (
                      <li key={i}>• {action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {onReplay && entry.audioData && (
            <button
              onClick={() => onReplay(entry)}
              className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors"
              title="Replay"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onRemove(entry.id)}
            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
            title="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact version of the history panel for embedding in sidebars
 */
export function VoiceHistoryCompact({
  maxItems = 5,
  onReplay,
  className = '',
}: {
  maxItems?: number
  onReplay?: (entry: VoiceHistoryEntry) => void
  className?: string
}) {
  const { history, setSearchQuery } = useVoiceHistory()
  const recentEntries = history.slice(-maxItems).reverse()

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
        Recent Commands
      </h4>
      {recentEntries.length === 0 ? (
        <p className="text-xs text-slate-500">No history yet</p>
      ) : (
        <div className="space-y-1">
          {recentEntries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => onReplay?.(entry)}
              className="w-full flex items-center gap-2 px-2 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded text-left transition-colors group"
            >
              {entry.success ? (
                <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
              )}
              <span className="text-xs text-slate-300 truncate flex-1">
                {entry.userText}
              </span>
              <span className="text-xs text-slate-600">
                {formatTime(entry.timestamp)}
              </span>
              {onReplay && entry.audioData && (
                <Play className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
