import { useState, useEffect, useRef } from 'react'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  MessageSquare,
  Send,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface VoiceOnlyModeProps {
  onCommand?: (command: string) => void
}

export default function VoiceOnlyMode({ onCommand }: VoiceOnlyModeProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [showTranscript, setShowTranscript] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) {
      return
    }
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const startListening = () => {
    setIsListening(true)
    setTranscript('')
    // In real implementation, this would use Web Speech API or LFM2.5
    // Simulating voice recognition
    setTimeout(() => {
      const mockCommands = [
        'Show convoy status',
        'What are my active convoys?',
        'Check cost alerts',
        'Any escalations pending?',
      ]
      const randomCommand = mockCommands[Math.floor(Math.random() * mockCommands.length)]
      setTranscript(randomCommand)
    }, 1500)
  }

  const stopListening = () => {
    setIsListening(false)
    if (transcript) {
      processCommand(transcript)
    }
  }

  const processCommand = (command: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: command,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Simulate processing and response
    setIsSpeaking(true)
    setTimeout(() => {
      const responses: Record<string, string> = {
        'Show convoy status': 'You have 3 active convoys. Phase 1 Core UI MVP is 75% complete. Mobile Companions is just starting.',
        'What are my active convoys?': 'Currently running: Core UI MVP at 75%, Voice Integration at 40%, and Mobile Companions just kicked off.',
        'Check cost alerts': 'Daily spend is at $47.23, which is under your $50 threshold. You\'re good.',
        'Any escalations pending?': 'One escalation needs your attention: Polecat furiosa is waiting on approval for the voice integration merge.',
      }

      const response = responses[command] || 'I didn\'t catch that. Try asking about convoys, costs, or escalations.'

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsSpeaking(false)

      // Notify parent of command
      onCommand?.(command)
    }, 1000)

    setTranscript('')
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Voice visualization area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Animated ring */}
        <div className="relative mb-8">
          <div
            className={`w-48 h-48 rounded-full border-4 transition-all duration-300 ${
              isListening
                ? 'border-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50'
                : isSpeaking
                  ? 'border-orange-400 animate-pulse shadow-lg shadow-orange-400/50'
                  : 'border-slate-600'
            }`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {isListening ? (
                <div className="flex flex-col items-center">
                  <Mic className="w-16 h-16 text-cyan-400" />
                  <span className="text-cyan-400 text-sm mt-2">Listening...</span>
                </div>
              ) : isSpeaking ? (
                <div className="flex flex-col items-center">
                  <Volume2 className="w-16 h-16 text-orange-400" />
                  <span className="text-orange-400 text-sm mt-2">Speaking...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <MicOff className="w-16 h-16 text-slate-500" />
                  <span className="text-slate-500 text-sm mt-2">Tap to speak</span>
                </div>
              )}
            </div>
          </div>

          {/* Animated rings when active */}
          {(isListening || isSpeaking) && (
            <>
              <div
                className={`absolute inset-0 rounded-full border-2 animate-ping ${
                  isListening ? 'border-cyan-400/30' : 'border-orange-400/30'
                }`}
                style={{ animationDuration: '2s' }}
              />
              <div
                className={`absolute inset-[-16px] rounded-full border animate-ping ${
                  isListening ? 'border-cyan-400/20' : 'border-orange-400/20'
                }`}
                style={{ animationDuration: '3s' }}
              />
            </>
          )}
        </div>

        {/* Transcript display */}
        {transcript && (
          <div className="bg-slate-800 px-4 py-2 rounded-lg mb-4">
            <p className="text-cyan-400 text-center">&ldquo;{transcript}&rdquo;</p>
          </div>
        )}

        {/* Quick suggestions */}
        <div className="flex flex-wrap gap-2 justify-center max-w-sm">
          <SuggestionChip
            text="Convoy status"
            onClick={() => processCommand('Show convoy status')}
          />
          <SuggestionChip
            text="Cost alerts"
            onClick={() => processCommand('Check cost alerts')}
          />
          <SuggestionChip
            text="Escalations"
            onClick={() => processCommand('Any escalations pending?')}
          />
        </div>
      </div>

      {/* Main action button */}
      <div className="flex justify-center pb-8">
        <button
          onClick={toggleListening}
          disabled={isSpeaking}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? 'bg-cyan-500 hover:bg-cyan-600'
              : isSpeaking
                ? 'bg-orange-500 cursor-not-allowed'
                : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          {isSpeaking ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : isListening ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
      </div>

      {/* Audio toggle */}
      <button
        onClick={() => setAudioEnabled(!audioEnabled)}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
      >
        {audioEnabled ? (
          <Volume2 className="w-5 h-5" />
        ) : (
          <VolumeX className="w-5 h-5" />
        )}
      </button>

      {/* Transcript history drawer */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 transition-transform duration-300 ${
          showTranscript ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'
        }`}
        style={{ height: '60%' }}
      >
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full flex items-center justify-center gap-2 py-3 text-slate-400 hover:text-white"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
          {showTranscript ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>

        <div
          className="overflow-y-auto h-[calc(100%-48px)] px-4 pb-4"
          ref={messagesContainerRef}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-3 ${message.role === 'user' ? 'text-right' : ''}`}
            >
              <div
                className={`inline-block max-w-[80%] px-3 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                {message.content}
              </div>
              <div className="text-slate-500 text-xs mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  )
}

function SuggestionChip({
  text,
  onClick,
}: {
  text: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 bg-slate-800 text-slate-300 text-sm rounded-full hover:bg-slate-700 hover:text-white transition-colors"
    >
      {text}
    </button>
  )
}
