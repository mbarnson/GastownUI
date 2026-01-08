import { useCallback, useEffect } from 'react'
import { Mic, MicOff, Radio, Square, Settings } from 'lucide-react'
import { useAudioCapture, type CaptureMode } from '../hooks/useAudioCapture'

interface AudioLevelIndicatorProps {
  /** Current audio level (0-1) */
  level: number
  /** Peak level (0-1) */
  peakLevel?: number
  /** Whether voice is detected */
  isSpeaking?: boolean
  /** Indicator style */
  variant?: 'bar' | 'circle' | 'dots'
  /** Size in pixels (for circle/dots) or height (for bar) */
  size?: number
  /** Optional class name */
  className?: string
}

/**
 * Audio level indicator with multiple visualization styles
 *
 * @example
 * ```tsx
 * <AudioLevelIndicator level={0.5} variant="bar" />
 * <AudioLevelIndicator level={0.7} variant="circle" isSpeaking />
 * <AudioLevelIndicator level={0.3} variant="dots" peakLevel={0.8} />
 * ```
 */
export function AudioLevelIndicator({
  level,
  peakLevel = 0,
  isSpeaking = false,
  variant = 'bar',
  size = 4,
  className = '',
}: AudioLevelIndicatorProps) {
  const levelPercent = Math.round(level * 100)
  const peakPercent = Math.round(peakLevel * 100)

  if (variant === 'bar') {
    return (
      <div
        className={`relative w-full bg-slate-800 rounded-full overflow-hidden ${className}`}
        style={{ height: size }}
        role="meter"
        aria-valuenow={levelPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Audio level"
      >
        {/* Current level */}
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-75 rounded-full ${
            isSpeaking ? 'bg-emerald-500' : 'bg-blue-500'
          }`}
          style={{ width: `${levelPercent}%` }}
        />
        {/* Peak indicator */}
        {peakPercent > 0 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-white/50 transition-all duration-150"
            style={{ left: `${peakPercent}%` }}
          />
        )}
      </div>
    )
  }

  if (variant === 'circle') {
    const ringSize = size * 2
    const strokeWidth = 3
    const radius = (ringSize - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - level)

    return (
      <div
        className={`relative ${className}`}
        style={{ width: ringSize, height: ringSize }}
      >
        <svg
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-700"
          />
          {/* Level ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-75 ${
              isSpeaking ? 'text-emerald-500' : 'text-blue-500'
            }`}
          />
        </svg>
        {/* Center dot for speaking */}
        {isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>
        )}
      </div>
    )
  }

  // Dots variant
  const dotCount = 5
  const activeDots = Math.ceil(level * dotCount)

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: dotCount }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-75 ${
            i < activeDots
              ? isSpeaking
                ? 'bg-emerald-500'
                : 'bg-blue-500'
              : 'bg-slate-700'
          }`}
          style={{
            width: size,
            height: size + (i < activeDots ? i * 2 : 0),
          }}
        />
      ))}
    </div>
  )
}

interface AudioCaptureControlsProps {
  /** Callback when recording completes */
  onRecordingComplete?: (audioBase64: string, duration: number) => void
  /** Optional class name */
  className?: string
  /** Show mode toggle */
  showModeToggle?: boolean
  /** Show settings button */
  showSettings?: boolean
  /** Callback for settings button */
  onSettingsClick?: () => void
}

/**
 * Full audio capture control panel with:
 * - Push-to-talk button (hold to record)
 * - Always-listening mode toggle
 * - Audio level indicator
 * - Recording duration display
 *
 * @example
 * ```tsx
 * <AudioCaptureControls
 *   onRecordingComplete={(audio, duration) => sendToServer(audio)}
 * />
 * ```
 */
export function AudioCaptureControls({
  onRecordingComplete,
  className = '',
  showModeToggle = true,
  showSettings = false,
  onSettingsClick,
}: AudioCaptureControlsProps) {
  const {
    isRecording,
    isListening,
    audioLevel,
    peakLevel,
    duration,
    isSpeaking,
    error,
    mode,
    startRecording,
    stopRecording,
    startListening,
    stopListening,
    toggleMode,
  } = useAudioCapture(undefined, onRecordingComplete)

  // Keyboard handler for spacebar push-to-talk
  useEffect(() => {
    if (mode !== 'push-to-talk') return

    let isHolding = false

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isHolding) {
        e.preventDefault()
        isHolding = true
        startRecording()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isHolding) {
        e.preventDefault()
        isHolding = false
        stopRecording()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [mode, startRecording, stopRecording])

  const handleRecordStart = useCallback(() => {
    if (mode === 'push-to-talk') {
      startRecording()
    }
  }, [mode, startRecording])

  const handleRecordEnd = useCallback(() => {
    if (mode === 'push-to-talk' && isRecording) {
      stopRecording()
    }
  }, [mode, isRecording, stopRecording])

  const handleListeningToggle = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error display */}
      {error && (
        <div className="p-2 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Mode toggle */}
      {showModeToggle && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Capture Mode</span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (mode !== 'push-to-talk') toggleMode()
              }}
              className={`px-3 py-1.5 text-xs rounded-l-lg transition-colors ${
                mode === 'push-to-talk'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              Push to Talk
            </button>
            <button
              onClick={() => {
                if (mode !== 'always-listening') toggleMode()
              }}
              className={`px-3 py-1.5 text-xs rounded-r-lg transition-colors ${
                mode === 'always-listening'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              Always Listen
            </button>
          </div>
        </div>
      )}

      {/* Audio level indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Level</span>
          {(isRecording || isListening) && (
            <span className={isSpeaking ? 'text-emerald-400' : ''}>
              {isSpeaking ? 'Speaking' : 'Listening'}
            </span>
          )}
        </div>
        <AudioLevelIndicator
          level={audioLevel}
          peakLevel={peakLevel}
          isSpeaking={isSpeaking}
          variant="bar"
          size={6}
        />
      </div>

      {/* Main control button */}
      <div className="flex items-center justify-center gap-4">
        {mode === 'push-to-talk' ? (
          <button
            onMouseDown={handleRecordStart}
            onMouseUp={handleRecordEnd}
            onMouseLeave={handleRecordEnd}
            onTouchStart={handleRecordStart}
            onTouchEnd={handleRecordEnd}
            className={`relative w-16 h-16 rounded-full border-3 transition-all ${
              isRecording
                ? 'bg-red-600 border-red-500 text-white animate-pulse'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400'
            }`}
          >
            <div className="flex flex-col items-center justify-center">
              {isRecording ? (
                <>
                  <Square className="w-5 h-5" />
                  <span className="text-xs mt-0.5">{duration.toFixed(1)}s</span>
                </>
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </div>
          </button>
        ) : (
          <button
            onClick={handleListeningToggle}
            className={`relative w-16 h-16 rounded-full border-3 transition-all ${
              isListening
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-emerald-400'
            }`}
          >
            <div className="flex flex-col items-center justify-center">
              {isListening ? (
                <>
                  <Radio className="w-5 h-5 animate-pulse" />
                  {isRecording && (
                    <span className="text-xs mt-0.5">{duration.toFixed(1)}s</span>
                  )}
                </>
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </div>
          </button>
        )}

        {showSettings && (
          <button
            onClick={onSettingsClick}
            className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Hint text */}
      <p className="text-center text-xs text-slate-500">
        {mode === 'push-to-talk'
          ? isRecording
            ? 'Release to send'
            : 'Hold Space or click to talk'
          : isListening
            ? isRecording
              ? 'Recording... (stops on silence)'
              : 'Waiting for speech...'
            : 'Click to start listening'}
      </p>
    </div>
  )
}

/**
 * Compact microphone button with level ring
 *
 * @example
 * ```tsx
 * <MicButton
 *   isRecording={isRecording}
 *   level={audioLevel}
 *   onPress={startRecording}
 *   onRelease={stopRecording}
 * />
 * ```
 */
export function MicButton({
  isRecording,
  level,
  isSpeaking,
  duration,
  onPress,
  onRelease,
  disabled,
  className = '',
}: {
  isRecording: boolean
  level: number
  isSpeaking?: boolean
  duration?: number
  onPress: () => void
  onRelease: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={`relative inline-block ${className}`}>
      {/* Level ring */}
      <AudioLevelIndicator
        level={isRecording ? level : 0}
        isSpeaking={isSpeaking}
        variant="circle"
        size={36}
      />

      {/* Button */}
      <button
        onMouseDown={onPress}
        onMouseUp={onRelease}
        onMouseLeave={onRelease}
        onTouchStart={onPress}
        onTouchEnd={onRelease}
        disabled={disabled}
        className={`absolute inset-2 rounded-full flex items-center justify-center transition-all ${
          isRecording
            ? 'bg-red-600 text-white'
            : disabled
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
      >
        {isRecording ? (
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 bg-white rounded-sm" />
            {duration !== undefined && (
              <span className="text-xs mt-0.5">{duration.toFixed(1)}</span>
            )}
          </div>
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  )
}
