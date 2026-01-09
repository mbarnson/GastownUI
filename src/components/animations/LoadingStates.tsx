import type { ReactNode } from 'react'
import { useCalmMode } from '../../contexts/CalmModeContext'

/**
 * Skeleton placeholder component for loading states.
 * Shows a shimmer animation that respects reduced motion preferences.
 *
 * @example
 * ```tsx
 * // Text skeleton
 * <Skeleton width="200px" height="1rem" />
 *
 * // Card skeleton
 * <Skeleton width="100%" height="120px" rounded="lg" />
 *
 * // Circle avatar skeleton
 * <Skeleton width="40px" height="40px" rounded="full" />
 * ```
 */
export interface SkeletonProps {
  width?: string | number
  height?: string | number
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  rounded = 'md',
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${roundedClasses[rounded]} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  )
}

/**
 * Skeleton text lines for paragraph placeholders
 *
 * @example
 * ```tsx
 * <SkeletonText lines={3} />
 * ```
 */
export interface SkeletonTextProps {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.875rem"
          width={i === lines - 1 ? '70%' : '100%'}
        />
      ))}
    </div>
  )
}

/**
 * Skeleton card placeholder
 *
 * @example
 * ```tsx
 * <SkeletonCard />
 * ```
 */
export interface SkeletonCardProps {
  className?: string
  showImage?: boolean
  lines?: number
}

export function SkeletonCard({
  className = '',
  showImage = false,
  lines = 2,
}: SkeletonCardProps) {
  return (
    <div
      className={`bg-slate-800/50 rounded-xl border border-slate-700 p-4 ${className}`}
      aria-hidden="true"
    >
      {showImage && (
        <Skeleton width="100%" height="120px" rounded="lg" className="mb-4" />
      )}
      <Skeleton width="60%" height="1.25rem" className="mb-3" />
      <SkeletonText lines={lines} />
    </div>
  )
}

/**
 * Spinner component for inline loading indicators
 *
 * @example
 * ```tsx
 * <Spinner size="sm" />
 * <Spinner size="md" color="rose" />
 * ```
 */
export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  color?: 'current' | 'white' | 'rose' | 'blue'
  className?: string
}

const spinnerSizes = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
}

const spinnerColors = {
  current: 'border-current border-t-transparent',
  white: 'border-white border-t-transparent',
  rose: 'border-rose-500 border-t-transparent',
  blue: 'border-blue-500 border-t-transparent',
}

export function Spinner({
  size = 'md',
  color = 'current',
  className = '',
}: SpinnerProps) {
  const { isCalm } = useCalmMode()
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // In reduced motion mode, show a static indicator
  if (prefersReducedMotion || isCalm) {
    return (
      <span
        className={`inline-block ${spinnerSizes[size]} ${spinnerColors[color]} rounded-full ${className}`}
        style={{ borderTopColor: 'currentColor', opacity: 0.5 }}
        role="status"
        aria-label="Loading"
      />
    )
  }

  return (
    <span
      className={`inline-block ${spinnerSizes[size]} ${spinnerColors[color]} rounded-full animate-spin-smooth ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

/**
 * Indeterminate progress bar for operations with unknown duration
 *
 * @example
 * ```tsx
 * <ProgressIndeterminate />
 * <ProgressIndeterminate color="rose" />
 * ```
 */
export interface ProgressIndeterminateProps {
  color?: 'rose' | 'blue' | 'cyan' | 'purple'
  className?: string
}

const progressColors = {
  rose: 'text-rose-500',
  blue: 'text-blue-500',
  cyan: 'text-cyan-400',
  purple: 'text-purple-400',
}

export function ProgressIndeterminate({
  color = 'rose',
  className = '',
}: ProgressIndeterminateProps) {
  return (
    <div
      className={`h-1 w-full bg-slate-700 rounded-full progress-bar-indeterminate ${progressColors[color]} ${className}`}
      role="progressbar"
      aria-label="Loading"
      aria-valuetext="Loading..."
    />
  )
}

/**
 * Pulse dot indicator for subtle loading states
 *
 * @example
 * ```tsx
 * <PulseIndicator />
 * ```
 */
export interface PulseIndicatorProps {
  color?: 'rose' | 'green' | 'blue' | 'yellow'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const pulseColors = {
  rose: 'bg-rose-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
}

const pulseSizes = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
}

export function PulseIndicator({
  color = 'green',
  size = 'md',
  className = '',
}: PulseIndicatorProps) {
  return (
    <span
      className={`inline-block ${pulseSizes[size]} ${pulseColors[color]} rounded-full animate-pulse-subtle ${className}`}
      role="status"
      aria-label="Active"
    />
  )
}

/**
 * Loading overlay for sections or modals
 *
 * @example
 * ```tsx
 * {isLoading && <LoadingOverlay />}
 * ```
 */
export interface LoadingOverlayProps {
  message?: string
  className?: string
}

export function LoadingOverlay({
  message = 'Loading...',
  className = '',
}: LoadingOverlayProps) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl animate-fade-in ${className}`}
      role="status"
      aria-live="polite"
    >
      <Spinner size="lg" color="rose" />
      <span className="mt-3 text-sm text-slate-400">{message}</span>
    </div>
  )
}

/**
 * Content placeholder wrapper - shows skeleton during loading
 *
 * @example
 * ```tsx
 * <LoadingContent isLoading={isLoading} skeleton={<SkeletonCard />}>
 *   <ActualContent />
 * </LoadingContent>
 * ```
 */
export interface LoadingContentProps {
  isLoading: boolean
  skeleton: ReactNode
  children: ReactNode
  className?: string
}

export function LoadingContent({
  isLoading,
  skeleton,
  children,
  className = '',
}: LoadingContentProps) {
  if (isLoading) {
    return <div className={className}>{skeleton}</div>
  }

  return <div className={`animate-fade-in ${className}`}>{children}</div>
}
