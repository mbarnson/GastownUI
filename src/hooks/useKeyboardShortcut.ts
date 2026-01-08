import { useEffect, useCallback } from 'react'

type ModifierKey = 'meta' | 'ctrl' | 'alt' | 'shift'

interface KeyboardShortcutOptions {
  /** The key to listen for (e.g., 'n', 'Enter', 'Escape') */
  key: string
  /** Modifier keys required (meta = Cmd on Mac, Ctrl on Windows) */
  modifiers?: ModifierKey[]
  /** Callback when shortcut is triggered */
  onTrigger: () => void
  /** Whether the shortcut is currently enabled */
  enabled?: boolean
  /** Prevent default browser behavior */
  preventDefault?: boolean
}

/**
 * Hook for handling keyboard shortcuts
 * Automatically handles Cmd (Mac) / Ctrl (Windows) normalization
 */
export function useKeyboardShortcut({
  key,
  modifiers = [],
  onTrigger,
  enabled = true,
  preventDefault = true,
}: KeyboardShortcutOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Check if the key matches (case-insensitive)
      if (event.key.toLowerCase() !== key.toLowerCase()) return

      // Check modifiers
      const hasAllModifiers = modifiers.every((mod) => {
        switch (mod) {
          case 'meta':
            return event.metaKey || event.ctrlKey // Cmd on Mac, Ctrl on Windows
          case 'ctrl':
            return event.ctrlKey
          case 'alt':
            return event.altKey
          case 'shift':
            return event.shiftKey
          default:
            return false
        }
      })

      // Check no extra modifiers (unless they're in the list)
      const extraModifiers =
        (event.metaKey && !modifiers.includes('meta') && !modifiers.includes('ctrl')) ||
        (event.ctrlKey && !modifiers.includes('ctrl') && !modifiers.includes('meta')) ||
        (event.altKey && !modifiers.includes('alt')) ||
        (event.shiftKey && !modifiers.includes('shift'))

      if (!hasAllModifiers || extraModifiers) return

      // Don't trigger in input fields unless explicitly handling it
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape in input fields
        if (key.toLowerCase() !== 'escape') return
      }

      if (preventDefault) {
        event.preventDefault()
      }

      onTrigger()
    },
    [key, modifiers, onTrigger, enabled, preventDefault]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

/**
 * Common keyboard shortcuts
 */
export const shortcuts = {
  quickCreate: { key: 'n', modifiers: ['meta'] as ModifierKey[] },
  save: { key: 's', modifiers: ['meta'] as ModifierKey[] },
  close: { key: 'Escape', modifiers: [] as ModifierKey[] },
  search: { key: 'k', modifiers: ['meta'] as ModifierKey[] },
  help: { key: '?', modifiers: ['shift'] as ModifierKey[] },
}

/**
 * Format shortcut for display
 */
export function formatShortcut(key: string, modifiers: ModifierKey[]): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  const modifierSymbols = modifiers.map((mod) => {
    switch (mod) {
      case 'meta':
        return isMac ? '⌘' : 'Ctrl'
      case 'ctrl':
        return isMac ? '⌃' : 'Ctrl'
      case 'alt':
        return isMac ? '⌥' : 'Alt'
      case 'shift':
        return isMac ? '⇧' : 'Shift'
      default:
        return mod
    }
  })

  const keyDisplay = key.length === 1 ? key.toUpperCase() : key

  if (isMac) {
    return [...modifierSymbols, keyDisplay].join('')
  }

  return [...modifierSymbols, keyDisplay].join('+')
}
