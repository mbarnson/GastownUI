import { useEffect, useRef } from 'react'
import { Logo } from './Logo'
import { SetupChecklist } from './SetupChecklist'
import { MicrophoneIndicator } from './MicrophoneIndicator'
import { MusicToggle } from './MusicToggle'
import type { FTUEState } from '../types'
import { getChecklistFromSetup } from '../types'
import { useFTUEVoice } from '../../hooks/useFTUEVoice'

interface WelcomeSceneProps {
  state: FTUEState
  onProceed: () => void
  onSkip: () => void
  onToggleVoice: () => void
}

/** Welcome Scene - First screen of FTUE */
export function WelcomeScene({
  state,
  onProceed,
  onSkip,
  onToggleVoice,
}: WelcomeSceneProps) {
  const checklist = getChecklistFromSetup(state.setupState)
  const hasPlayedRef = useRef(false)

  // Initialize FTUE voice - plays welcome clip on mount
  const { playClip, isPlaying, isLoading } = useFTUEVoice({
    onClipEnd: (clipId) => {
      if (clipId === 'welcome') {
        // After welcome clip, could auto-advance or wait for user
      }
    },
    onError: (error) => {
      console.warn('FTUE voice error:', error)
    },
  })

  // Play welcome clip on mount (once)
  useEffect(() => {
    if (!isLoading && state.voiceEnabled && !hasPlayedRef.current) {
      hasPlayedRef.current = true
      // Small delay for smoother UX
      const timer = setTimeout(() => {
        playClip('welcome').catch(() => {
          // Error handled in useFTUEVoice
        })
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [isLoading, state.voiceEnabled, playClip])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col relative">
      {/* Music toggle - top right */}
      <MusicToggle className="absolute top-4 right-4 z-10" />

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
        {/* Logo and tagline */}
        <div className="text-center">
          <Logo size="lg" />
          <p className="mt-4 text-xl text-slate-400">
            Welcome to the factory.
          </p>
        </div>

        {/* Checklist */}
        <SetupChecklist items={checklist} />

        {/* Voice indicator */}
        <MicrophoneIndicator
          enabled={state.voiceEnabled}
          isSpeaking={isPlaying}
          onToggle={onToggleVoice}
        />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={onProceed}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Let's get started
          </button>
          <button
            onClick={onSkip}
            className="px-6 py-3 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium rounded-lg border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Skip setup
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-600">
        <p>
          Gas Town orchestrates AI coding agents. Setup takes about 5 minutes.
        </p>
      </footer>
    </div>
  )
}
