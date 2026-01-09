/**
 * FTUE Voice Input Recognition
 *
 * Listens for voice commands during FTUE, matches responses,
 * and handles silence timeouts as specified in FTUE.md.
 *
 * Expected responses per step:
 * - welcome: "let's go", "ready", "start", "tell me more", "skip"
 * - waiting steps: "done", "installed", "ready", "check again"
 * - configure_workspace: "that's fine", "yes", "somewhere else"
 * - complete: "add a project", "add rig", "start mayor", "dashboard"
 */

import { useCallback, useRef, useEffect, useState } from 'react'
import { useAudioRecorder, useVoiceInteraction, useVoiceServer } from '../hooks/useVoice'
import type { FTUEStep } from './types'

/** Recognized FTUE voice response types */
export type FTUEVoiceResponse =
  | 'proceed'       // "let's go", "ready", "start", "yes", "that's fine"
  | 'tell_me_more'  // "tell me more"
  | 'skip'          // "skip", "I'll do it later"
  | 'add_rig'       // "add a project", "add rig"
  | 'start_mayor'   // "start mayor", "start the mayor"
  | 'dashboard'     // "dashboard", "go to dashboard"
  | 'somewhere_else' // "somewhere else", "different location"
  | 'timeout'       // No response detected within timeout
  | 'unrecognized'  // Speech detected but not matched

