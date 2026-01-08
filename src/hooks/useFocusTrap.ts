import { useEffect, useRef, useCallback } from 'react'

/**
 * Focusable element selectors
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(', ')

/**
 * Hook for trapping focus within a container (e.g., modals, dialogs)
 *
 * Features:
 * - Traps focus within the container when active
 * - Restores focus to the previously focused element when deactivated
 * - Handles Tab and Shift+Tab navigation at boundaries
 * - Auto-focuses the first focusable element when activated
 *
 * @param isActive - Whether the focus trap is currently active
 * @param options - Configuration options
 */
export function useFocusTrap(
  isActive: boolean,
  options: {
    /** Custom initial focus element ref */
    initialFocusRef?: React.RefObject<HTMLElement>
    /** Whether to restore focus when deactivated (default: true) */
    restoreFocus?: boolean
    /** Whether to auto-focus first element (default: true) */
    autoFocus?: boolean
  } = {}
) {
  const { initialFocusRef, restoreFocus = true, autoFocus = true } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  /**
   * Get all focusable elements within the container
   */
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []
    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    return Array.from(elements).filter(
      (el) => el.offsetParent !== null // Filter out hidden elements
    )
  }, [])

  /**
   * Handle keydown events for focus trapping
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !containerRef.current) return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      // Shift+Tab on first element -> go to last
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
        return
      }

      // Tab on last element -> go to first
      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
        return
      }
    },
    [getFocusableElements]
  )

  // Activate/deactivate focus trap
  useEffect(() => {
    if (!isActive) return

    // Store the currently focused element to restore later
    previousActiveElement.current = document.activeElement as HTMLElement

    // Add keydown listener for Tab trapping
    document.addEventListener('keydown', handleKeyDown)

    // Focus the initial element
    if (autoFocus) {
      // Small delay to ensure DOM is ready
      const focusTimer = setTimeout(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus()
        } else {
          const focusableElements = getFocusableElements()
          if (focusableElements.length > 0) {
            focusableElements[0].focus()
          }
        }
      }, 10)

      return () => {
        clearTimeout(focusTimer)
        document.removeEventListener('keydown', handleKeyDown)

        // Restore focus when deactivated
        if (restoreFocus && previousActiveElement.current) {
          previousActiveElement.current.focus()
        }
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // Restore focus when deactivated
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive, autoFocus, restoreFocus, handleKeyDown, getFocusableElements, initialFocusRef])

  return containerRef
}

export default useFocusTrap
