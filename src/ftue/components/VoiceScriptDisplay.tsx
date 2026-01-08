import { MessageSquare } from 'lucide-react'

interface VoiceScriptDisplayProps {
  /** The text to display - the voice script content */
  text: string
  /** Whether voice is enabled (hides this component if true) */
  voiceEnabled?: boolean
  /** Optional title for the card */
  title?: string
}

/**
 * Displays voice script text as readable content when voice is disabled.
 * This provides graceful degradation for non-voice mode.
 */
export function VoiceScriptDisplay({
  text,
  voiceEnabled = false,
  title = 'Instructions',
}: VoiceScriptDisplayProps) {
  // Don't show when voice is enabled - the voice will speak the content
  if (voiceEnabled) {
    return null
  }

  // Split text into paragraphs for better readability
  const paragraphs = text.split('\n\n').filter(Boolean)

  return (
    <div className="w-full max-w-lg bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700/50">
        <MessageSquare className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-300">{title}</span>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-sm text-slate-300 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}

/**
 * Compact inline version for shorter messages
 */
export function VoiceScriptInline({
  text,
  voiceEnabled = false,
}: {
  text: string
  voiceEnabled?: boolean
}) {
  if (voiceEnabled) {
    return null
  }

  return (
    <p className="text-sm text-slate-400 leading-relaxed max-w-lg text-center">
      {text}
    </p>
  )
}