/** Response patterns for each FTUE step */
const RESPONSE_PATTERNS: Record<FTUEStep, { pattern: RegExp; response: FTUEVoiceResponse }[]> = {
  welcome: [
    { pattern: /let'?s?\s*go|ready|start|begin/i, response: 'proceed' },
    { pattern: /tell\s*(me)?\s*more|what\s*is\s*it|explain/i, response: 'tell_me_more' },
    { pattern: /skip|later|no\s*thanks?|not\s*now/i, response: 'skip' },
  ],
  checking_prerequisites: [],
  install_go: [
    { pattern: /done|installed|ready|check|finished|got\s*it/i, response: 'proceed' },
    { pattern: /skip/i, response: 'skip' },
  ],
  waiting_for_go: [
    { pattern: /done|installed|ready|check|finished|got\s*it/i, response: 'proceed' },
    { pattern: /skip/i, response: 'skip' },
  ],
  install_beads: [
    { pattern: /done|installed|ready|check|finished|got\s*it/i, response: 'proceed' },
    { pattern: /skip/i, response: 'skip' },
  ],
  waiting_for_beads: [
    { pattern: /done|installed|ready|check|finished|got\s*it/i, response: 'proceed' },
    { pattern: /skip/i, response: 'skip' },
  ],
  install_gastown: [
    { pattern: /done|installed|ready|check|finished|got\s*it/i, response: 'proceed' },
    { pattern: /skip/i, response: 'skip' },
  ],
  waiting_for_gastown: [
    { pattern: /done|installed|ready|check|finished|got\s*it/i, response: 'proceed' },
    { pattern: /skip/i, response: 'skip' },
  ],
  configure_workspace: [
    { pattern: /that'?s?\s*fine|yes|ok(ay)?|sounds?\s*good|default|tilde\s*gt/i, response: 'proceed' },
    { pattern: /somewhere\s*else|different|change|custom|other/i, response: 'somewhere_else' },
    { pattern: /skip/i, response: 'skip' },
  ],
  creating_workspace: [],
  complete: [
    { pattern: /add\s*(a)?\s*(project|rig)|first\s*rig/i, response: 'add_rig' },
    { pattern: /start\s*(the)?\s*mayor|mayor/i, response: 'start_mayor' },
    { pattern: /dashboard|explore|look\s*around/i, response: 'dashboard' },
  ],
  add_first_rig: [
    { pattern: /skip|later|no\s*thanks?/i, response: 'skip' },
  ],
  start_mayor: [],
  skipped: [],
}

/** Default silence timeout in milliseconds */
const DEFAULT_SILENCE_TIMEOUT = 10000

export interface UseFTUEVoiceInputOptions {
  /** Current FTUE step */
  step: FTUEStep
  /** Whether voice input is enabled */
  enabled: boolean
  /** Silence timeout in ms (default: 10000) */
  silenceTimeout?: number
  /** Callback when a response is recognized */
  onResponse?: (response: FTUEVoiceResponse, rawText: string) => void
  /** Callback when listening state changes */
  onListeningChange?: (isListening: boolean) => void
}

export interface UseFTUEVoiceInputReturn {
  /** Whether currently listening for voice input */
  isListening: boolean
  /** Whether processing/transcribing audio */
  isProcessing: boolean
  /** Start listening for voice input */
  startListening: () => Promise<void>
  /** Stop listening and process audio */
  stopListening: () => Promise<void>
  /** Cancel listening without processing */
  cancelListening: () => void
  /** Last recognized text (for debugging) */
  lastTranscript: string | null
  /** Error if any */
  error: string | null
}

/**
 * Hook for FTUE voice input recognition
 *
 * Records user speech, transcribes it, and matches against
 * expected responses for the current FTUE step.
 */
export function useFTUEVoiceInput({
  step,
  enabled,
  silenceTimeout = DEFAULT_SILENCE_TIMEOUT,
  onResponse,
  onListeningChange,
}: UseFTUEVoiceInputOptions): UseFTUEVoiceInputReturn {
  const { status } = useVoiceServer()
  const { transcribe } = useVoiceInteraction()
  const recorder = useAudioRecorder()

  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isListeningRef = useRef(false)

  const isReady = status?.ready ?? false

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  // Match transcribed text against expected responses for current step
  const matchResponse = useCallback((text: string): FTUEVoiceResponse => {
    const patterns = RESPONSE_PATTERNS[step] || []

    for (const { pattern, response } of patterns) {
      if (pattern.test(text)) {
        return response
      }
    }

    // If we got text but no match, it's unrecognized
    if (text.trim().length > 0) {
      return 'unrecognized'
    }

    return 'timeout'
  }, [step])

  // Process recorded audio
  const processAudio = useCallback(async (audioBase64: string) => {
    if (!isReady) {
      setError('Voice server not ready')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const transcript = await transcribe(audioBase64)
      setLastTranscript(transcript)

      const response = matchResponse(transcript)
      onResponse?.(response, transcript)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transcription failed'
      setError(message)
      // On error, treat as timeout so UI can recover
      onResponse?.('timeout', '')
    } finally {
      setIsProcessing(false)
    }
  }, [isReady, transcribe, matchResponse, onResponse])

  // Start listening for voice input
  const startListening = useCallback(async () => {
    if (!enabled || isListeningRef.current || !isReady) {
      return
    }

    setError(null)
    clearSilenceTimer()

    try {
      await recorder.startRecording()
      isListeningRef.current = true
      setIsListening(true)
      onListeningChange?.(true)

      // Start silence timeout
      silenceTimerRef.current = setTimeout(() => {
        if (isListeningRef.current) {
          // Silence timeout - stop and process what we have
          stopListening()
        }
      }, silenceTimeout)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording'
      setError(message)
      // On mic access failure, treat as timeout
      onResponse?.('timeout', '')
    }
  }, [enabled, isReady, recorder, silenceTimeout, onListeningChange, onResponse, clearSilenceTimer])

  // Stop listening and process audio
  const stopListening = useCallback(async () => {
    if (!isListeningRef.current) {
      return
    }

    clearSilenceTimer()
    recorder.stopRecording()
    isListeningRef.current = false
    setIsListening(false)
    onListeningChange?.(false)

    // Wait a tick for audioBase64 to be set
    await new Promise(resolve => setTimeout(resolve, 100))

    if (recorder.audioBase64) {
      await processAudio(recorder.audioBase64)
      recorder.clearRecording()
    } else {
      // No audio captured, treat as timeout
      onResponse?.('timeout', '')
    }
  }, [recorder, processAudio, onResponse, clearSilenceTimer, onListeningChange])

  // Cancel listening without processing
  const cancelListening = useCallback(() => {
    clearSilenceTimer()
    if (isListeningRef.current) {
      recorder.stopRecording()
      recorder.clearRecording()
      isListeningRef.current = false
      setIsListening(false)
      onListeningChange?.(false)
    }
  }, [recorder, clearSilenceTimer, onListeningChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimer()
      if (isListeningRef.current) {
        recorder.stopRecording()
      }
    }
  }, [clearSilenceTimer, recorder])

  // Stop listening when step changes
  useEffect(() => {
    if (isListeningRef.current) {
      cancelListening()
    }
  }, [step, cancelListening])

  return {
    isListening,
    isProcessing,
    startListening,
    stopListening,
    cancelListening,
    lastTranscript,
    error,
  }
}

/**
 * Check if a step expects voice responses
 */
export function stepExpectsVoiceInput(step: FTUEStep): boolean {
  const patterns = RESPONSE_PATTERNS[step]
  return patterns && patterns.length > 0
}

/**
 * Get the expected responses for a step (for UI hints)
 */
export function getExpectedResponses(step: FTUEStep): string[] {
  switch (step) {
    case 'welcome':
      return ["let's go", 'tell me more', 'skip']
    case 'install_go':
    case 'waiting_for_go':
    case 'install_beads':
    case 'waiting_for_beads':
    case 'install_gastown':
    case 'waiting_for_gastown':
      return ['done', 'installed', 'ready']
    case 'configure_workspace':
      return ["that's fine", 'yes', 'somewhere else']
    case 'complete':
      return ['add a project', 'start mayor', 'dashboard']
    default:
      return []
  }
}
