import { useEffect, useCallback, useRef } from 'react'

/**
 * Keyboard navigation configuration
 */
export interface KeyboardNavigationOptions {
  /** Called when user presses Enter or Right Arrow */
  onNext?: () => void
  /** Called when user presses Left Arrow or Backspace */
  onBack?: () => void
  /** Called when user presses Escape */
  onEscape?: () => void
  /** Called when user presses Space */
  onSpace?: () => void
  /** Whether navigation is enabled */
  enabled?: boolean
  /** Whether to prevent default behavior for handled keys */
  preventDefault?: boolean
}

/**
 * Hook for keyboard navigation in FTUE text mode
 *
 * Provides consistent keyboard shortcuts across the FTUE flow:
 * - Enter/Right Arrow: Advance to next step
 * - Left Arrow/Backspace: Go back to previous step
 * - Escape: Exit or cancel current action
 * - Space: Toggle or activate current item
 *
 * @example
 * ```tsx
 * useKeyboardNavigation({
 *   onNext: () => setStep(prev => prev + 1),
 *   onBack: () => setStep(prev => prev - 1),
 *   onEscape: () => setShowHelp(false),
 *   enabled: !isLoading
 * })
 * ```
 */
export function useKeyboardNavigation({
  onNext,
  onBack,
  onEscape,
  onSpace,
  enabled = true,
  preventDefault = true,
}: KeyboardNavigationOptions): void {
  // Use refs to avoid re-registering listeners on handler changes
  const handlers = useRef({ onNext, onBack, onEscape, onSpace })

  useEffect(() => {
    handlers.current = { onNext, onBack, onEscape, onSpace }
  }, [onNext, onBack, onEscape, onSpace])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't intercept when user is typing in an input
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const { key } = event

      switch (key) {
        case 'Enter':
        case 'ArrowRight':
          if (handlers.current.onNext) {
            if (preventDefault) event.preventDefault()
            handlers.current.onNext()
          }
          break

        case 'ArrowLeft':
        case 'Backspace':
          if (handlers.current.onBack) {
            if (preventDefault) event.preventDefault()
            handlers.current.onBack()
          }
          break

        case 'Escape':
          if (handlers.current.onEscape) {
            if (preventDefault) event.preventDefault()
            handlers.current.onEscape()
          }
          break

        case ' ':
          if (handlers.current.onSpace) {
            if (preventDefault) event.preventDefault()
            handlers.current.onSpace()
          }
          break

        default:
          break
      }
    },
    [enabled, preventDefault]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}

/**
 * Hook for managing focus within FTUE steps
 *
 * Ensures proper focus management for screen readers and keyboard users.
 *
 * @param containerRef - Reference to the container element
 * @param focusOnMount - Whether to focus the container on mount
 */
export function useFocusManagement(
  containerRef: React.RefObject<HTMLElement>,
  focusOnMount = true
): void {
  useEffect(() => {
    if (!focusOnMount || !containerRef.current) return

    // Focus the container for screen reader announcements
    // Use a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      containerRef.current?.focus()
    }, 100)

    return () => clearTimeout(timer)
  }, [containerRef, focusOnMount])
}

export default useKeyboardNavigation
