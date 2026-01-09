import { Logo } from './Logo'
import type { FTUEState, DiskSpaceInfo } from '../types'

interface VoiceModelConsentScreenProps {
  state: FTUEState
  onEnableVoice: () => void
  onSkipVoice: () => void
}

/**
 * Voice Model Consent Screen - First screen of FTUE
 * Users choose between voice-guided experience or text-only mode
 */
export function VoiceModelConsentScreen({
  state,
  onEnableVoice,
  onSkipVoice,
}: VoiceModelConsentScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <Logo size="lg" />

      {/* Consent card */}
      <div className="mt-8 w-full max-w-lg bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
        {/* Microphone icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-100 text-center mb-4">
          Voice-Guided Experience
        </h2>

        {/* Description */}
        <p className="text-slate-400 text-center mb-6 leading-relaxed">
          Gas Town works best with voice. I can guide you through setup, answer
          questions, and help manage your convoys hands-free.
        </p>

        {/* Download size notice */}
        <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-500 text-center">
            This requires downloading a voice model{' '}
            <span className="text-slate-400 font-medium">(~2-3GB)</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onEnableVoice}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Enable Voice
          </button>
          <button
            onClick={onSkipVoice}
            className="w-full px-6 py-4 bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 font-medium rounded-lg border border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Skip (text-only)
          </button>
        </div>

        {/* Settings hint */}
        <p className="mt-4 text-xs text-slate-500 text-center">
          You can enable voice later in Settings
        </p>
      </div>
    </div>
  )
}

interface CheckingDiskSpaceScreenProps {
  message?: string
}

/**
 * Checking Disk Space Screen - Shown while checking available disk space
 */
export function CheckingDiskSpaceScreen({
  message = 'Checking available disk space...',
}: CheckingDiskSpaceScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-6 py-12">
      <Logo size="md" />

      <div className="mt-8 text-center">
        {/* Spinner */}
        <div className="flex justify-center mb-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-slate-400">{message}</p>
      </div>
    </div>
  )
}

interface InsufficientSpaceScreenProps {
  diskSpaceInfo: DiskSpaceInfo
  onCheckAgain: () => void
  onUseTextMode: () => void
}

/**
 * Insufficient Space Screen - Shown when there's not enough disk space for voice model
 */
export function InsufficientSpaceScreen({
  diskSpaceInfo,
  onCheckAgain,
  onUseTextMode,
}: InsufficientSpaceScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-6 py-12">
      <Logo size="md" />

      {/* Warning card */}
      <div className="mt-8 w-full max-w-lg bg-amber-900/20 rounded-2xl border border-amber-700/50 p-8">
        {/* Warning icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-600/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-amber-300 text-center mb-4">
          Not Enough Space
        </h2>

        {/* Description */}
        <p className="text-slate-300 text-center mb-6">
          Voice mode needs about{' '}
          <span className="font-medium text-amber-300">{diskSpaceInfo.requiredHuman}</span>{' '}
          free, but you only have{' '}
          <span className="font-medium text-slate-200">{diskSpaceInfo.availableHuman}</span>{' '}
          available.
        </p>

        {/* Options */}
        <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-400 mb-2">You can:</p>
          <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
            <li>Free up some space and try again</li>
            <li>Continue with text-only mode</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onCheckAgain}
            className="w-full px-6 py-4 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Check Again
          </button>
          <button
            onClick={onUseTextMode}
            className="w-full px-6 py-4 bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 font-medium rounded-lg border border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Use Text Mode
          </button>
        </div>
      </div>
    </div>
  )
}
