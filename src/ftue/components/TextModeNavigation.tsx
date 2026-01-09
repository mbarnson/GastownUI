import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useReducedMotion } from '../hooks/useReducedMotion'

export interface TextModeNavigationProps {
  /** Current step index (0-based) */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Called when Back button is clicked */
  onBack?: () => void
  /** Called when Next button is clicked */
  onNext?: () => void
  /** Whether Back button is disabled */
  backDisabled?: boolean
  /** Whether Next button is disabled */
  nextDisabled?: boolean
  /** Label for Next button (default: "Next") */
  nextLabel?: string
  /** Label for Back button (default: "Back") */
  backLabel?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Text mode navigation component with Next/Back buttons
 *
 * Provides accessible navigation for the FTUE text-only mode:
 * - Clear Back/Next buttons with keyboard shortcuts
 * - ARIA labels for screen readers
 * - Visual disabled states
 * - Respects reduced motion preferences
 *
 * Keyboard shortcuts (handled by parent via useKeyboardNavigation):
 * - Left Arrow / Backspace: Back
 * - Right Arrow / Enter: Next
 */
export function TextModeNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  backDisabled = false,
  nextDisabled = false,
  nextLabel = 'Next',
  backLabel = 'Back',
  className = '',
}: TextModeNavigationProps) {
  const prefersReducedMotion = useReducedMotion()

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1

  const transitionClass = prefersReducedMotion
    ? ''
    : 'transition-all duration-200'

  return (
    <nav
      className={`flex items-center justify-between gap-4 ${className}`}
      role="navigation"
      aria-label="FTUE navigation"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        disabled={backDisabled || isFirstStep}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg
          text-sm font-medium
          ${transitionClass}
          ${
            backDisabled || isFirstStep
              ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900'
          }
        `}
        aria-label={`${backLabel} (Left arrow or Backspace)`}
        aria-disabled={backDisabled || isFirstStep}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        <span>{backLabel}</span>
      </button>

      {/* Step counter - visible but compact */}
      <span
        className="text-xs text-slate-500 tabular-nums"
        aria-live="polite"
        aria-atomic="true"
      >
        Step {currentStep + 1} of {totalSteps}
      </span>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg
          text-sm font-medium
          ${transitionClass}
          ${
            nextDisabled
              ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              : isLastStep
                ? 'bg-green-600 text-white hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900'
                : 'bg-cyan-600 text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900'
          }
        `}
        aria-label={`${nextLabel} (Right arrow or Enter)`}
        aria-disabled={nextDisabled}
      >
        <span>{isLastStep ? 'Finish' : nextLabel}</span>
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  )
}

/**
 * Compact navigation variant for smaller spaces
 */
export function TextModeNavigationCompact({
  onBack,
  onNext,
  backDisabled = false,
  nextDisabled = false,
}: Pick<
  TextModeNavigationProps,
  'onBack' | 'onNext' | 'backDisabled' | 'nextDisabled'
>) {
  return (
    <div className="flex items-center gap-2" role="navigation">
      <button
        onClick={onBack}
        disabled={backDisabled}
        className={`
          p-2 rounded-lg transition-colors
          ${
            backDisabled
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }
        `}
        aria-label="Go back"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={`
          p-2 rounded-lg transition-colors
          ${
            nextDisabled
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-cyan-400 hover:text-cyan-300 hover:bg-slate-800'
          }
        `}
        aria-label="Go forward"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}

export default TextModeNavigation
