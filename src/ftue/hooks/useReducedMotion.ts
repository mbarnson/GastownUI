import { useState, useEffect } from 'react'

/**
 * Hook to detect user's reduced motion preference
 *
 * Respects the prefers-reduced-motion media query for accessibility.
 * When true, animations should be minimized or disabled.
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion()
 *
 * const transition = prefersReducedMotion
 *   ? 'none'
 *   : 'transform 300ms ease'
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // SSR-safe initial check
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }

    // Legacy Safari
    mediaQuery.addListener(handler)
    return () => mediaQuery.removeListener(handler)
  }, [])

  return prefersReducedMotion
}

export default useReducedMotion
