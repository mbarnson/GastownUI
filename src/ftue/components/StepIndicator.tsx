import { Check, Circle, Loader2 } from 'lucide-react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import type { FTUEStep } from '../types'

export interface Step {
  /** Unique identifier for the step */
  id: FTUEStep | string
  /** Display label for the step */
  label: string
  /** Optional description shown on hover/focus */
  description?: string
}

export interface StepIndicatorProps {
  /** List of steps to display */
  steps: Step[]
  /** Current step id */
  currentStep: FTUEStep | string
  /** Completed step ids */
  completedSteps: (FTUEStep | string)[]
  /** Optional click handler for navigating to a step */
  onStepClick?: (stepId: FTUEStep | string) => void
  /** Whether steps are clickable for navigation */
  clickable?: boolean
  /** Orientation: horizontal (default) or vertical */
  orientation?: 'horizontal' | 'vertical'
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

/**
 * Step indicator component for FTUE progress visualization
 *
 * Shows progress through the FTUE steps with:
 * - Visual completed/current/pending states
 * - VoiceOver-friendly labels
 * - Optional step navigation
 * - Horizontal or vertical layout
 *
 * @example
 * ```tsx
 * <StepIndicator
 *   steps={[
 *     { id: 'install_go', label: 'Go' },
 *     { id: 'install_beads', label: 'Beads' },
 *     { id: 'configure_workspace', label: 'Workspace' },
 *   ]}
 *   currentStep="install_beads"
 *   completedSteps={['install_go']}
 * />
 * ```
 */
export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  clickable = false,
  orientation = 'horizontal',
  size = 'md',
  className = '',
}: StepIndicatorProps) {
  const prefersReducedMotion = useReducedMotion()

  const isVertical = orientation === 'vertical'

  const sizeClasses = {
    sm: {
      dot: 'w-6 h-6',
      icon: 'w-3 h-3',
      text: 'text-xs',
      gap: isVertical ? 'gap-3' : 'gap-2',
      connector: isVertical ? 'w-0.5 h-6' : 'h-0.5 flex-1',
    },
    md: {
      dot: 'w-8 h-8',
      icon: 'w-4 h-4',
      text: 'text-sm',
      gap: isVertical ? 'gap-4' : 'gap-3',
      connector: isVertical ? 'w-0.5 h-8' : 'h-0.5 flex-1',
    },
    lg: {
      dot: 'w-10 h-10',
      icon: 'w-5 h-5',
      text: 'text-base',
      gap: isVertical ? 'gap-5' : 'gap-4',
      connector: isVertical ? 'w-0.5 h-10' : 'h-0.5 flex-1',
    },
  }

  const sizes = sizeClasses[size]

  const getStepStatus = (stepId: string) => {
    if (completedSteps.includes(stepId)) return 'completed'
    if (stepId === currentStep) return 'current'
    return 'pending'
  }

  const getStepIndex = (stepId: string) =>
    steps.findIndex((s) => s.id === stepId)

  const currentIndex = getStepIndex(currentStep)

  return (
    <nav
      className={`
        flex ${isVertical ? 'flex-col' : 'flex-row items-center'}
        ${sizes.gap}
        ${className}
      `}
      role="navigation"
      aria-label="Setup progress"
    >
      {steps.map((step, index) => {
        const status = getStepStatus(step.id)
        const isClickable =
          clickable && (status === 'completed' || index === currentIndex - 1)

        return (
          <div
            key={step.id}
            className={`
              flex ${isVertical ? 'flex-row' : 'flex-col'} items-center
              ${sizes.gap}
            `}
          >
            {/* Step dot and connector container */}
            <div
              className={`
                flex ${isVertical ? 'flex-col' : 'flex-row'} items-center
                ${index < steps.length - 1 ? sizes.gap : ''}
              `}
            >
              {/* Step dot button/indicator */}
              <button
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                className={`
                  ${sizes.dot}
                  flex items-center justify-center rounded-full
                  border-2
                  ${!prefersReducedMotion ? 'transition-all duration-200' : ''}
                  ${
                    status === 'completed'
                      ? 'bg-green-600 border-green-500 text-white'
                      : status === 'current'
                        ? 'bg-cyan-600 border-cyan-400 text-white ring-2 ring-cyan-400/30 ring-offset-2 ring-offset-slate-900'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                  }
                  ${
                    isClickable
                      ? 'cursor-pointer hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-500'
                      : 'cursor-default'
                  }
                `}
                aria-label={`Step ${index + 1}: ${step.label}${
                  status === 'completed'
                    ? ' (completed)'
                    : status === 'current'
                      ? ' (current)'
                      : ''
                }`}
                aria-current={status === 'current' ? 'step' : undefined}
                tabIndex={isClickable ? 0 : -1}
              >
                {status === 'completed' ? (
                  <Check className={sizes.icon} aria-hidden="true" />
                ) : status === 'current' ? (
                  <Loader2
                    className={`${sizes.icon} ${!prefersReducedMotion ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                ) : (
                  <Circle className={sizes.icon} aria-hidden="true" />
                )}
              </button>

              {/* Connector line to next step */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    ${sizes.connector}
                    ${!prefersReducedMotion ? 'transition-colors duration-300' : ''}
                    ${
                      completedSteps.includes(steps[index + 1]?.id) ||
                      currentStep === steps[index + 1]?.id
                        ? 'bg-green-600'
                        : 'bg-slate-700'
                    }
                  `}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Step label (vertical only) */}
            {isVertical && (
              <span
                className={`
                  ${sizes.text}
                  ${status === 'current' ? 'text-white font-medium' : 'text-slate-400'}
                `}
              >
                {step.label}
              </span>
            )}
          </div>
        )
      })}

      {/* Progress summary for screen readers */}
      <div className="sr-only" role="status" aria-live="polite">
        Step {currentIndex + 1} of {steps.length}:{' '}
        {steps[currentIndex]?.label || 'Unknown'}
      </div>
    </nav>
  )
}

/**
 * Minimal dot-only step indicator
 */
export function StepDots({
  total,
  current,
  className = '',
}: {
  total: number
  current: number
  className?: string
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="navigation"
      aria-label={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`
            w-2 h-2 rounded-full
            ${!prefersReducedMotion ? 'transition-all duration-200' : ''}
            ${
              index === current
                ? 'bg-cyan-400 scale-125'
                : index < current
                  ? 'bg-green-500'
                  : 'bg-slate-600'
            }
          `}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

/**
 * Linear progress bar alternative to dots
 */
export function StepProgressBar({
  total,
  current,
  className = '',
}: {
  total: number
  current: number
  className?: string
}) {
  const progress = total > 1 ? (current / (total - 1)) * 100 : 0
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className={`w-full ${className}`}
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${current + 1} of ${total}`}
    >
      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`
            h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full
            ${!prefersReducedMotion ? 'transition-all duration-300 ease-out' : ''}
          `}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default StepIndicator
