import { Mic, MicOff, Volume2 } from 'lucide-react'

interface MicrophoneIndicatorProps {
  enabled: boolean
  isListening?: boolean
  isSpeaking?: boolean
  onToggle?: () => void
}

/** Microphone indicator showing voice assistant state */
export function MicrophoneIndicator({
  enabled,
  isListening = false,
  isSpeaking = false,
  onToggle,
}: MicrophoneIndicatorProps) {
  // Determine current state
  const state = !enabled ? 'muted' : isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle'

  const stateConfig = {
    muted: {
      icon: MicOff,
      label: 'Voice muted',
      bg: 'bg-slate-700',
      ring: '',
      textColor: 'text-slate-400',
    },
    idle: {
      icon: Mic,
      label: 'Voice ready',
      bg: 'bg-slate-700',
      ring: '',
      textColor: 'text-slate-300',
    },
    listening: {
      icon: Mic,
      label: 'Listening...',
      bg: 'bg-blue-600',
      ring: 'ring-4 ring-blue-400/30 animate-pulse',
      textColor: 'text-blue-300',
    },
    speaking: {
      icon: Volume2,
      label: 'Speaking...',
      bg: 'bg-green-600',
      ring: 'ring-4 ring-green-400/30',
      textColor: 'text-green-300',
    },
  }

  const config = stateConfig[state]
  const Icon = config.icon

  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full
        ${config.bg} ${config.ring}
        transition-all duration-300
        hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500
      `}
      title={enabled ? 'Click to mute voice' : 'Click to enable voice'}
    >
      <Icon className={`w-5 h-5 ${config.textColor}`} />
      <span className={`text-sm font-medium ${config.textColor}`}>
        {config.label}
      </span>
    </button>
  )
}

/** Large microphone button for main interaction */
export function MicrophoneButton({
  enabled,
  isListening = false,
  onClick,
}: {
  enabled: boolean
  isListening?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      className={`
        relative p-6 rounded-full
        ${enabled
          ? isListening
            ? 'bg-blue-600 ring-4 ring-blue-400/50'
            : 'bg-slate-700 hover:bg-slate-600'
          : 'bg-slate-800 cursor-not-allowed'
        }
        transition-all duration-300
        focus:outline-none focus:ring-4 focus:ring-blue-500/50
      `}
      title={!enabled ? 'Voice disabled' : isListening ? 'Listening...' : 'Click to speak'}
    >
      {/* Pulse animation when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-25" />
          <span className="absolute inset-0 rounded-full bg-blue-500 animate-pulse opacity-50" />
        </>
      )}

      <Mic
        className={`
          w-8 h-8 relative z-10
          ${enabled
            ? isListening
              ? 'text-white'
              : 'text-slate-300'
            : 'text-slate-500'
          }
        `}
      />
    </button>
  )
}
