import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Audio capture mode
 */
export type CaptureMode = 'push-to-talk' | 'always-listening'

/**
 * Audio capture state
 */
export interface AudioCaptureState {
  /** Whether currently recording */
  isRecording: boolean
  /** Whether in always-listening mode */
  isListening: boolean
  /** Current audio level (0-1) */
  audioLevel: number
  /** Peak audio level (0-1), resets after decay */
  peakLevel: number
  /** Recording duration in seconds */
  duration: number
  /** Whether voice activity is detected */
  isSpeaking: boolean
  /** Last captured audio as base64 */
  audioBase64: string | null
  /** Error message if any */
  error: string | null
  /** Current capture mode */
  mode: CaptureMode
}

/**
 * Audio capture settings
 */
export interface AudioCaptureSettings {
  /** Sample rate in Hz (default: 16000) */
  sampleRate?: number
  /** Enable echo cancellation (default: true) */
  echoCancellation?: boolean
  /** Enable noise suppression (default: true) */
  noiseSuppression?: boolean
  /** Voice activity detection threshold (0-1, default: 0.02) */
  vadThreshold?: number
  /** Silence duration to stop recording in always-listening mode (ms, default: 1500) */
  silenceTimeout?: number
  /** Minimum recording duration (ms, default: 500) */
  minDuration?: number
  /** Maximum recording duration (ms, default: 30000) */
  maxDuration?: number
}

const DEFAULT_SETTINGS: Required<AudioCaptureSettings> = {
  sampleRate: 16000,
  echoCancellation: true,
  noiseSuppression: true,
  vadThreshold: 0.02,
  silenceTimeout: 1500,
  minDuration: 500,
  maxDuration: 30000,
}

const CAPTURE_SETTINGS_KEY = 'gastownui-audio-capture-settings'

/**
 * Get audio capture settings from localStorage
 */
