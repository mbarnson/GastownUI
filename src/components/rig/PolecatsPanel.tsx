import { Skull, Circle, AlertTriangle, Zap } from 'lucide-react'
import type { Polecat } from '../../hooks/useGastown'

interface PolecatsPanelProps {
  polecats: Polecat[]
  rigId: string
}

const statusConfig = {
  active: {
    icon: Zap,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    dot: 'bg-green-400',
    label: 'Active',
  },
  idle: {
    icon: Circle,
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    dot: 'bg-gray-400',
    label: 'Idle',
  },
  stuck: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    dot: 'bg-red-400',
    label: 'Stuck',
  },
}

export default function PolecatsPanel({ polecats, rigId: _rigId }: PolecatsPanelProps) {
  const activeCount = polecats.filter((p) => p.status === 'active').length
  const stuckCount = polecats.filter((p) => p.status === 'stuck').length

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <Skull className="w-5 h-5 text-orange-400" />
        <h2 className="text-lg font-semibold text-white">Polecats</h2>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {activeCount > 0 && (
            <span className="text-green-400">{activeCount} active</span>
          )}
          {stuckCount > 0 && (
            <span className="text-red-400">{stuckCount} stuck</span>
          )}
          <span className="text-gray-400">{polecats.length} total</span>
        </div>
      </div>

      {polecats.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Skull className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No polecats in this rig</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {polecats.map((polecat) => {
            const config = statusConfig[polecat.status]

            return (
              <div
                key={polecat.name}
                className={`
                  p-3 rounded-lg border transition-all
                  ${polecat.status === 'stuck'
                    ? 'border-red-700/50 bg-red-900/20'
                    : polecat.status === 'active'
                    ? 'border-green-700/50 bg-green-900/10'
                    : 'border-slate-600 bg-slate-700/50'
                  }
                  hover:border-slate-500
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  <div className={`w-2 h-2 rounded-full ${config.dot} ${polecat.status === 'active' ? 'animate-pulse' : ''}`} />

                  {/* Polecat name */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {polecat.name}
                    </div>
                    {polecat.currentWork && (
                      <div className="text-xs text-cyan-400 truncate mt-0.5">
                        {polecat.currentWork}
                      </div>
                    )}
                    {polecat.branch && (
                      <div className="text-xs text-gray-500 font-mono truncate mt-0.5">
                        {polecat.branch}
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${config.bg}`}>
                    <config.icon className={`w-3 h-3 ${config.color}`} />
                    <span className={`text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
