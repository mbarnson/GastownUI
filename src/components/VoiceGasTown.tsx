import { useState, useCallback } from 'react'
import { Mic, MicOff, Volume2, Terminal, HelpCircle, X, Loader2 } from 'lucide-react'
import {
  parseVoiceCommand,
  getVoiceResponse,
  getVoiceCommandHelp,
  type ParsedCommand,
  type VoiceIntent,
} from '../utils/voiceCommands'
import { useLiveRegion } from './a11y/LiveRegion'

interface CommandResult {
  success: boolean
  output?: string
  error?: string
}

interface VoiceGasTownProps {
  /** Callback when a command should be executed */
  onExecuteCommand?: (command: string) => Promise<CommandResult>
  /** Whether to show the panel in expanded mode */
  expanded?: boolean
  /** Callback when panel is closed */
  onClose?: () => void
}

export default function VoiceGasTown({
  onExecuteCommand,
  expanded = false,
  onClose,
}: VoiceGasTownProps) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [lastCommand, setLastCommand] = useState<ParsedCommand | null>(null)
  const [commandResult, setCommandResult] = useState<CommandResult | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const { announce } = useLiveRegion()

  // Simulated voice recognition (in production would use Web Speech API or LFM)
  const startListening = useCallback(() => {
    setIsListening(true)
    setTranscript('')
    setCommandResult(null)
    announce('Listening for voice command')

    // Simulate listening - in production this would use speech recognition
    // For demo, we'll use a timeout and show an input
  }, [announce])

  const stopListening = useCallback(() => {
    setIsListening(false)
  }, [])

  const handleTranscriptSubmit = useCallback(
    async (text: string) => {
      setIsListening(false)
      setIsProcessing(true)
      setTranscript(text)

      // Parse the command
      const parsed = parseVoiceCommand(text)
      setLastCommand(parsed)

      // Get voice response
      const voiceResponse = getVoiceResponse(parsed)
      announce(voiceResponse)

      // Execute if we have a handler and a valid command
      if (onExecuteCommand && parsed.suggestedCommand && parsed.intent !== 'unknown') {
        try {
          const result = await onExecuteCommand(parsed.suggestedCommand)
          setCommandResult(result)

          if (result.success) {
            announce('Command completed successfully')
          } else {
            announce(`Command failed: ${result.error || 'Unknown error'}`)
          }
        } catch (error) {
          setCommandResult({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          announce('Command execution failed')
        }
      } else if (parsed.intent === 'help') {
        setShowHelp(true)
      }

      setIsProcessing(false)
    },
    [onExecuteCommand, announce]
  )

  const getIntentIcon = (intent: VoiceIntent) => {
    switch (intent) {
      case 'sling_work':
        return '📤'
      case 'show_rig':
      case 'show_status':
        return '📊'
      case 'whats_blocking':
        return '🚫'
      case 'list_convoys':
        return '🚚'
      case 'show_ready':
        return '✅'
      case 'create_bead':
        return '➕'
      case 'close_bead':
        return '✓'
      case 'help':
        return '❓'
      default:
        return '❔'
    }
  }

  if (!expanded) {
    // Compact button mode
    return (
      <button
        onClick={startListening}
        className={`
          p-3 rounded-full transition-all
          ${isListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }
        `}
        aria-label={isListening ? 'Listening...' : 'Voice commands'}
      >
        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
    )
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Voice Commands</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Help panel */}
      {showHelp && (
        <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700">
          <p className="text-sm text-slate-400 mb-2">Available commands:</p>
          <ul className="text-sm text-slate-300 space-y-1">
            {getVoiceCommandHelp().map((help, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-cyan-400">•</span>
                {help}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main content */}
      <div className="p-4">
        {/* Voice input area */}
        <div className="mb-4">
          {isListening ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-red-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping" />
              </div>
              <p className="text-slate-300">Listening...</p>
              <input
                type="text"
                placeholder="Type or speak your command..."
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    handleTranscriptSubmit(e.currentTarget.value)
                  }
                }}
                autoFocus
              />
              <button
                onClick={stopListening}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={startListening}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <Mic className="w-6 h-6 text-cyan-400" />
              <span className="text-white font-medium">Tap to speak</span>
            </button>
          )}
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-lg mb-4">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            <span className="text-slate-300">Processing command...</span>
          </div>
        )}

        {/* Last command */}
        {lastCommand && !isProcessing && (
          <div className="space-y-3">
            {/* Transcript */}
            <div className="flex items-start gap-3 px-4 py-3 bg-slate-900/50 rounded-lg">
              <Volume2 className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-slate-300">{transcript}</p>
                {lastCommand.intent !== 'unknown' && (
                  <p className="text-sm text-slate-500 mt-1">
                    {getIntentIcon(lastCommand.intent)} Recognized:{' '}
                    <span className="text-cyan-400">{lastCommand.intent.replace('_', ' ')}</span>
                    {lastCommand.confidence < 0.9 && (
                      <span className="text-yellow-400 ml-2">
                        ({Math.round(lastCommand.confidence * 100)}% confidence)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Suggested command */}
            {lastCommand.suggestedCommand && (
              <div className="flex items-start gap-3 px-4 py-3 bg-slate-900/50 rounded-lg">
                <Terminal className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <code className="text-green-400">{lastCommand.suggestedCommand}</code>
                </div>
              </div>
            )}

            {/* Command result */}
            {commandResult && (
              <div
                className={`flex items-start gap-3 px-4 py-3 rounded-lg ${
                  commandResult.success ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
              >
                <span className="text-lg">{commandResult.success ? '✓' : '✗'}</span>
                <div>
                  {commandResult.success ? (
                    <p className="text-green-400">
                      {commandResult.output || 'Command executed successfully'}
                    </p>
                  ) : (
                    <p className="text-red-400">{commandResult.error || 'Command failed'}</p>
                  )}
                </div>
              </div>
            )}

            {/* Unknown command help */}
            {lastCommand.intent === 'unknown' && (
              <div className="px-4 py-3 bg-yellow-500/10 rounded-lg">
                <p className="text-yellow-400">
                  Command not recognized. Try saying &quot;help&quot; to see available commands.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Floating voice button for dashboard integration
 */
export function VoiceButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 p-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-lg transition-all hover:scale-105 z-40"
      aria-label="Voice commands"
    >
      <Mic className="w-6 h-6" />
    </button>
  )
}
