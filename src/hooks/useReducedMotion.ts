import { useState, useEffect } from 'react'

/**
 * Hook to detect user's prefers-reduced-motion preference
 * Returns true if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

/**
 * Get motion-safe CSS classes
 * Returns animation classes only if motion is allowed
 */
export function getMotionSafeClasses(
  animatedClasses: string,
  reducedClasses: string,
  prefersReducedMotion: boolean
): string {
  return prefersReducedMotion ? reducedClasses : animatedClasses
}
