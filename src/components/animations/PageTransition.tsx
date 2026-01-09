import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useCalmMode } from '../../contexts/CalmModeContext'

export interface PageTransitionProps {
  children: ReactNode
  /** Custom enter animation class */
  enterClass?: string
  /** Custom exit animation class */
  exitClass?: string
}

/**
 * Page transition wrapper component that animates route changes.
 * Respects prefers-reduced-motion and calm mode settings.
 *
 * @example
 * ```tsx
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 * ```
 */
export function PageTransition({
  children,
  enterClass = 'page-transition-enter',
  exitClass = 'page-transition-exit',
}: PageTransitionProps) {
  const location = useLocation()
  const { isCalm } = useCalmMode()
  const [isVisible, setIsVisible] = useState(true)
  const [currentChildren, setCurrentChildren] = useState(children)
  const [animationClass, setAnimationClass] = useState(enterClass)

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const shouldAnimate = !prefersReducedMotion && !isCalm

  useEffect(() => {
    if (!shouldAnimate) {
      // No animation - just update immediately
      setCurrentChildren(children)
      return
    }

    // Start exit animation
    setAnimationClass(exitClass)
    setIsVisible(false)

    // After exit animation completes, swap content and enter
    const exitTimer = setTimeout(() => {
      setCurrentChildren(children)
      setAnimationClass(enterClass)
      setIsVisible(true)
    }, 250) // Match --duration-page

    return () => clearTimeout(exitTimer)
  }, [location.pathname, shouldAnimate])

  // Update children without animation if content changes but route doesn't
  useEffect(() => {
    if (shouldAnimate) return // Route changes handle this
    setCurrentChildren(children)
  }, [children, shouldAnimate])

  if (!shouldAnimate) {
    return <>{currentChildren}</>
  }

  return (
    <div
      className={animationClass}
      style={{ opacity: isVisible ? undefined : 0 }}
    >
      {currentChildren}
    </div>
  )
}

/**
 * Simple fade transition wrapper for content that appears/disappears
 *
 * @example
 * ```tsx
 * <FadeTransition show={isLoaded}>
 *   <LoadedContent />
 * </FadeTransition>
 * ```
 */
export interface FadeTransitionProps {
  children: ReactNode
  show: boolean
  /** Duration in ms */
  duration?: number
}

export function FadeTransition({
  children,
  show,
  duration = 200,
}: FadeTransitionProps) {
  const { isCalm } = useCalmMode()
  const [shouldRender, setShouldRender] = useState(show)
  const [opacity, setOpacity] = useState(show ? 1 : 0)

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const shouldAnimate = !prefersReducedMotion && !isCalm

  useEffect(() => {
    if (!shouldAnimate) {
      setShouldRender(show)
      setOpacity(show ? 1 : 0)
      return
    }

    if (show) {
      setShouldRender(true)
      // Small delay to allow DOM update before animation
      requestAnimationFrame(() => setOpacity(1))
    } else {
      setOpacity(0)
      const timer = setTimeout(() => setShouldRender(false), duration)
      return () => clearTimeout(timer)
    }
  }, [show, duration, shouldAnimate])

  if (!shouldRender) return null

  if (!shouldAnimate) {
    return <>{children}</>
  }

  return (
    <div
      style={{
        opacity,
        transition: `opacity ${duration}ms var(--ease-out)`,
      }}
    >
      {children}
    </div>
  )
}

/**
 * Stagger animation wrapper - animates children with increasing delays
 *
 * @example
 * ```tsx
 * <StaggerChildren>
 *   <Card />
 *   <Card />
 *   <Card />
 * </StaggerChildren>
 * ```
 */
export interface StaggerChildrenProps {
  children: ReactNode
  /** Base delay between items in ms */
  staggerDelay?: number
  /** Whether to trigger animation */
  animate?: boolean
}

export function StaggerChildren({
  children,
  staggerDelay = 50,
  animate = true,
}: StaggerChildrenProps) {
  const { isCalm } = useCalmMode()
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const shouldAnimate = animate && !prefersReducedMotion && !isCalm

  if (!shouldAnimate) {
    return <>{children}</>
  }

  return <div className="stagger-children">{children}</div>
}

export default PageTransition
