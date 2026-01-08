import { useState, useEffect, useCallback } from 'react'

/**
 * Accessibility preferences detected from system settings
 */
export interface AccessibilityState {
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean
  /** Whether user prefers high contrast */
  prefersHighContrast: boolean
  /** Detected font scale factor (1.0 = normal) */
  fontScale: number
  /** Whether user has increased font size above normal */
  hasLargerText: boolean
}

const DEFAULT_STATE: AccessibilityState = {
  prefersReducedMotion: false,
  prefersHighContrast: false,
  fontScale: 1,
  hasLargerText: false,
}

/**
 * Detects font scale by comparing computed vs expected font size
 * This works because browsers apply system font size preferences
 * to the root element's computed style
 */
function detectFontScale(): number {
  if (typeof window === 'undefined') return 1

  // Create a test element with known font size
  const testEl = document.createElement('div')
  testEl.style.cssText = 'position:absolute;visibility:hidden;font-size:16px;'
  document.body.appendChild(testEl)

  // Get computed font size (affected by system preferences)
  const computedSize = parseFloat(getComputedStyle(testEl).fontSize)
  document.body.removeChild(testEl)

  // If computed differs from expected, system has scaling applied
  // Note: This technique has limitations on some platforms
  const baseScale = computedSize / 16

  // iOS/macOS Dynamic Type can also be detected via viewport meta
  // For now, use the computed approach and allow JS override
  return Math.max(0.75, Math.min(2, baseScale))
}

/**
 * Updates CSS custom property for Dynamic Type scaling
 */
function updateDtScale(scale: number): void {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--dt-scale', String(scale))
  }
}

/**
 * Hook that tracks system accessibility preferences and applies them
 *
 * Features:
 * - Detects prefers-reduced-motion media query
 * - Detects prefers-contrast: high media query
 * - Attempts to detect system font scale
 * - Updates --dt-scale CSS variable for Dynamic Type
 *
 * @example
 * ```tsx
 * function App() {
 *   const { prefersReducedMotion, fontScale } = useAccessibility()
 *
 *   return (
 *     <div className={prefersReducedMotion ? 'no-animate' : ''}>
 *       Font scale: {fontScale}x
 *     </div>
 *   )
 * }
 * ```
 */
export function useAccessibility(): AccessibilityState {
  const [state, setState] = useState<AccessibilityState>(DEFAULT_STATE)

  // Detect and update preferences
  const detectPreferences = useCallback(() => {
    if (typeof window === 'undefined') return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    const prefersHighContrast = window.matchMedia(
      '(prefers-contrast: high)'
    ).matches

    const fontScale = detectFontScale()
    const hasLargerText = fontScale > 1.05 // 5% threshold for "larger"

    // Apply scale to CSS
    updateDtScale(fontScale)

    setState({
      prefersReducedMotion,
      prefersHighContrast,
      fontScale,
      hasLargerText,
    })
  }, [])

  useEffect(() => {
    // Initial detection
    detectPreferences()

    // Listen for media query changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')

    const handleChange = () => detectPreferences()

    // Modern API
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', handleChange)
      contrastQuery.addEventListener('change', handleChange)
    } else {
      // Legacy fallback
      motionQuery.addListener(handleChange)
      contrastQuery.addListener(handleChange)
    }

    // Re-detect on visibility change (user may have changed settings)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        detectPreferences()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener('change', handleChange)
        contrastQuery.removeEventListener('change', handleChange)
      } else {
        motionQuery.removeListener(handleChange)
        contrastQuery.removeListener(handleChange)
      }
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [detectPreferences])

  return state
}

/**
 * Manually set the font scale (for testing or user override)
 * This updates the CSS variable and persists to localStorage
 */
export function setFontScale(scale: number): void {
  const clampedScale = Math.max(0.75, Math.min(2, scale))
  updateDtScale(clampedScale)

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('gastownui-font-scale', String(clampedScale))
  }
}

/**
 * Get any user-overridden font scale from localStorage
 */
export function getUserFontScale(): number | null {
  if (typeof localStorage === 'undefined') return null

  const stored = localStorage.getItem('gastownui-font-scale')
  if (stored) {
    const parsed = parseFloat(stored)
    if (!isNaN(parsed) && parsed >= 0.75 && parsed <= 2) {
      return parsed
    }
  }
  return null
}

/**
 * Clear user font scale override, reverting to system default
 */
export function clearFontScaleOverride(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('gastownui-font-scale')
  }
}

/**
 * Hook that applies user font scale override if set
 * Use this at the app root to respect user preferences
 */
export function useUserFontScale(): void {
  useEffect(() => {
    const userScale = getUserFontScale()
    if (userScale !== null) {
      updateDtScale(userScale)
    }
  }, [])
}
