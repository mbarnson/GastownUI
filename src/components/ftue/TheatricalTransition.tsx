import { useState, useEffect, useCallback, ReactNode } from 'react'
import { useFTUE, TheatricalTransition as TransitionType } from '../../contexts/FTUEContext'
import { useCalmMode } from '../../contexts/CalmModeContext'

interface TheatricalTransitionProps {
  children: ReactNode
  /** Override transition type (otherwise uses context) */
  transition?: TransitionType
  /** Called when transition completes */
  onComplete?: () => void
  /** Whether to auto-trigger transition on mount */
  autoStart?: boolean
  /** Custom className */
  className?: string
}

/**
 * Theatrical transition wrapper that applies stage-appropriate animations
 * Respects calm mode - shows content instantly when enabled
 */
export function TheatricalTransitionWrapper({
  children,
  transition: overrideTransition,
  onComplete,
  autoStart = true,
  className = '',
}: TheatricalTransitionProps) {
  const { state, endTransition } = useFTUE()
  const { isCalm } = useCalmMode()
  const [isVisible, setIsVisible] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const transition = overrideTransition ?? state.currentTransition

  const handleTransitionEnd = useCallback(() => {
    endTransition()
    onComplete?.()
  }, [endTransition, onComplete])

  useEffect(() => {
    if (isCalm) {
      // Skip transitions in calm mode
      setIsVisible(true)
      setHasStarted(true)
      handleTransitionEnd()
      return
    }

    if (!transition || !autoStart) {
      setIsVisible(true)
      setHasStarted(true)
      return
    }

    // Start transition after delay
    const delayTimer = setTimeout(() => {
      setHasStarted(true)
      setIsVisible(true)
    }, transition.delay)

    // End transition after duration
    const durationTimer = setTimeout(() => {
      handleTransitionEnd()
    }, transition.delay + transition.duration)

    return () => {
      clearTimeout(delayTimer)
      clearTimeout(durationTimer)
    }
  }, [transition, autoStart, isCalm, handleTransitionEnd])

  // Get transition styles
  const getTransitionStyles = (): string => {
    if (isCalm || !transition) {
      return 'opacity-100'
    }

    const base = `transition-all duration-[${transition.duration}ms]`

    if (!hasStarted) {
      // Initial state before transition
      switch (transition.type) {
        case 'fade':
          return `${base} opacity-0`
        case 'slide':
          return `${base} opacity-0 translate-y-8`
        case 'reveal':
          return `${base} opacity-0 scale-95 blur-sm`
        case 'dissolve':
          return `${base} opacity-0 scale-110`
        case 'typewriter':
          return `${base} opacity-0`
        default:
          return `${base} opacity-0`
      }
    }

    if (!isVisible) {
      return `${base} opacity-0`
    }

    // Final visible state
    return `${base} opacity-100 translate-y-0 scale-100 blur-0`
  }

  return (
    <div className={`${getTransitionStyles()} ${className}`}>
      {children}
    </div>
  )
}

/**
 * Typewriter effect for text
 */
interface TypewriterTextProps {
  text: string
  /** Characters per second */
  speed?: number
  /** Called when typing completes */
  onComplete?: () => void
  className?: string
}

export function TypewriterText({
  text,
  speed = 30,
  onComplete,
  className = '',
}: TypewriterTextProps) {
  const { isCalm } = useCalmMode()
  const [displayText, setDisplayText] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (isCalm) {
      // Show full text immediately in calm mode
      setDisplayText(text)
      setIsComplete(true)
      onComplete?.()
      return
    }

    let index = 0
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index))
        index++
      } else {
        clearInterval(interval)
        setIsComplete(true)
        onComplete?.()
      }
    }, 1000 / speed)

    return () => clearInterval(interval)
  }, [text, speed, isCalm, onComplete])

  return (
    <span className={className}>
      {displayText}
      {!isComplete && !isCalm && (
        <span className="inline-block w-0.5 h-5 bg-current ml-0.5 animate-pulse" />
      )}
    </span>
  )
}

/**
 * Staged reveal - reveals children one by one
 */
interface StagedRevealProps {
  children: ReactNode[]
  /** Delay between each item in ms */
  staggerDelay?: number
  /** Base delay before first item */
  initialDelay?: number
  /** Called when all items revealed */
  onComplete?: () => void
  itemClassName?: string
  containerClassName?: string
}

export function StagedReveal({
  children,
  staggerDelay = 200,
  initialDelay = 0,
  onComplete,
  itemClassName = '',
  containerClassName = '',
}: StagedRevealProps) {
  const { isCalm } = useCalmMode()
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (isCalm) {
      // Show all immediately in calm mode
      setVisibleCount(children.length)
      onComplete?.()
      return
    }

    const timers: NodeJS.Timeout[] = []

    // Initial delay
    const startTimer = setTimeout(() => {
      // Reveal items one by one
      children.forEach((_, index) => {
        const timer = setTimeout(() => {
          setVisibleCount(index + 1)
          if (index === children.length - 1) {
            onComplete?.()
          }
        }, index * staggerDelay)
        timers.push(timer)
      })
    }, initialDelay)
    timers.push(startTimer)

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [children.length, staggerDelay, initialDelay, isCalm, onComplete])

  return (
    <div className={containerClassName}>
      {children.map((child, index) => (
        <div
          key={index}
          className={`
            transition-all duration-300
            ${index < visibleCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            ${itemClassName}
          `}
          style={{
            transitionDelay: isCalm ? '0ms' : `${index * 50}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

/**
 * Spotlight effect - highlights content with a glow
 */
interface SpotlightProps {
  children: ReactNode
  /** Whether spotlight is active */
  active?: boolean
  /** Glow color */
  color?: 'cyan' | 'green' | 'orange' | 'purple'
  className?: string
}

export function Spotlight({
  children,
  active = false,
  color = 'cyan',
  className = '',
}: SpotlightProps) {
  const { isCalm } = useCalmMode()

  const glowColors = {
    cyan: 'shadow-cyan-500/50',
    green: 'shadow-green-500/50',
    orange: 'shadow-orange-500/50',
    purple: 'shadow-purple-500/50',
  }

  const borderColors = {
    cyan: 'border-cyan-500/30',
    green: 'border-green-500/30',
    orange: 'border-orange-500/30',
    purple: 'border-purple-500/30',
  }

  return (
    <div
      className={`
        relative transition-all duration-500
        ${active && !isCalm ? `shadow-xl ${glowColors[color]} border ${borderColors[color]}` : ''}
        ${className}
      `}
    >
      {active && !isCalm && (
        <div
          className={`
            absolute inset-0 rounded-inherit
            bg-gradient-radial from-white/5 to-transparent
            pointer-events-none
          `}
        />
      )}
      {children}
    </div>
  )
}

/**
 * Progress ring animation
 */
interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
  className?: string
}

export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  color = '#22d3ee', // cyan-400
  bgColor = '#334155', // slate-700
  className = '',
}: ProgressRingProps) {
  const { isCalm } = useCalmMode()
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={bgColor}
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={isCalm ? '' : 'transition-all duration-500'}
      />
    </svg>
  )
}
