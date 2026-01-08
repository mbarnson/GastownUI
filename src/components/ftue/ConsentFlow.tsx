import { useState, useEffect } from 'react'
import { Check, Shield, Volume2, BarChart3, ChevronRight, Mic } from 'lucide-react'
import { useFTUE, defaultConsents, ConsentItem } from '../../contexts/FTUEContext'
import { useLiveRegion } from '../a11y/LiveRegion'
import { StagedReveal, TypewriterText } from './TheatricalTransition'

interface ConsentFlowProps {
  /** Called when all required consents are accepted and user proceeds */
  onComplete?: () => void
  /** Whether to show voice hints */
  showVoiceHints?: boolean
}

/**
 * Consent flow for FTUE
 * Presents terms, privacy, voice features, and analytics consents
 */
export default function ConsentFlow({
  onComplete,
  showVoiceHints = true,
}: ConsentFlowProps) {
  const {
    state,
    setConsent,
    initializeConsents,
    nextStage,
    touchInteraction,
  } = useFTUE()
  const { announce } = useLiveRegion()
  const [showHeader, setShowHeader] = useState(false)

  // Initialize consents on mount
  useEffect(() => {
    if (state.consents.length === 0) {
      initializeConsents(defaultConsents)
    }
    // Show header after brief delay
    const timer = setTimeout(() => setShowHeader(true), 300)
    return () => clearTimeout(timer)
  }, [state.consents.length, initializeConsents])

  const handleConsentToggle = (consent: ConsentItem) => {
    touchInteraction()
    const newValue = !consent.accepted

    setConsent(consent.id, newValue)

    // Announce change for screen readers
    announce(
      newValue
        ? `${consent.title} accepted`
        : `${consent.title} declined`
    )
  }

  const handleContinue = () => {
    if (!state.allRequiredConsentsAccepted) {
      announce('Please accept all required consents to continue')
      return
    }

    touchInteraction()
    announce('Consents confirmed, proceeding to setup')
    nextStage()
    onComplete?.()
  }

  const getConsentIcon = (id: string) => {
    switch (id) {
      case 'terms':
      case 'privacy':
        return <Shield className="w-5 h-5" />
      case 'voice':
        return <Volume2 className="w-5 h-5" />
      case 'analytics':
        return <BarChart3 className="w-5 h-5" />
      default:
        return <Shield className="w-5 h-5" />
    }
  }

  const requiredCount = state.consents.filter(c => c.required).length
  const acceptedRequiredCount = state.consents.filter(c => c.required && c.accepted).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-xl w-full">
        {/* Header */}
        <div
          className={`
            text-center mb-8
            transition-all duration-500
            ${showHeader ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            <TypewriterText text="Before we begin..." speed={40} />
          </h1>
          <p className="text-slate-400">
            Review and accept the following to continue
          </p>
        </div>

        {/* Voice hint */}
        {showVoiceHints && (
          <div className="flex items-center justify-center gap-2 mb-6 text-slate-500 text-sm">
            <Mic className="w-4 h-4" />
            <span>Say &quot;Accept all&quot; or tap to review individually</span>
          </div>
        )}

        {/* Consent items */}
        <StagedReveal
          staggerDelay={150}
          initialDelay={500}
          containerClassName="space-y-3 mb-8"
          itemClassName="w-full"
        >
          {state.consents.map((consent) => (
            <button
              key={consent.id}
              onClick={() => handleConsentToggle(consent)}
              className={`
                w-full flex items-start gap-4 p-4 rounded-xl border
                transition-all duration-200
                ${
                  consent.accepted
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }
              `}
              aria-pressed={consent.accepted}
            >
              {/* Icon */}
              <div
                className={`
                  mt-0.5
                  ${consent.accepted ? 'text-green-400' : 'text-slate-400'}
                `}
              >
                {getConsentIcon(consent.id)}
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h3
                    className={`
                      font-medium
                      ${consent.accepted ? 'text-green-400' : 'text-white'}
                    `}
                  >
                    {consent.title}
                  </h3>
                  {consent.required && (
                    <span className="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  {consent.description}
                </p>
              </div>

              {/* Checkbox */}
              <div
                className={`
                  w-6 h-6 rounded-md border-2 flex items-center justify-center
                  transition-all duration-200
                  ${
                    consent.accepted
                      ? 'bg-green-500 border-green-500'
                      : 'bg-transparent border-slate-600'
                  }
                `}
              >
                {consent.accepted && <Check className="w-4 h-4 text-white" />}
              </div>
            </button>
          ))}
        </StagedReveal>

        {/* Progress indicator */}
        {requiredCount > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
              <span>Required consents</span>
              <span>
                {acceptedRequiredCount} of {requiredCount}
              </span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{
                  width: `${(acceptedRequiredCount / requiredCount) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!state.allRequiredConsentsAccepted}
          className={`
            w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl
            font-medium transition-all duration-300
            ${
              state.allRequiredConsentsAccepted
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          <span>Continue</span>
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Skip hint for optional consents */}
        <p className="text-center text-sm text-slate-500 mt-4">
          Optional features can be enabled later in settings
        </p>
      </div>
    </div>
  )
}

/**
 * Quick consent banner for returning users
 */
interface QuickConsentBannerProps {
  onAccept: () => void
  onDecline: () => void
}

export function QuickConsentBanner({ onAccept, onDecline }: QuickConsentBannerProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 p-4 bg-slate-900/95 backdrop-blur border-t border-slate-800">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-cyan-400" />
          <p className="text-sm text-slate-300">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
