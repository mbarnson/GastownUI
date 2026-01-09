/**
 * FTUE Text Mode Components
 *
 * Accessible, keyboard-navigable components for text-only FTUE mode.
 * Compliant with Apple Human Interface Guidelines for accessibility.
 *
 * Usage:
 * ```tsx
 * import {
 *   FTUETextModeFlow,
 *   TextModeContainer,
 *   TextModeNavigation,
 *   StepIndicator,
 * } from '@/ftue/textmode'
 *
 * // Full text mode flow
 * <FTUETextModeFlow
 *   setupState={setupState}
 *   onComplete={handleComplete}
 * />
 *
 * // Or build custom layouts with components
 * <TextModeContainer
 *   currentStepIndex={step}
 *   steps={steps}
 *   onNext={goNext}
 *   onBack={goBack}
 * >
 *   <VoiceScriptDisplay text={scriptText} />
 *   <CommandBlock command="brew install go" />
 * </TextModeContainer>
 * ```
 */

// Main flow component
export { FTUETextModeFlow } from '../components/FTUETextModeFlow'

// Container and navigation
export {
  TextModeContainer,
  TextModeStep,
} from '../components/TextModeContainer'
export {
  TextModeNavigation,
  TextModeNavigationCompact,
} from '../components/TextModeNavigation'

// Step indicators
export {
  StepIndicator,
  StepDots,
  StepProgressBar,
  type Step,
  type StepIndicatorProps,
} from '../components/StepIndicator'

// Script display
export {
  VoiceScriptDisplay,
  VoiceScriptInline,
  TextModeScriptCard,
} from '../components/VoiceScriptDisplay'

// Command blocks
export {
  CommandBlock,
  InstallInstructions,
  PathFixInstructions,
} from '../components/CommandBlock'

// Hooks
export {
  useReducedMotion,
  useKeyboardNavigation,
  useFocusManagement,
} from '../hooks'

// Types
export type {
  TextModeSettings,
  NavigationDirection,
  StepNavigationEvent,
  KeyboardShortcuts,
  TextModeStepDefinition,
  LiveRegionConfig,
} from '../types'

export {
  DEFAULT_TEXT_MODE_SETTINGS,
  DEFAULT_KEYBOARD_SHORTCUTS,
  DEFAULT_LIVE_REGION,
} from '../types'
