import { useState, useCallback, useMemo, useEffect } from 'react'
import { TextModeContainer } from './TextModeContainer'
import { VoiceScriptDisplay, TextModeScriptCard } from './VoiceScriptDisplay'
import { CommandBlock, InstallInstructions, PathFixInstructions } from './CommandBlock'
import { SetupChecklist } from './SetupChecklist'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { VOICE_SCRIPTS } from '../useFTUEAudioManager'
import type { FTUEStep, Platform, SetupState } from '../types'

/**
 * Step definition for text mode flow
 */
interface TextModeStep {
  id: FTUEStep
  label: string
  description?: string
  /** Command to display (if applicable) */
  command?: string
  /** Command description */
  commandDescription?: string
  /** Whether this step waits for detection before allowing Next */
  waitForDetection?: boolean
  /** Detection key to check in setupState */
  detectionKey?: keyof SetupState
}

/**
 * Full text mode step definitions with commands and instructions
 */
const TEXT_MODE_STEPS: TextModeStep[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    description: 'Getting started with Gas Town',
  },
  {
    id: 'install_go',
    label: 'Install Go',
    description: 'Go programming language',
    waitForDetection: true,
    detectionKey: 'hasGo',
  },
  {
    id: 'install_beads',
    label: 'Install Beads',
    description: 'Issue tracker',
    command: 'go install github.com/anthropics/beads/cmd/bd@latest',
    commandDescription: 'Run this command to install Beads:',
    waitForDetection: true,
    detectionKey: 'hasBd',
  },
  {
    id: 'install_gastown',
    label: 'Install Gas Town',
    description: 'Orchestrator',
    command: 'go install github.com/anthropics/gastown/cmd/gt@latest',
    commandDescription: 'Run this command to install Gas Town:',
    waitForDetection: true,
    detectionKey: 'hasGt',
  },
  {
    id: 'configure_workspace',
    label: 'Configure Workspace',
    description: 'Set up your workspace directory',
  },
  {
    id: 'complete',
    label: 'Complete',
    description: 'All set!',
  },
]

interface FTUETextModeFlowProps {
  /** Current setup state from detection */
  setupState: SetupState
  /** Called when user wants to proceed to next step */
  onNext?: (currentStep: FTUEStep, nextStep: FTUEStep) => void
  /** Called when user wants to go back */
  onBack?: (currentStep: FTUEStep, prevStep: FTUEStep) => void
  /** Called when FTUE is complete */
  onComplete?: () => void
  /** Called when user skips the FTUE */
  onSkip?: () => void
  /** Override initial step */
  initialStep?: FTUEStep
  /** Whether to show skip option */
  showSkip?: boolean
  /** Custom workspace path */
  workspacePath?: string
  /** Called when workspace path changes */
  onWorkspacePathChange?: (path: string) => void
}

/**
 * Complete text-mode FTUE flow component
 *
 * Provides a fully accessible, keyboard-navigable FTUE experience:
 * - All voice scripts displayed as text
 * - Next/Back navigation buttons
 * - Keyboard shortcuts (arrow keys, Enter, Escape)
 * - VoiceOver compatible with proper ARIA attributes
 * - Reduced motion support
 * - Copyable command blocks
 * - Progress indicators
 *
 * Per Apple HIG for accessibility compliance.
 */
