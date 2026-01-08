import { useEffect, useState } from 'react'
import { Rocket, Crown, LayoutDashboard, Sparkles } from 'lucide-react'
import { Logo } from './Logo'

interface CelebrationSceneProps {
  workspacePath: string
  onAddRig: () => void
  onStartMayor: () => void
  onDashboard: () => void
}

/** Confetti particle component */
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full animate-confetti"
      style={{
        backgroundColor: color,
        left: `${Math.random() * 100}%`,
        animationDelay: `${delay}ms`,
        animationDuration: `${2000 + Math.random() * 1000}ms`,
      }}
    />
  )
}

/** Confetti effect container */
function Confetti() {
  const colors = ['#60A5FA', '#34D399', '#FBBF24', '#F472B6', '#A78BFA']
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    delay: Math.random() * 1000,
    color: colors[i % colors.length],
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} delay={p.delay} color={p.color} />
      ))}
    </div>
  )
}

/** Next step option card */
function NextStepCard({
  icon: Icon,
  title,
  description,
  onClick,
  primary = false,
}: {
  icon: typeof Rocket
  title: string
  description: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all text-left w-full ${
        primary
          ? 'bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/30 hover:border-blue-500'
          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
      } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900`}
    >
      <div
        className={`p-2 rounded-lg ${
          primary ? 'bg-blue-600/30 text-blue-400' : 'bg-slate-700 text-slate-400'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h3 className={`font-medium ${primary ? 'text-blue-300' : 'text-slate-200'}`}>
          {title}
        </h3>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>
    </button>
  )
}

/** Celebration Scene - Setup complete, show next steps */
export function CelebrationScene({
  workspacePath,
  onAddRig,
  onStartMayor,
  onDashboard,
}: CelebrationSceneProps) {
  const [showConfetti, setShowConfetti] = useState(true)

  // Stop confetti after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col relative overflow-hidden">
      {/* Confetti effect */}
      {showConfetti && <Confetti />}

      {/* Sparkle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
        {/* Success badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-full text-green-400">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Setup Complete!</span>
        </div>

        {/* Logo and message */}
        <div className="text-center">
          <Logo size="lg" />
          <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-white">
            You're all set!
          </h1>
          <p className="mt-3 text-slate-400 max-w-md">
            Your Gas Town workspace is ready at{' '}
            <code className="px-2 py-0.5 bg-slate-800 rounded text-blue-400 text-sm">
              {workspacePath}
            </code>
          </p>
        </div>

        {/* Next steps */}
        <div className="w-full max-w-md space-y-3 mt-4">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">
            What's next?
          </h2>

          <NextStepCard
            icon={Rocket}
            title="Add a project"
            description="Add a Git repo as your first rig"
            onClick={onAddRig}
            primary
          />

          <NextStepCard
            icon={Crown}
            title="Start the Mayor"
            description="Fire up your coordination agent"
            onClick={onStartMayor}
          />

          <NextStepCard
            icon={LayoutDashboard}
            title="Go to Dashboard"
            description="Explore the interface first"
            onClick={onDashboard}
          />
        </div>

        {/* Pro tip */}
        <p className="text-sm text-slate-500 mt-4 text-center max-w-md">
          Pro tip: You can always access Gas Town from your terminal with{' '}
          <code className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">gt</code>{' '}
          commands.
        </p>
      </main>

      {/* Footer */}
      <footer className="relative px-6 py-4 text-center text-xs text-slate-600">
        <p>Welcome to the factory. Happy coding!</p>
      </footer>
    </div>
  )
}
