import { useRef, useEffect, ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { TextModeNavigation } from './TextModeNavigation'
import { StepIndicator, StepDots, StepProgressBar, Step } from './StepIndicator'
import type { FTUEStep } from '../types'

export interface TextModeContainerProps {
  /** Child content to render */
  children: ReactNode
  /** Current step index (0-based) */
  currentStepIndex: number
  /** Current step identifier */
  currentStep: FTUEStep | string
  /** List of all steps */
  steps: Step[]
  /** List of completed step IDs */
  completedSteps: (FTUEStep | string)[]
  /** Called when navigating to next step */
  onNext?: () => void
  /** Called when navigating to previous step */
  onBack?: () => void
  /** Whether Next button is disabled */
  nextDisabled?: boolean
  /** Whether Back button is disabled */
  backDisabled?: boolean
  /** Custom Next button label */
  nextLabel?: string
  /** Custom Back button label */
  backLabel?: string
  /** Step indicator style */
  indicatorStyle?: 'dots' | 'steps' | 'progress' | 'none'
  /** Title for the current step (for screen readers) */
  stepTitle?: string
  /** Whether keyboard navigation is enabled */
  keyboardEnabled?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Container component for FTUE text mode with full accessibility support
 *
 * Provides:
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Focus management for screen readers
 * - Step progress indicators
 * - Next/Back navigation buttons
 * - ARIA live region for announcements
 * - Reduced motion support
 *
 * @example
 * ```tsx
 * <TextModeContainer
 *   currentStepIndex={2}
 *   currentStep="install_beads"
 *   steps={FTUE_STEPS}
 *   completedSteps={['install_go']}
 *   onNext={() => dispatch({ type: 'PROCEED' })}
 *   onBack={() => dispatch({ type: 'GO_BACK' })}
 * >
 *   <VoiceScriptDisplay text={scriptText} />
 *   <CommandBlock command="go install ..." />
 * </TextModeContainer>
 * ```
 */
export function TextModeContainer({
  children,
  currentStepIndex,
  currentStep,
  steps,
  completedSteps,
  onNext,
  onBack,
  nextDisabled = false,
  backDisabled = false,
  nextLabel = 'Next',
  backLabel = 'Back',
  indicatorStyle = 'dots',
  stepTitle,
  keyboardEnabled = true,
  className = '',
}: TextModeContainerProps) {
  const prefersReducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const announcementRef = useRef<HTMLDivElement>(null)

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: nextDisabled ? undefined : onNext,
    onBack: backDisabled || currentStepIndex === 0 ? undefined : onBack,
    enabled: keyboardEnabled,
  })

  // Focus management - announce step changes
  useEffect(() => {
    const currentStepData = steps.find((s) => s.id === currentStep)
    const announcement = stepTitle || currentStepData?.label || 'Step changed'

    if (announcementRef.current) {
      announcementRef.current.textContent = `Now on: ${announcement}. Step ${currentStepIndex + 1} of ${steps.length}.`
    }

    // Focus the container for screen reader context
    if (containerRef.current) {
      containerRef.current.focus()
    }
  }, [currentStep, currentStepIndex, steps, stepTitle])

  const transitionClass = prefersReducedMotion
    ? ''
    : 'transition-opacity duration-200'

  return (
    <div
      ref={containerRef}
      className={`
        flex flex-col min-h-full
        focus:outline-none
        ${className}
      `}
      tabIndex={-1}
      role="region"
      aria-label={`FTUE setup: ${stepTitle || steps.find((s) => s.id === currentStep)?.label || 'Step'}`}
    >
      {/* Screen reader live region for announcements */}
      <div
        ref={announcementRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Step indicator */}
      {indicatorStyle !== 'none' && (
        <div className="mb-6">
          {indicatorStyle === 'dots' && (
            <StepDots
              total={steps.length}
              current={currentStepIndex}
              className="justify-center"
            />
          )}
          {indicatorStyle === 'progress' && (
            <StepProgressBar
              total={steps.length}
              current={currentStepIndex}
            />
          )}
          {indicatorStyle === 'steps' && (
            <StepIndicator
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
              size="sm"
              orientation="horizontal"
            />
          )}
        </div>
      )}

      {/* Main content area */}
      <div className={`flex-1 ${transitionClass}`}>{children}</div>

      {/* Navigation */}
      <div className="mt-8 pt-4 border-t border-slate-800">
        <TextModeNavigation
          currentStep={currentStepIndex}
          totalSteps={steps.length}
          onNext={onNext}
          onBack={onBack}
          nextDisabled={nextDisabled}
          backDisabled={backDisabled || currentStepIndex === 0}
          nextLabel={nextLabel}
          backLabel={backLabel}
        />

        {/* Keyboard shortcuts hint */}
        {keyboardEnabled && (
          <p
            className="mt-3 text-xs text-slate-600 text-center"
            aria-hidden="true"
          >
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">&rarr;</kbd> for next, <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">&larr;</kbd> for back
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Simplified container for single-content steps
 */
export function TextModeStep({
  children,
  stepNumber,
  stepLabel,
  totalSteps,
  className = '',
}: {
  children: ReactNode
  stepNumber: number
  stepLabel: string
  totalSteps?: number
  className?: string
}) {
  return (
    <section
      className={`space-y-4 ${className}`}
      aria-label={stepLabel}
      aria-current="step"
    >
      {totalSteps && (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <span className="w-6 h-6 flex items-center justify-center bg-cyan-600/20 text-cyan-400 rounded-full text-xs font-medium">
            {stepNumber}
          </span>
          <span>of {totalSteps}</span>
        </div>
      )}

      <h2 className="text-xl font-semibold text-white">{stepLabel}</h2>

      <div className="space-y-4">{children}</div>
    </section>
  )
}

export default TextModeContainer
