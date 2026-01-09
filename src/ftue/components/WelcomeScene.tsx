import { useEffect, useRef, useState, useCallback } from 'react'
import { Logo } from './Logo'
import { SetupChecklist } from './SetupChecklist'
import { MicrophoneIndicator } from './MicrophoneIndicator'
import { MusicToggle } from './MusicToggle'
import type { FTUEState } from '../types'
import { getChecklistFromSetup } from '../types'
import { useFTUEVoice } from '../../hooks/useFTUEVoice'
import { TELL_ME_MORE_SCRIPT } from '../voiceScripts'

interface WelcomeSceneProps {
  state: FTUEState
  onProceed: () => void
  onSkip: () => void
  onToggleVoice: () => void
  isListening?: boolean
}

/** Welcome Scene - First screen of FTUE */
export function WelcomeScene({
  state,
  onProceed,
  onSkip,
  onToggleVoice,
  isListening = false,
}: WelcomeSceneProps) {
  const checklist = getChecklistFromSetup(state.setupState)
  const hasPlayedRef = useRef(false)
  const [showTellMeMore, setShowTellMeMore] = useState(false)
  const [isSpeakingTellMeMore, setIsSpeakingTellMeMore] = useState(false)

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

  // Handle "tell me more" - speak via TTS if voice enabled, always show text
  const handleTellMeMore = useCallback(() => {
    setShowTellMeMore(true)

    // Use Web Speech API for TTS if voice is enabled
    if (state.voiceEnabled && window.speechSynthesis) {
      // Cancel any existing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(TELL_ME_MORE_SCRIPT)
      utterance.rate = 0.95
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // Try to get a good voice
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(
        (v) =>
          v.name.includes('Samantha') ||
          v.name.includes('Karen') ||
          v.name.includes('Google') ||
          v.lang.startsWith('en')
      )
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }

      utterance.onstart = () => setIsSpeakingTellMeMore(true)
      utterance.onend = () => setIsSpeakingTellMeMore(false)
      utterance.onerror = () => setIsSpeakingTellMeMore(false)

      window.speechSynthesis.speak(utterance)
    }
  }, [state.voiceEnabled])

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
          isSpeaking={isPlaying || isSpeakingTellMeMore}
          isListening={isListening}
          onToggle={onToggleVoice}
        />

        {/* Tell me more expanded content */}
        {showTellMeMore && (
          <div className="max-w-xl p-4 bg-slate-800/60 rounded-lg border border-slate-700 text-slate-300 text-sm leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="mb-3">
              Gas Town is an orchestration system for coding agents—think of it as a factory floor where multiple Claude Code instances work in parallel on your codebase.
            </p>
            <p>
              We need to install two command-line tools: <span className="text-slate-200">Beads</span>, which is a Git-backed issue tracker your agents will use, and <span className="text-slate-200">Gas Town</span> itself, which coordinates everything. Both are open source and install via Go.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={onProceed}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Let's get started
          </button>
          {!showTellMeMore && (
            <button
              onClick={handleTellMeMore}
              className="px-6 py-3 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-medium rounded-lg border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Tell me more
            </button>
          )}
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
