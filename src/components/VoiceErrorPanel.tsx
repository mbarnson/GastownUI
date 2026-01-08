import { useState } from 'react'
import { AlertTriangle, MicOff, Server, Download, RefreshCw, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * Error types that can occur in voice functionality
 */
export type VoiceErrorType = 'server_not_running' | 'model_not_found' | 'mic_permission_denied' | 'unknown'

/**
 * Detect the type of voice error from error message
 */
export function detectVoiceErrorType(error: string | null | undefined): VoiceErrorType | null {
  if (!error) return null

  const errorLower = error.toLowerCase()

  // Microphone permission errors
  if (
    errorLower.includes('notallowederror') ||
    errorLower.includes('permission denied') ||
    errorLower.includes('not allowed') ||
    errorLower.includes('user denied') ||
    errorLower.includes('microphone') && errorLower.includes('denied')
  ) {
    return 'mic_permission_denied'
  }

  // Server not running / connection errors
  if (
    errorLower.includes('connection refused') ||
    errorLower.includes('server not running') ||
    errorLower.includes('failed to connect') ||
    errorLower.includes('econnrefused') ||
    errorLower.includes('network error') ||
    errorLower.includes('voice server') && errorLower.includes('not')
  ) {
    return 'server_not_running'
  }

  // Model not found
  if (
    errorLower.includes('model not found') ||
    errorLower.includes('model file') ||
    errorLower.includes('lfm') && errorLower.includes('not') ||
    errorLower.includes('missing model') ||
    errorLower.includes('no model')
  ) {
    return 'model_not_found'
  }

  return 'unknown'
}

interface VoiceErrorPanelProps {
  error: string | null | undefined
  onRetry?: () => void
  onTextFallback?: (text: string) => void
  isRetrying?: boolean
}

/**
 * VoiceErrorPanel - Displays voice errors with helpful guidance and fallbacks
 *
 * Handles:
 * - Server not running: Shows how to start the voice server
 * - Model not found: Shows how to download the LFM2.5 model
 * - Mic permission denied: Shows browser permission guidance
 * - Unknown errors: Shows generic retry option
 */
export function VoiceErrorPanel({
  error,
  onRetry,
  onTextFallback,
  isRetrying = false,
}: VoiceErrorPanelProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [showTextFallback, setShowTextFallback] = useState(false)

  const errorType = detectVoiceErrorType(error)

  if (!error || !errorType) return null

  const handleTextSubmit = () => {
    if (textInput.trim() && onTextFallback) {
      onTextFallback(textInput.trim())
      setTextInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    }
  }

  const errorConfig = {
    server_not_running: {
      icon: Server,
      title: 'Voice Server Not Running',
      description: 'The voice server needs to be started before you can use voice features.',
      steps: [
        'The voice server starts automatically when you open GastownUI',
        'If it failed to start, check that port 8081 is available',
        'Try clicking "Retry" to restart the voice server',
        'Check the terminal for any error messages',
      ],
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/30',
    },
    model_not_found: {
      icon: Download,
      title: 'Voice Model Not Found',
      description: 'The LFM2.5 voice model needs to be downloaded.',
      steps: [
        'The LFM2.5 model (~500MB) downloads automatically on first use',
        'Check your internet connection if download is failing',
        'Model is stored in ~/.cache/huggingface/',
        'Ensure you have sufficient disk space (~1GB free)',
        'Try clicking "Retry" to attempt download again',
      ],
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      borderColor: 'border-purple-400/30',
    },
    mic_permission_denied: {
      icon: MicOff,
      title: 'Microphone Access Denied',
      description: 'GastownUI needs microphone permission to use voice features.',
      steps: [
        'Click the lock/site settings icon in your browser address bar',
        'Find "Microphone" in the permissions list',
        'Change the setting from "Block" to "Allow"',
        'Reload the page after changing permissions',
        'On macOS, also check System Preferences > Privacy > Microphone',
      ],
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/30',
    },
    unknown: {
      icon: AlertTriangle,
      title: 'Voice Error',
      description: 'An unexpected error occurred with voice features.',
      steps: [
        'Try clicking "Retry" to attempt again',
        'Check the browser console for more details',
        'Restart the application if the problem persists',
      ],
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      borderColor: 'border-orange-400/30',
    },
  }

  const config = errorConfig[errorType]
  const Icon = config.icon

  return (
    <div className={`voice-error-panel rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className={`p-2 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${config.color}`}>{config.title}</h4>
          <p className="text-sm text-gray-400 mt-1">{config.description}</p>
        </div>
      </div>

      {/* Setup Steps (collapsible) */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showDetails ? 'Hide setup steps' : 'Show setup steps'}
        </button>

        {showDetails && (
          <ol className="mt-3 space-y-2 text-sm text-gray-300">
            {config.steps.map((step, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-gray-500 flex-shrink-0">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 p-4 pt-2 border-t border-slate-700/50">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              ${isRetrying
                ? 'bg-slate-700 text-gray-400 cursor-not-allowed'
                : 'bg-slate-700 text-white hover:bg-slate-600'
              }
              transition-colors
            `}
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}

        {onTextFallback && (
          <button
            onClick={() => setShowTextFallback(!showTextFallback)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              ${showTextFallback
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }
              transition-colors
            `}
          >
            <MessageSquare className="w-4 h-4" />
            Use Text Instead
          </button>
        )}
      </div>

      {/* Text Input Fallback */}
      {showTextFallback && onTextFallback && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          <p className="text-xs text-gray-500 mb-2 pt-3">
            Type your message instead of speaking:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="
                flex-1 px-3 py-2 rounded-lg text-sm
                bg-slate-800 border border-slate-600
                text-white placeholder-gray-500
                focus:outline-none focus:border-cyan-500
              "
              autoFocus
            />
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium
                ${textInput.trim()
                  ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                  : 'bg-slate-700 text-gray-500 cursor-not-allowed'
                }
                transition-colors
              `}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Raw Error (collapsed by default) */}
      {showDetails && error && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          <p className="text-xs text-gray-500 mt-3 mb-1">Technical details:</p>
          <pre className="text-xs text-gray-400 bg-slate-900/50 p-2 rounded overflow-x-auto">
            {error}
          </pre>
        </div>
      )}

      <style>{`
        .voice-error-panel {
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default VoiceErrorPanel
