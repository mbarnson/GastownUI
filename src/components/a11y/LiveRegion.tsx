import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { getAnnouncementDelay } from '../../utils/accessibility'

interface Announcement {
  id: string
  message: string
  priority: 'polite' | 'assertive'
  timestamp: number
}

interface LiveRegionContextValue {
  /** Announce a message to screen readers */
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  /** Clear all pending announcements */
  clearAnnouncements: () => void
}

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null)

/**
 * Provider for live region announcements
 * Add this at the app root to enable screen reader announcements
 */
export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [politeAnnouncement, setPoliteAnnouncement] = useState('')
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('')
  const [announcementQueue, setAnnouncementQueue] = useState<Announcement[]>([])

  // Process announcement queue
  useEffect(() => {
    if (announcementQueue.length === 0) return

    const delay = getAnnouncementDelay()
    const timer = setTimeout(() => {
      const [current, ...rest] = announcementQueue

      if (current.priority === 'assertive') {
        setAssertiveAnnouncement(current.message)
        // Clear after a moment so same message can be announced again
        setTimeout(() => setAssertiveAnnouncement(''), 100)
      } else {
        setPoliteAnnouncement(current.message)
        setTimeout(() => setPoliteAnnouncement(''), 100)
      }

      setAnnouncementQueue(rest)
    }, delay)

    return () => clearTimeout(timer)
  }, [announcementQueue])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement: Announcement = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      priority,
      timestamp: Date.now(),
    }

    setAnnouncementQueue((prev) => [...prev, announcement])
  }, [])

  const clearAnnouncements = useCallback(() => {
    setAnnouncementQueue([])
    setPoliteAnnouncement('')
    setAssertiveAnnouncement('')
  }, [])

  return (
    <LiveRegionContext.Provider value={{ announce, clearAnnouncements }}>
      {children}
      {/* Polite live region - for non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {politeAnnouncement}
      </div>
      {/* Assertive live region - for urgent updates */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {assertiveAnnouncement}
      </div>
    </LiveRegionContext.Provider>
  )
}

/**
 * Hook to announce messages to screen readers
 */
export function useLiveRegion(): LiveRegionContextValue {
  const context = useContext(LiveRegionContext)
  if (!context) {
    // Return a no-op if provider not found (for SSR or testing)
    return {
      announce: () => {},
      clearAnnouncements: () => {},
    }
  }
  return context
}

/**
 * Inline live region for component-specific announcements
 */
export function InlineLiveRegion({
  message,
  priority = 'polite',
  className = '',
}: {
  message: string
  priority?: 'polite' | 'assertive'
  className?: string
}) {
  return (
    <span
      role={priority === 'assertive' ? 'alert' : 'status'}
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {message}
    </span>
  )
}

/**
 * Status region that announces changes
 */
export function StatusAnnouncer({
  status,
  children,
}: {
  status: string
  children?: ReactNode
}) {
  const { announce } = useLiveRegion()

  useEffect(() => {
    if (status) {
      announce(status)
    }
  }, [status, announce])

  return children ? <>{children}</> : null
}
