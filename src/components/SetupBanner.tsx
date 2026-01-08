import { useState, useEffect } from 'react'
import { AlertTriangle, X, ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'

const BANNER_DISMISSED_KEY = 'gastownui-setup-banner-dismissed'

interface SetupBannerProps {
  /** Whether Gas Town setup is complete */
  isSetupComplete: boolean
}

/** Persistent banner shown when Gas Town setup is incomplete */
export function SetupBanner({ isSetupComplete }: SetupBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true) // Default hidden to avoid flash

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === 'true'
    setIsDismissed(dismissed)
  }, [])

  // Don't show if setup is complete or banner is dismissed
  if (isSetupComplete || isDismissed) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true')
  }

  return (
    <div className="bg-amber-900/30 border-b border-amber-700/50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-200">
              <span className="font-medium">Gas Town not configured.</span>{' '}
              <span className="text-amber-300/80">
                Complete setup to enable all features.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/ftue"
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-100 bg-amber-700/50 hover:bg-amber-600/50 rounded-lg transition-colors"
            >
              Complete setup
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-amber-400 hover:text-amber-200 hover:bg-amber-800/50 rounded transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Hook to check if setup banner should be shown */
export function useSetupBannerDismissed(): boolean {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem(BANNER_DISMISSED_KEY) === 'true')
  }, [])

  return dismissed
}

/** Reset the banner dismissal (for testing or re-prompting) */
export function resetSetupBanner(): void {
  localStorage.removeItem(BANNER_DISMISSED_KEY)
}