export function FTUETextModeFlow({
  setupState,
  onNext,
  onBack,
  onComplete,
  onSkip,
  initialStep,
  showSkip = true,
  workspacePath = '~/gt',
  onWorkspacePathChange,
}: FTUETextModeFlowProps) {
  const prefersReducedMotion = useReducedMotion()

  // Determine starting step based on setup state
  const determineInitialStep = useCallback((): FTUEStep => {
    if (initialStep) return initialStep

    // Skip to appropriate step based on what's already installed
    if (setupState.hasWorkspace) return 'complete'
    if (setupState.hasGt) return 'configure_workspace'
    if (setupState.hasBd) return 'install_gastown'
    if (setupState.hasGo) return 'install_beads'
    return 'welcome'
  }, [initialStep, setupState])

  const [currentStepId, setCurrentStepId] = useState<FTUEStep>(determineInitialStep)
  const [completedSteps, setCompletedSteps] = useState<FTUEStep[]>(() => {
    // Mark already-complete steps
    const completed: FTUEStep[] = []
    if (setupState.hasGo) completed.push('install_go')
    if (setupState.hasBd) completed.push('install_beads')
    if (setupState.hasGt) completed.push('install_gastown')
    return completed
  })

  // Get current step index and data
  const currentStepIndex = useMemo(
    () => TEXT_MODE_STEPS.findIndex((s) => s.id === currentStepId),
    [currentStepId]
  )

  const currentStep = TEXT_MODE_STEPS[currentStepIndex]
  const isLastStep = currentStepIndex === TEXT_MODE_STEPS.length - 1
  const isFirstStep = currentStepIndex === 0

  // Get voice script for current step
  const scriptText = useMemo(() => {
    const script = VOICE_SCRIPTS[currentStepId]
    if (!script) return ''

    // Check for platform-specific variants
    if (script.variants && setupState.platform) {
      if (setupState.platform === 'darwin' && setupState.hasHomebrew) {
        const variant = script.variants.find((v) => v.condition === 'darwin_homebrew')
        if (variant) return variant.text
      }

      const platformVariant = script.variants.find(
        (v) => v.condition === setupState.platform
      )
      if (platformVariant) return platformVariant.text
    }

    return script.text
  }, [currentStepId, setupState.platform, setupState.hasHomebrew])

  // Check if current step should be disabled based on detection
  const nextDisabled = useMemo(() => {
    if (!currentStep?.waitForDetection || !currentStep.detectionKey) {
      return false
    }
    return !setupState[currentStep.detectionKey]
  }, [currentStep, setupState])

  // Handle navigation
  const handleNext = useCallback(() => {
    if (nextDisabled) return

    const nextIndex = currentStepIndex + 1
    if (nextIndex >= TEXT_MODE_STEPS.length) {
      onComplete?.()
      return
    }

    const nextStepId = TEXT_MODE_STEPS[nextIndex].id

    // Mark current step as completed
    setCompletedSteps((prev) =>
      prev.includes(currentStepId) ? prev : [...prev, currentStepId]
    )

    setCurrentStepId(nextStepId)
    onNext?.(currentStepId, nextStepId)
  }, [currentStepIndex, currentStepId, nextDisabled, onNext, onComplete])

  const handleBack = useCallback(() => {
    if (isFirstStep) return

    const prevStepId = TEXT_MODE_STEPS[currentStepIndex - 1].id
    setCurrentStepId(prevStepId)
    onBack?.(currentStepId, prevStepId)
  }, [currentStepIndex, currentStepId, isFirstStep, onBack])

  // Copy command to clipboard
  const [copied, setCopied] = useState(false)
  const handleCopyCommand = useCallback(async () => {
    if (!currentStep?.command) return

    try {
      await navigator.clipboard.writeText(currentStep.command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access might fail in some contexts
    }
  }, [currentStep?.command])

  // Reset copied state when step changes
  useEffect(() => {
    setCopied(false)
  }, [currentStepId])

  // Convert steps for the indicator
  const indicatorSteps = useMemo(
    () =>
      TEXT_MODE_STEPS.map((step) => ({
        id: step.id,
        label: step.label,
        description: step.description,
      })),
    []
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Skip button */}
      {showSkip && !isLastStep && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={onSkip}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
          >
            Skip setup
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl">
          <TextModeContainer
            currentStepIndex={currentStepIndex}
            currentStep={currentStepId}
            steps={indicatorSteps}
            completedSteps={completedSteps}
            onNext={handleNext}
            onBack={handleBack}
            nextDisabled={nextDisabled}
            backDisabled={isFirstStep}
            indicatorStyle="dots"
            stepTitle={currentStep?.label}
            nextLabel={isLastStep ? 'Finish' : nextDisabled ? 'Waiting...' : 'Next'}
          >
            {/* Step content */}
            <div className="space-y-6">
              {/* Voice script as text */}
              {scriptText && (
                <VoiceScriptDisplay
                  text={scriptText}
                  title={currentStep?.label}
                  stepNumber={currentStepIndex + 1}
                  totalSteps={TEXT_MODE_STEPS.length}
                  isCurrent={true}
                />
              )}

              {/* Platform-specific install instructions for Go */}
              {currentStepId === 'install_go' && (
                <div className="mt-4">
                  <InstallInstructions
                    platform={setupState.platform}
                    hasHomebrew={setupState.hasHomebrew}
                  />
                </div>
              )}

              {/* Command block for Beads/Gas Town */}
              {currentStep?.command && (
                <div className="mt-4">
                  <CommandBlock
                    command={currentStep.command}
                    description={currentStep.commandDescription}
                  />
                </div>
              )}

              {/* PATH fix instructions if needed */}
              {(currentStepId === 'install_beads' || currentStepId === 'install_gastown') &&
                !setupState.pathIncludesGobin && (
                  <PathFixInstructions shell="zsh" />
                )}

              {/* Workspace configuration */}
              {currentStepId === 'configure_workspace' && (
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm text-slate-400 block mb-2">
                      Workspace directory:
                    </span>
                    <input
                      type="text"
                      value={workspacePath}
                      onChange={(e) => onWorkspacePathChange?.(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      aria-label="Workspace directory path"
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    This is where your Gas Town projects and agents will live.
                  </p>
                </div>
              )}

              {/* Completion celebration */}
              {currentStepId === 'complete' && (
                <div className="mt-6 text-center">
                  <div
                    className={`
                      inline-flex items-center justify-center w-16 h-16 mb-4
                      bg-green-600/20 rounded-full
                      ${!prefersReducedMotion ? 'animate-pulse' : ''}
                    `}
                  >
                    <svg
                      className="w-8 h-8 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    You're all set!
                  </h2>
                  <p className="text-slate-400">
                    Gas Town is ready. You can now add a project or start the Mayor.
                  </p>
                </div>
              )}

              {/* Detection status for waiting steps */}
              {currentStep?.waitForDetection && (
                <div
                  className="mt-4 flex items-center gap-2 text-sm"
                  role="status"
                  aria-live="polite"
                >
                  {nextDisabled ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin" />
                      <span className="text-slate-400">
                        Waiting for installation...
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-green-400">Detected! Ready to proceed.</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </TextModeContainer>
        </div>
      </div>
    </div>
  )
}

export default FTUETextModeFlow
