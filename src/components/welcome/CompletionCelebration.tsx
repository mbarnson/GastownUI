import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Check,
  Plus,
  Crown,
  LayoutDashboard,
  Mic,
  Volume2,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

interface PathOption {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  voiceHint: string
  color: string
  recommended?: boolean
}

interface CompletionCelebrationProps {
  completedSteps?: string[]
  onPathSelect?: (pathId: string) => void
  enableVoice?: boolean
}

export default function CompletionCelebration({
  completedSteps = ['Install Gas Town', 'Configure workspace', 'Create first rig'],
  onPathSelect,
  enableVoice = true,
}: CompletionCelebrationProps) {
  const [showCheckmarks, setShowCheckmarks] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [hoveredOption, setHoveredOption] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [spokenOption, setSpokenOption] = useState<string | null>(null)

  // Animate checkmarks appearing
  useEffect(() => {
    const timer1 = setTimeout(() => setShowCheckmarks(true), 500)
    const timer2 = setTimeout(() => setShowOptions(true), 1500)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const pathOptions: PathOption[] = [
    {
      id: 'add-rig',
      title: 'Add Another Rig',
      description: 'Connect a new project repository to Gas Town',
      icon: <Plus className="w-6 h-6" />,
      href: '/rigs/new',
      voiceHint: 'Say "Add a rig" to connect another project',
      color: 'cyan',
    },
    {
      id: 'start-mayor',
      title: 'Start the Mayor',
      description: 'Launch the coordinator agent to manage your rigs',
      icon: <Crown className="w-6 h-6" />,
      href: '/mayor/start',
      voiceHint: 'Say "Start Mayor" to begin coordinating',
      color: 'orange',
      recommended: true,
    },
    {
      id: 'dashboard',
      title: 'Go to Dashboard',
      description: 'View your Gas Town status and activity',
      icon: <LayoutDashboard className="w-6 h-6" />,
      href: '/dashboard',
      voiceHint: 'Say "Show dashboard" to see your town',
      color: 'purple',
    },
  ]

  const speakHint = (option: PathOption) => {
    if (!enableVoice) return

    setIsSpeaking(true)
    setSpokenOption(option.id)

    // In real implementation, this would use LFM2.5
    // Simulating speech duration
    setTimeout(() => {
      setIsSpeaking(false)
      setSpokenOption(null)
    }, 2000)
  }

  const getColorClasses = (color: string, isHovered: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
      cyan: {
        bg: isHovered ? 'bg-cyan-500/20' : 'bg-slate-800/50',
        border: isHovered ? 'border-cyan-500/50' : 'border-slate-700',
        text: 'text-cyan-400',
        glow: 'shadow-cyan-500/20',
      },
      orange: {
        bg: isHovered ? 'bg-orange-500/20' : 'bg-slate-800/50',
        border: isHovered ? 'border-orange-500/50' : 'border-slate-700',
        text: 'text-orange-400',
        glow: 'shadow-orange-500/20',
      },
      purple: {
        bg: isHovered ? 'bg-purple-500/20' : 'bg-slate-800/50',
        border: isHovered ? 'border-purple-500/50' : 'border-slate-700',
        text: 'text-purple-400',
        glow: 'shadow-purple-500/20',
      },
    }
    return colors[color] || colors.cyan
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-2xl w-full">
        {/* Celebration header */}
        <div className="text-center mb-12">
          {/* Animated checkmark */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div
              className={`
                w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500
                flex items-center justify-center
                transition-all duration-500
                ${showCheckmarks ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
              `}
            >
              <Check
                className={`
                  w-12 h-12 text-green-400
                  transition-all duration-300 delay-300
                  ${showCheckmarks ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
                `}
              />
            </div>
            {/* Sparkle effects */}
            {showCheckmarks && (
              <>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
                <Sparkles className="absolute -bottom-1 -left-3 w-5 h-5 text-cyan-400 animate-pulse delay-100" />
                <Sparkles className="absolute top-0 -left-4 w-4 h-4 text-purple-400 animate-pulse delay-200" />
              </>
            )}
          </div>

          <h1
            className={`
              text-3xl font-bold text-white mb-3
              transition-all duration-500 delay-200
              ${showCheckmarks ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
            `}
          >
            Setup Complete!
          </h1>
          <p
            className={`
              text-slate-400 text-lg
              transition-all duration-500 delay-300
              ${showCheckmarks ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
            `}
          >
            Gas Town is ready to roll
          </p>
        </div>

        {/* Completed steps checklist */}
        <div
          className={`
            mb-10 space-y-2
            transition-all duration-500 delay-500
            ${showCheckmarks ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}
        >
          {completedSteps.map((step, index) => (
            <div
              key={step}
              className="flex items-center gap-3 text-slate-300"
              style={{
                transitionDelay: `${600 + index * 150}ms`,
              }}
            >
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-green-400" />
              </div>
              <span>{step}</span>
            </div>
          ))}
        </div>

        {/* Voice hint */}
        {enableVoice && (
          <div
            className={`
              flex items-center justify-center gap-2 mb-8 text-slate-500 text-sm
              transition-all duration-500 delay-700
              ${showOptions ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
            `}
          >
            <Mic className="w-4 h-4" />
            <span>Use voice commands or click to continue</span>
          </div>
        )}

        {/* Path options */}
        <div
          className={`
            space-y-4
            transition-all duration-500 delay-800
            ${showOptions ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
          `}
        >
          <h2 className="text-slate-400 text-sm uppercase tracking-wider mb-4">
            What&apos;s next?
          </h2>

          {pathOptions.map((option) => {
            const isHovered = hoveredOption === option.id
            const colors = getColorClasses(option.color, isHovered)

            return (
              <Link
                key={option.id}
                to={option.href}
                onClick={() => onPathSelect?.(option.id)}
                onMouseEnter={() => {
                  setHoveredOption(option.id)
                  speakHint(option)
                }}
                onMouseLeave={() => setHoveredOption(null)}
                className={`
                  relative block p-5 rounded-xl border backdrop-blur
                  transition-all duration-300
                  ${colors.bg} ${colors.border}
                  ${isHovered ? `shadow-lg ${colors.glow}` : ''}
                `}
              >
                {/* Recommended badge */}
                {option.recommended && (
                  <span className="absolute -top-2 right-4 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">
                    Recommended
                  </span>
                )}

                <div className="flex items-center gap-4">
                  <div className={`${colors.text}`}>{option.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">{option.title}</h3>
                    <p className="text-slate-400 text-sm">{option.description}</p>

                    {/* Voice hint on hover */}
                    {isHovered && enableVoice && (
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        {spokenOption === option.id ? (
                          <Volume2 className={`w-3 h-3 ${colors.text} animate-pulse`} />
                        ) : (
                          <Mic className="w-3 h-3 text-slate-500" />
                        )}
                        <span className="text-slate-500">{option.voiceHint}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 transition-transform ${
                      isHovered ? 'translate-x-1 text-white' : 'text-slate-500'
                    }`}
                  />
                </div>
              </Link>
            )
          })}
        </div>

        {/* Skip link */}
        <div
          className={`
            text-center mt-8
            transition-all duration-500 delay-1000
            ${showOptions ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}
        >
          <Link
            to="/dashboard"
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  )
}
