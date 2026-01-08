import { Truck, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react'

export interface ConvoyGlance {
  id: string
  name: string
  progress: number
  status: 'running' | 'complete' | 'failed' | 'paused'
  activeStep?: string
  completedSteps: number
  totalSteps: number
}

interface GlanceableConvoyStatusProps {
  convoys: ConvoyGlance[]
  onConvoySelect?: (id: string) => void
  compact?: boolean
}

export default function GlanceableConvoyStatus({
  convoys,
  onConvoySelect,
  compact = false,
}: GlanceableConvoyStatusProps) {
  const getStatusIcon = (status: ConvoyGlance['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'paused':
        return <Clock className="w-5 h-5 text-yellow-400" />
    }
  }

  const getStatusColor = (status: ConvoyGlance['status']) => {
    switch (status) {
      case 'running':
        return 'bg-cyan-500'
      case 'complete':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'paused':
        return 'bg-yellow-500'
    }
  }

  const getGlowColor = (status: ConvoyGlance['status']) => {
    switch (status) {
      case 'running':
        return 'shadow-cyan-500/30'
      case 'complete':
        return 'shadow-green-500/30'
      case 'failed':
        return 'shadow-red-500/30'
      case 'paused':
        return 'shadow-yellow-500/30'
    }
  }

  if (compact) {
    // Ultra-compact for peripheral glancing
    return (
      <div className="flex items-center gap-3">
        {convoys.map((convoy) => (
          <button
            key={convoy.id}
            onClick={() => onConvoySelect?.(convoy.id)}
            className={`
              relative w-12 h-12 rounded-full
              flex items-center justify-center
              backdrop-blur-lg bg-slate-800/50
              border border-slate-600/50
              hover:scale-110 transition-transform
              shadow-lg ${getGlowColor(convoy.status)}
            `}
            title={`${convoy.name}: ${convoy.progress}%`}
          >
            {/* Circular progress */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-slate-700"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className={`${getStatusColor(convoy.status).replace('bg-', 'text-')}`}
                strokeDasharray={`${(convoy.progress / 100) * 125.6} 125.6`}
              />
            </svg>
            <span className="text-white text-xs font-bold">{convoy.progress}%</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {convoys.map((convoy) => (
        <button
          key={convoy.id}
          onClick={() => onConvoySelect?.(convoy.id)}
          className={`
            w-full p-4 rounded-xl
            backdrop-blur-lg bg-slate-800/50
            border border-slate-600/50
            hover:bg-slate-700/50 transition-all
            shadow-lg ${getGlowColor(convoy.status)}
            text-left
          `}
        >
          <div className="flex items-start gap-3">
            {/* Status indicator */}
            <div className="flex-shrink-0 mt-0.5">
              {getStatusIcon(convoy.status)}
            </div>

            <div className="flex-1 min-w-0">
              {/* Title and progress */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-white font-medium truncate">{convoy.name}</h3>
                <span className="text-slate-400 text-sm font-mono">
                  {convoy.completedSteps}/{convoy.totalSteps}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-500 ${getStatusColor(convoy.status)}`}
                  style={{ width: `${convoy.progress}%` }}
                />
              </div>

              {/* Active step */}
              {convoy.activeStep && convoy.status === 'running' && (
                <p className="text-slate-400 text-xs truncate flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {convoy.activeStep}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}

      {convoys.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No active convoys</p>
        </div>
      )}
    </div>
  )
}

// Aggregate stats for spatial overview
export function ConvoyAggregateGlance({
  convoys,
}: {
  convoys: ConvoyGlance[]
}) {
  const running = convoys.filter((c) => c.status === 'running').length
  const complete = convoys.filter((c) => c.status === 'complete').length
  const failed = convoys.filter((c) => c.status === 'failed').length
  const avgProgress =
    convoys.length > 0
      ? Math.round(convoys.reduce((sum, c) => sum + c.progress, 0) / convoys.length)
      : 0

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatOrb
        value={convoys.length}
        label="Total"
        color="slate"
      />
      <StatOrb
        value={running}
        label="Active"
        color="cyan"
        pulse={running > 0}
      />
      <StatOrb
        value={complete}
        label="Done"
        color="green"
      />
      <StatOrb
        value={failed}
        label="Failed"
        color="red"
        alert={failed > 0}
      />
    </div>
  )
}

function StatOrb({
  value,
  label,
  color,
  pulse = false,
  alert = false,
}: {
  value: number
  label: string
  color: 'slate' | 'cyan' | 'green' | 'red' | 'yellow'
  pulse?: boolean
  alert?: boolean
}) {
  const colors = {
    slate: 'from-slate-600 to-slate-700 text-slate-300',
    cyan: 'from-cyan-500 to-cyan-600 text-white',
    green: 'from-green-500 to-green-600 text-white',
    red: 'from-red-500 to-red-600 text-white',
    yellow: 'from-yellow-500 to-yellow-600 text-white',
  }

  const glows = {
    slate: '',
    cyan: 'shadow-cyan-500/50',
    green: 'shadow-green-500/50',
    red: 'shadow-red-500/50',
    yellow: 'shadow-yellow-500/50',
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          relative w-16 h-16 rounded-full
          bg-gradient-to-b ${colors[color]}
          flex items-center justify-center
          shadow-lg ${glows[color]}
          ${pulse ? 'animate-pulse' : ''}
          ${alert ? 'ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900' : ''}
        `}
      >
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <span className="text-slate-400 text-xs mt-2">{label}</span>
    </div>
  )
}

// Mock data for development
export const mockConvoys: ConvoyGlance[] = [
  {
    id: 'convoy-001',
    name: 'Phase 1: Core UI MVP',
    progress: 75,
    status: 'running',
    activeStep: 'Implementing Dashboard',
    completedSteps: 6,
    totalSteps: 8,
  },
  {
    id: 'convoy-002',
    name: 'Voice Integration',
    progress: 40,
    status: 'running',
    activeStep: 'LFM2.5 Connection',
    completedSteps: 2,
    totalSteps: 5,
  },
  {
    id: 'convoy-003',
    name: 'Mobile Companions',
    progress: 100,
    status: 'complete',
    completedSteps: 4,
    totalSteps: 4,
  },
  {
    id: 'convoy-004',
    name: 'Design Mode',
    progress: 100,
    status: 'complete',
    completedSteps: 5,
    totalSteps: 5,
  },
]
