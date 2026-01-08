import { useState } from 'react'
import {
  Bell,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Check,
  X,
} from 'lucide-react'

export interface Notification {
  id: string
  type: 'convoy_complete' | 'convoy_failed' | 'merge_complete' | 'escalation' | 'cost_alert'
  title: string
  message: string
  timestamp: string
  read: boolean
  convoyId?: string
  beadId?: string
  actionable?: boolean
}

interface NotificationHubProps {
  notifications: Notification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onDelete: (id: string) => void
  onAction?: (notification: Notification, action: 'approve' | 'reject') => void
}

export default function NotificationHub({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onAction,
}: NotificationHubProps) {
  const unreadCount = notifications.filter((n) => !n.read).length

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'convoy_complete':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />
      case 'convoy_failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'merge_complete':
        return <Truck className="w-5 h-5 text-cyan-400" />
      case 'escalation':
        return <AlertCircle className="w-5 h-5 text-orange-400" />
      case 'cost_alert':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
      default:
        return <Bell className="w-5 h-5 text-slate-400" />
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-cyan-400" />
          <h2 className="text-white font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-cyan-500 text-white text-xs font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-cyan-400 text-sm hover:text-cyan-300"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Bell className="w-12 h-12 mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 ${
                  notification.read ? 'bg-slate-900/50' : 'bg-slate-800/50'
                }`}
                onClick={() => !notification.read && onMarkRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`font-medium ${
                          notification.read ? 'text-slate-400' : 'text-white'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <span className="text-slate-500 text-xs whitespace-nowrap">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                      {notification.message}
                    </p>

                    {/* Action buttons for escalations */}
                    {notification.actionable && notification.type === 'escalation' && (
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onAction?.(notification, 'approve')
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onAction?.(notification, 'reject')
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Reference badges */}
                    {(notification.convoyId || notification.beadId) && (
                      <div className="flex items-center gap-2 mt-2">
                        {notification.convoyId && (
                          <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded font-mono">
                            {notification.convoyId}
                          </span>
                        )}
                        {notification.beadId && (
                          <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded font-mono">
                            {notification.beadId}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(notification.id)
                    }}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Unread indicator */}
                {!notification.read && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Mock notifications for development
export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'convoy_complete',
    title: 'Convoy Complete',
    message: '"Phase 1: Core UI MVP" finished successfully',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    read: false,
    convoyId: 'convoy-001',
  },
  {
    id: '2',
    type: 'escalation',
    title: 'Escalation Needed',
    message: 'Polecat furiosa needs approval for voice integration merge',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    read: false,
    beadId: 'ga-mmy',
    actionable: true,
  },
  {
    id: '3',
    type: 'cost_alert',
    title: 'Cost Alert',
    message: 'Daily spend exceeded $50 threshold',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    read: true,
  },
  {
    id: '4',
    type: 'merge_complete',
    title: 'Merge Complete',
    message: 'ga-6tk scaffold merged to main',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    read: true,
    beadId: 'ga-6tk',
  },
]
