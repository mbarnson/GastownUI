import { useState, useEffect, useCallback, useMemo } from 'react'

/**
 * Voice history entry
 */
export interface VoiceHistoryEntry {
  /** Unique identifier */
  id: string
  /** User's voice input (transcribed text) */
  userText: string
  /** Assistant's response text */
  assistantText: string
  /** When the interaction occurred */
  timestamp: Date
  /** Duration of voice recording in seconds */
  duration?: number
  /** Base64 encoded audio data for replay (optional) */
  audioData?: string
  /** Any actions that were executed */
  actions?: string[]
  /** Whether the interaction was successful */
  success: boolean
}

/**
 * Serialized format for localStorage
 */
interface SerializedEntry {
  id: string
  userText: string
  assistantText: string
  timestamp: string
  duration?: number
  audioData?: string
  actions?: string[]
  success: boolean
}

const HISTORY_STORAGE_KEY = 'gastownui-voice-history'
const MAX_HISTORY_SIZE = 100
const MAX_AUDIO_ENTRIES = 10 // Keep audio for last 10 entries only

/**
 * Load history from localStorage
 */
function loadHistory(): VoiceHistoryEntry[] {
  if (typeof localStorage === 'undefined') return []

  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!stored) return []

    const entries: SerializedEntry[] = JSON.parse(stored)
    return entries.map((e) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }))
  } catch {
    return []
  }
}

/**
 * Save history to localStorage
 */
function saveHistory(entries: VoiceHistoryEntry[]): void {
  if (typeof localStorage === 'undefined') return

  try {
    // Limit audio storage to most recent entries
    const toStore = entries.slice(-MAX_HISTORY_SIZE).map((e, i) => {
      const serialized: SerializedEntry = {
        ...e,
        timestamp: e.timestamp.toISOString(),
      }
      // Only keep audio for most recent entries
      if (i < entries.length - MAX_AUDIO_ENTRIES) {
        delete serialized.audioData
      }
      return serialized
    })

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(toStore))
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Hook for managing voice command history
 *
 * @example
 * ```tsx
 * function VoicePanel() {
 *   const {
 *     history,
 *     addEntry,
 *     search,
 *     clearHistory,
 *   } = useVoiceHistory()
 *
 *   return (
 *     <div>
 *       {history.map(entry => (
 *         <div key={entry.id}>{entry.userText}</div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useVoiceHistory() {
  const [history, setHistory] = useState<VoiceHistoryEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  // Add a new entry to history
  const addEntry = useCallback(
    (entry: Omit<VoiceHistoryEntry, 'id' | 'timestamp'>) => {
      const newEntry: VoiceHistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      }

      setHistory((prev) => {
        const updated = [...prev, newEntry].slice(-MAX_HISTORY_SIZE)
        saveHistory(updated)
        return updated
      })

      return newEntry
    },
    []
  )

  // Remove an entry from history
  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id)
      saveHistory(updated)
      return updated
    })
  }, [])

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([])
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(HISTORY_STORAGE_KEY)
    }
  }, [])

  // Search history
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history

    const query = searchQuery.toLowerCase()
    return history.filter(
      (entry) =>
        entry.userText.toLowerCase().includes(query) ||
        entry.assistantText.toLowerCase().includes(query) ||
        entry.actions?.some((a) => a.toLowerCase().includes(query))
    )
  }, [history, searchQuery])

  // Get entries by date
  const getEntriesByDate = useCallback(
    (date: Date) => {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      return history.filter(
        (e) => e.timestamp >= startOfDay && e.timestamp <= endOfDay
      )
    },
    [history]
  )

  // Get entries grouped by date
  const groupedHistory = useMemo(() => {
    const groups = new Map<string, VoiceHistoryEntry[]>()

    filteredHistory.forEach((entry) => {
      const dateKey = entry.timestamp.toDateString()
      const existing = groups.get(dateKey) || []
      groups.set(dateKey, [...existing, entry])
    })

    return Array.from(groups.entries()).map(([date, entries]) => ({
      date,
      entries: entries.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      ),
    }))
  }, [filteredHistory])

  // Get statistics
  const stats = useMemo(
    () => ({
      totalEntries: history.length,
      successfulEntries: history.filter((e) => e.success).length,
      failedEntries: history.filter((e) => !e.success).length,
      entriesWithActions: history.filter((e) => e.actions && e.actions.length > 0)
        .length,
      totalDuration: history.reduce((sum, e) => sum + (e.duration || 0), 0),
    }),
    [history]
  )

  return {
    /** All history entries */
    history,
    /** Filtered history based on search query */
    filteredHistory,
    /** History grouped by date */
    groupedHistory,
    /** Add a new entry */
    addEntry,
    /** Remove an entry */
    removeEntry,
    /** Clear all history */
    clearHistory,
    /** Current search query */
    searchQuery,
    /** Set search query */
    setSearchQuery,
    /** Get entries for a specific date */
    getEntriesByDate,
    /** History statistics */
    stats,
  }
}

/**
 * Export history as JSON
 */
export function exportHistory(): string {
  const history = loadHistory()
  return JSON.stringify(history, null, 2)
}

/**
 * Import history from JSON
 */
export function importHistory(json: string): VoiceHistoryEntry[] {
  try {
    const entries: SerializedEntry[] = JSON.parse(json)
    const history = entries.map((e) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }))
    saveHistory(history)
    return history
  } catch {
    throw new Error('Invalid history data')
  }
}