export function getAudioCaptureSettings(): Required<AudioCaptureSettings> {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS

  try {
    const stored = localStorage.getItem(CAPTURE_SETTINGS_KEY)
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS
}

/**
 * Save audio capture settings to localStorage
 */
export function saveAudioCaptureSettings(
  settings: Partial<AudioCaptureSettings>
): void {
  if (typeof localStorage === 'undefined') return

  const current = getAudioCaptureSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem(CAPTURE_SETTINGS_KEY, JSON.stringify(updated))
}

/**
 * Enhanced audio capture hook with:
 * - Push-to-talk mode (spacebar/button)
 * - Always-listening mode with voice activity detection
 * - Real-time audio level monitoring
 * - Peak level indicator
 * - Automatic silence detection
 *
 * @example
 * ```tsx
 * function VoiceRecorder() {
 *   const {
 *     isRecording,
 *     audioLevel,
 *     startRecording,
 *     stopRecording,
 *     toggleMode,
 *   } = useAudioCapture()
 *
 *   return (
 *     <div>
 *       <AudioLevelIndicator level={audioLevel} />
 *       <button
 *         onMouseDown={startRecording}
 *         onMouseUp={stopRecording}
 *       >
 *         {isRecording ? 'Recording...' : 'Hold to talk'}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAudioCapture(
  initialSettings?: AudioCaptureSettings,
  onRecordingComplete?: (audioBase64: string, duration: number) => void
) {
  const settings = { ...DEFAULT_SETTINGS, ...initialSettings }

  const [state, setState] = useState<AudioCaptureState>({
    isRecording: false,
    isListening: false,
    audioLevel: 0,
    peakLevel: 0,
    duration: 0,
    isSpeaking: false,
    audioBase64: null,
    error: null,
    mode: 'push-to-talk',
  })

  // Refs for audio processing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number>(0)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const peakDecayRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
    }
    if (peakDecayRef.current) {
      clearInterval(peakDecayRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close()
    }
  }, [])

  // Audio level monitoring
  const startLevelMonitoring = useCallback(() => {
    if (!analyserRef.current) return

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    // Peak decay
    peakDecayRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        peakLevel: Math.max(0, prev.peakLevel - 0.02),
      }))
    }, 50)

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray)

      // Calculate RMS level
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / dataArray.length) / 255
      const level = Math.min(1, rms * 2) // Amplify for visibility

      // Check for speech
      const isSpeaking = level > settings.vadThreshold

      setState((prev) => ({
        ...prev,
        audioLevel: level,
        peakLevel: Math.max(prev.peakLevel, level),
        isSpeaking,
      }))

      animationFrameRef.current = requestAnimationFrame(updateLevel)
    }

    updateLevel()
  }, [settings.vadThreshold])

  // Initialize audio stream
  const initializeStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: settings.sampleRate,
          channelCount: 1,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
        },
      })

      streamRef.current = stream

      // Set up audio context and analyser for level monitoring
      const audioContext = new AudioContext({ sampleRate: settings.sampleRate })
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      return stream
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access microphone'
      setState((prev) => ({ ...prev, error: message }))
      throw err
    }
  }, [settings])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }))
      chunksRef.current = []

      // Get or create stream
      let stream = streamRef.current
      if (!stream || stream.getTracks()[0]?.readyState !== 'live') {
        stream = await initializeStream()
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' })

        // Convert to WAV
        const wavBlob = await convertToWav(webmBlob, settings.sampleRate)
        const base64 = await blobToBase64(wavBlob)

        const duration = (Date.now() - startTimeRef.current) / 1000

        setState((prev) => ({
          ...prev,
          audioBase64: base64,
          isRecording: false,
        }))

        // Callback with captured audio
        if (duration >= settings.minDuration / 1000) {
          onRecordingComplete?.(base64, duration)
        }
      }

      mediaRecorder.start(100)
      startTimeRef.current = Date.now()

      setState((prev) => ({ ...prev, isRecording: true, duration: 0 }))

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        setState((prev) => ({ ...prev, duration: elapsed }))

        // Auto-stop at max duration
        if (elapsed * 1000 >= settings.maxDuration) {
          stopRecording()
        }
      }, 100)

      // Start level monitoring
      startLevelMonitoring()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording'
      setState((prev) => ({ ...prev, error: message }))
    }
  }, [initializeStream, settings, onRecordingComplete, startLevelMonitoring])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (peakDecayRef.current) {
      clearInterval(peakDecayRef.current)
      peakDecayRef.current = null
    }

    setState((prev) => ({
      ...prev,
      isRecording: false,
      audioLevel: 0,
      peakLevel: 0,
    }))
  }, [])

  // Start always-listening mode
  const startListening = useCallback(async () => {
    try {
      await initializeStream()
      startLevelMonitoring()

      setState((prev) => ({
        ...prev,
        isListening: true,
        mode: 'always-listening',
      }))

      // Voice activity detection for auto-recording
      let wasSpeak = false

      const checkVAD = () => {
        if (!state.isListening) return

        if (state.isSpeaking && !wasSpeak && !state.isRecording) {
          // Started speaking - begin recording
          startRecording()
          wasSpeak = true

          // Clear any pending silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current)
          }
        } else if (!state.isSpeaking && wasSpeak && state.isRecording) {
          // Stopped speaking - wait for silence timeout
          silenceTimeoutRef.current = setTimeout(() => {
            stopRecording()
            wasSpeak = false
          }, settings.silenceTimeout)
        } else if (state.isSpeaking && wasSpeak) {
          // Still speaking - clear any pending timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current)
          }
        }
      }

      const vadInterval = setInterval(checkVAD, 100)
      return () => clearInterval(vadInterval)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start listening'
      setState((prev) => ({ ...prev, error: message }))
    }
  }, [initializeStream, startLevelMonitoring, startRecording, stopRecording, state, settings.silenceTimeout])

  // Stop always-listening mode
  const stopListening = useCallback(() => {
    if (state.isRecording) {
      stopRecording()
    }
    cleanup()

    setState((prev) => ({
      ...prev,
      isListening: false,
      audioLevel: 0,
      peakLevel: 0,
    }))
  }, [state.isRecording, stopRecording, cleanup])

  // Toggle capture mode
  const toggleMode = useCallback(() => {
    if (state.mode === 'push-to-talk') {
      setState((prev) => ({ ...prev, mode: 'always-listening' }))
    } else {
      if (state.isListening) {
        stopListening()
      }
      setState((prev) => ({ ...prev, mode: 'push-to-talk' }))
    }
  }, [state.mode, state.isListening, stopListening])

  // Clear audio data
  const clearRecording = useCallback(() => {
    setState((prev) => ({
      ...prev,
      audioBase64: null,
      duration: 0,
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    ...state,
    startRecording,
    stopRecording,
    startListening,
    stopListening,
    toggleMode,
    clearRecording,
  }
}

// Utility: Convert audio blob to WAV format
async function convertToWav(blob: Blob, sampleRate: number): Promise<Blob> {
  const audioContext = new AudioContext({ sampleRate })
  const arrayBuffer = await blob.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const channelData = audioBuffer.getChannelData(0)
  const wavBuffer = encodeWav(channelData, sampleRate)
  audioContext.close()

  return new Blob([wavBuffer], { type: 'audio/wav' })
}

// Encode PCM data as WAV
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * 2, true)

  // Write samples
  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return buffer
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

// Convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
