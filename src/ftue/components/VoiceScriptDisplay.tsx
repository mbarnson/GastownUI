import { MessageSquare, Volume2, VolumeX } from 'lucide-react'

interface VoiceScriptDisplayProps {
  /** The text to display - the voice script content */
  text: string
  /** Whether voice is enabled (hides this component if true in voice mode, shows in text mode) */
  voiceEnabled?: boolean
  /** Optional title for the card */
  title?: string
  /** Unique ID for accessibility linking */
  id?: string
  /** Whether this is the current active instruction (for screen readers) */
  isCurrent?: boolean
  /** Step number for context */
  stepNumber?: number
  /** Total steps for context */
  totalSteps?: number
}

/**
 * Displays voice script text as readable content for text-only mode.
 *
 * Accessibility features:
 * - Proper heading structure
 * - ARIA live region for dynamic content
 * - Role="region" for landmark navigation
 * - Linked aria-describedby for context
 * - Screen reader announcements for step changes
 */
export function VoiceScriptDisplay({
  text,
  voiceEnabled = false,
  title = 'Instructions',
  id,
  isCurrent = true,
  stepNumber,
  totalSteps,
}: VoiceScriptDisplayProps) {
  // Don't show when voice is enabled - the voice will speak the content
  if (voiceEnabled) {
    return null
  }

  // Split text into paragraphs for better readability
  const paragraphs = text.split('\n\n').filter(Boolean)

  const componentId = id || `voice-script-${Math.random().toString(36).slice(2, 9)}`
  const headingId = `${componentId}-heading`
  const contentId = `${componentId}-content`

  return (
    <section
      id={componentId}
      className="w-full max-w-lg bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
      role="region"
      aria-labelledby={headingId}
      aria-describedby={contentId}
      aria-current={isCurrent ? 'step' : undefined}
    >
      {/* Header */}
      <header className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700/50">
        <VolumeX className="w-4 h-4 text-slate-400" aria-hidden="true" />
        <h3 id={headingId} className="text-sm font-medium text-slate-300">
          {title}
          {stepNumber && totalSteps && (
            <span className="sr-only">
              {' '}
              (Step {stepNumber} of {totalSteps})
            </span>
          )}
        </h3>
        {/* Visual step indicator */}
        {stepNumber && totalSteps && (
          <span
            className="ml-auto text-xs text-slate-500 tabular-nums"
            aria-hidden="true"
          >
            {stepNumber}/{totalSteps}
          </span>
        )}
      </header>

      {/* Content - aria-live for dynamic updates */}
      <div
        id={contentId}
        className="px-4 py-4 space-y-3"
        role="status"
        aria-live={isCurrent ? 'polite' : 'off'}
        aria-atomic="true"
      >
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-sm text-slate-300 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  )
}

/**
 * Compact inline version for shorter messages
 *
 * Accessibility features:
 * - ARIA live region for announcements
 * - Proper role for status messages
 */
export function VoiceScriptInline({
  text,
  voiceEnabled = false,
  isAnnouncement = false,
}: {
  text: string
  voiceEnabled?: boolean
  /** Whether this should be announced to screen readers */
  isAnnouncement?: boolean
}) {
  if (voiceEnabled) {
    return null
  }

  return (
    <p
      className="text-sm text-slate-400 leading-relaxed max-w-lg text-center"
      role={isAnnouncement ? 'status' : undefined}
      aria-live={isAnnouncement ? 'polite' : undefined}
    >
      {text}
    </p>
  )
}

/**
 * Full-featured text mode wrapper with step context
 *
 * Use this when you need to display voice scripts with full step information
 * and navigation context for accessibility.
 */
export function TextModeScriptCard({
  text,
  title,
  stepNumber,
  totalSteps,
  command,
  onCopyCommand,
  className = '',
}: {
  text: string
  title?: string
  stepNumber?: number
  totalSteps?: number
  /** Optional command to display with copy button */
  command?: string
  /** Called when command is copied */
  onCopyCommand?: () => void
  className?: string
}) {
  const paragraphs = text.split('\n\n').filter(Boolean)

  return (
    <div
      className={`
        w-full max-w-lg bg-slate-800/50 rounded-xl border border-slate-700/50
        focus-within:ring-2 focus-within:ring-cyan-500/50
        ${className}
      `}
      role="article"
      aria-label={title || 'Setup instructions'}
    >
      {/* Header with step context */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50">
        <h3 className="text-sm font-medium text-white">
          {title || 'Instructions'}
        </h3>
        {stepNumber && totalSteps && (
          <span className="text-xs text-slate-500">
            Step {stepNumber} of {totalSteps}
          </span>
        )}
      </header>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Text content */}
        <div className="space-y-3" role="status" aria-live="polite">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-sm text-slate-300 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Command block if provided */}
        {command && (
          <div className="mt-4">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-900 rounded-lg border border-slate-700 font-mono text-sm">
              <code className="flex-1 text-green-400 overflow-x-auto whitespace-nowrap">
                {command}
              </code>
              {onCopyCommand && (
                <button
                  onClick={onCopyCommand}
                  className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  aria-label="Copy command to clipboard"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
