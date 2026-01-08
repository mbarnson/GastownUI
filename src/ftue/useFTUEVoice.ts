/**
 * FTUE Voice Hook
 *
 * Manages voice playback during FTUE flow.
 * Automatically speaks scripts on step transitions.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useVoiceInteraction, useVoiceServer } from '../hooks/useVoice'
import {
  getVoiceScript,
  DETECTION_SCRIPTS,
  TELL_ME_MORE_SCRIPT,
  ERROR_SCRIPTS,
  type VoiceScript,
} from './voiceScripts'
import type { FTUEStep, Platform } from './types'

export interface UseFTUEVoiceOptions {
  /** Current FTUE step */
  step: FTUEStep
  /** Whether voice is enabled */
  voiceEnabled: boolean
  /** Platform for platform-specific scripts */
  platform?: Platform
  /** Callback when voice finishes speaking */
  onSpeakComplete?: () => void
  /** Callback for voice response (when waiting for response) */
  onVoiceResponse?: (response: string) => void
}

export interface UseFTUEVoiceReturn {
  /** Whether voice is currently speaking */
  isSpeaking: boolean
  /** Whether voice server is ready */
  isReady: boolean
  /** Speak a custom text */
  speak: (text: string) => Promise<void>
  /** Speak detection success message */
  speakDetection: (type: 'go' | 'bd' | 'gt' | 'workspace', version?: string) => Promise<void>
  /** Speak error message */
  speakError: (errorType: keyof typeof ERROR_SCRIPTS, ...args: string[]) => Promise<void>
  /** Speak "tell me more" response */
  speakTellMeMore: () => Promise<void>
  /** Current error if any */
  error: string | null
}

/**
 * Hook for managing FTUE voice playback
 */
export function useFTUEVoice({
  step,
  voiceEnabled,
  platform,
  onSpeakComplete,
}: UseFTUEVoiceOptions): UseFTUEVoiceReturn {
  const { status } = useVoiceServer()
  const { speak: voiceSpeak, isProcessing, error } = useVoiceInteraction()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const lastSpokenStepRef = useRef<FTUEStep | null>(null)
  const speakingRef = useRef(false)

  const isReady = status?.ready ?? false

  // Internal speak function that handles state
  const speakText = useCallback(async (text: string) => {
    if (!voiceEnabled || !isReady || speakingRef.current) {
      return
    }

    try {
      speakingRef.current = true
      setIsSpeaking(true)
      await voiceSpeak(text)
    } catch (err) {
      console.error('FTUE voice error:', err)
    } finally {
      speakingRef.current = false
      setIsSpeaking(false)
      onSpeakComplete?.()
    }
  }, [voiceEnabled, isReady, voiceSpeak, onSpeakComplete])

  // Speak on step transitions
  useEffect(() => {
    if (!voiceEnabled || !isReady) {
      return
    }

    // Don't re-speak the same step
    if (lastSpokenStepRef.current === step) {
      return
    }

    const script = getVoiceScript(step, platform)
    if (!script) {
      return
    }

    lastSpokenStepRef.current = step

    // Apply delay if specified
    const delay = script.delay ?? 0
    const timeoutId = setTimeout(() => {
      speakText(script.text)
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [step, voiceEnabled, isReady, platform, speakText])

  // Public speak function
  const speak = useCallback(async (text: string) => {
    await speakText(text)
  }, [speakText])

  // Speak detection success
  const speakDetection = useCallback(async (
    type: 'go' | 'bd' | 'gt' | 'workspace',
    version?: string
  ) => {
    let text: string
    switch (type) {
      case 'go':
        text = DETECTION_SCRIPTS.goDetected(version || '')
        break
      case 'bd':
        text = DETECTION_SCRIPTS.beadsDetected(version || '')
        break
      case 'gt':
        text = DETECTION_SCRIPTS.gtDetected(version || '')
        break
      case 'workspace':
        text = DETECTION_SCRIPTS.workspaceCreated(version || '~/gt')
        break
    }
    await speakText(text)
  }, [speakText])

  // Speak error
  const speakError = useCallback(async (
    errorType: keyof typeof ERROR_SCRIPTS,
    ...args: string[]
  ) => {
    const scriptOrFn = ERROR_SCRIPTS[errorType]
    const text = typeof scriptOrFn === 'function'
      ? scriptOrFn(args[0])
      : scriptOrFn
    await speakText(text)
  }, [speakText])

  // Speak "tell me more"
  const speakTellMeMore = useCallback(async () => {
    await speakText(TELL_ME_MORE_SCRIPT)
  }, [speakText])

  return {
    isSpeaking: isSpeaking || isProcessing,
    isReady,
    speak,
    speakDetection,
    speakError,
    speakTellMeMore,
    error,
  }
}
