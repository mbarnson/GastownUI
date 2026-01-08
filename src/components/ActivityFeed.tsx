import { useActivityFeed, type ActivityEvent } from '../hooks/useGastown'
import {
  Circle,
  Plus,
  Check,
  AlertCircle,
  GitMerge,
  User,
  Loader2,
} from 'lucide-react'

interface ActivityFeedProps {
  limit?: number
  maxHeight?: string
}

// Format timestamp to relative time
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return date.toLocaleDateString()
}

// Format timestamp to HH:MM:SS
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// Get icon for event type
function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'created':
      return <Plus className="w-3.5 h-3.5 text-blue-400" />
    case 'closed':
      return <Check className="w-3.5 h-3.5 text-green-400" />
    case 'merged':
      return <GitMerge className="w-3.5 h-3.5 text-purple-400" />
    case 'claimed':
      return <User className="w-3.5 h-3.5 text-orange-400" />
    case 'updated':
      return <Circle className="w-3.5 h-3.5 text-yellow-400" />
    default:
      return <Circle className="w-3.5 h-3.5 text-gray-400" />
  }
}

// Get event symbol for text display
function getEventSymbol(eventType: string): string {
  switch (eventType) {
    case 'created':
      return '+'
    case 'closed':
      return '\u2713'
    case 'merged':
      return '\u2192'
    case 'claimed':
      return '\u2192'
    default:
      return '\u2022'
  }
}

// Get event color class
function getEventColorClass(eventType: string): string {
  switch (eventType) {
    case 'created':
      return 'text-blue-400'
    case 'closed':
      return 'text-green-400'
    case 'merged':
      return 'text-purple-400'
    case 'claimed':
      return 'text-orange-400'
    default:
      return 'text-gray-400'
  }
}

// Format actor name (extract last part)
function formatActor(actor: string | null): string {
  if (!actor) return 'unknown'
  const parts = actor.split('/')
  return parts[parts.length - 1]
}

// Truncate title to fit
function truncateTitle(title: string, maxLen: number = 40): string {
  if (title.length <= maxLen) return title
  return title.slice(0, maxLen - 3) + '...'
}

interface ActivityEventRowProps {
  event: ActivityEvent
}

function ActivityEventRow({ event }: ActivityEventRowProps) {
  const verb = event.event_type === 'created' ? 'created' : event.event_type === 'closed' ? 'closed' : event.event_type
  const actor = formatActor(event.actor)

  return (
    <div className="flex items-start gap-2 py-1.5 text-sm hover:bg-slate-700/30 px-2 -mx-2 rounded">
      <span className="text-gray-500 font-mono text-xs w-16 flex-shrink-0">
        {formatTime(event.timestamp)}
      </span>
      <span className={`flex-shrink-0 ${getEventColorClass(event.event_type)}`}>
        {getEventIcon(event.event_type)}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-gray-300">
          {event.event_type === 'created' ? (
            <>
              <span className="text-gray-400">{actor}</span>
              {' created '}
              <span className="text-white font-medium">{event.target_id}</span>
            </>
          ) : event.event_type === 'closed' ? (
            <>
              <span className="text-green-400">{getEventSymbol('closed')}</span>
              {' '}
              <span className="text-white font-medium">{event.target_id}</span>
              {' closed'}
              {event.actor && (
                <>
                  {' by '}
                  <span className="text-gray-400">{actor}</span>
                </>
              )}
            </>
          ) : (
            <>
              <span className="text-gray-400">{actor}</span>
              {' '}
              {verb}
              {' '}
              <span className="text-white font-medium">{event.target_id}</span>
            </>
          )}
        </span>
        <div className="text-gray-500 text-xs truncate mt-0.5" title={event.target_title}>
          {truncateTitle(event.target_title, 50)}
        </div>
        {event.details && (
          <div className="text-gray-600 text-xs truncate" title={event.details}>
            {truncateTitle(event.details, 60)}
          </div>
        )}
      </div>
    </div>
  )
}

export function ActivityFeed({ limit = 20, maxHeight = '400px' }: ActivityFeedProps) {
  const { data: events, isLoading, error } = useActivityFeed(limit)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400 text-sm">Loading activity...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-4 text-red-400">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Failed to load activity</span>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent activity</p>
        <p className="text-xs mt-1">Events will appear here as work progresses</p>
      </div>
    )
  }

  return (
    <div
      className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
      style={{ maxHeight }}
    >
      <div className="space-y-0.5">
        {events.map((event, idx) => (
          <ActivityEventRow key={`${event.timestamp}-${event.target_id}-${idx}`} event={event} />
        ))}
      </div>
    </div>
  )
}

export default ActivityFeed
