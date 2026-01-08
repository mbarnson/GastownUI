import {
  Zap,
  Circle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  GitBranch,
  ExternalLink,
} from 'lucide-react'

export interface Polecat {
  id: string
  name: string
  status: 'active' | 'idle' | 'stuck' | 'completing'
  branch?: string
  currentIssue?: {
    id: string
    title: string
    progress?: number
  }
  lastActivity?: string
  session?: {
    pid: number
    started: string
  }
}

interface PolecatsPanelProps {
  polecats: Polecat[]
  onPolecatSelect?: (id: string) => void
  onNudge?: (id: string) => void
  onTerminate?: (id: string) => void
}

export default function PolecatsPanel({
  polecats,
  onPolecatSelect,
  onNudge,
  onTerminate,
}: PolecatsPanelProps) {
  const getStatusIndicator = (status: Polecat['status']) => {
    switch (status) {
      case 'active':
        return (
          <div className="relative">
            <Circle className="w-3 h-3 fill-green-400 text-green-400" />
            <span className="absolute inset-0 animate-ping">
              <Circle className="w-3 h-3 fill-green-400/50 text-green-400/50" />
            </span>
          </div>
        )
      case 'idle':
        return <Circle className="w-3 h-3 fill-slate-500 text-slate-500" />
      case 'stuck':
        return <AlertTriangle className="w-3 h-3 text-orange-400" />
      case 'completing':
        return <CheckCircle2 className="w-3 h-3 text-cyan-400" />
    }
  }

  const getStatusText = (status: Polecat['status']) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'idle':
        return 'Idle'
      case 'stuck':
        return 'Stuck'
      case 'completing':
        return 'Completing'
    }
  }

  const formatLastActivity = (timestamp?: string) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  const activeCount = polecats.filter((p) => p.status === 'active').length
  const stuckCount = polecats.filter((p) => p.status === 'stuck').length

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="text-white font-semibold">Polecats</h3>
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
            {activeCount} active
          </span>
          {stuckCount > 0 && (
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">
              {stuckCount} stuck
            </span>
          )}
        </div>
      </div>

      {/* Polecat list */}
      <div className="flex-1 overflow-y-auto">
        {polecats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
            <Zap className="w-12 h-12 mb-2 opacity-50" />
            <p>No polecats spawned</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {polecats.map((polecat) => (
              <div
                key={polecat.id}
                className="p-3 hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => onPolecatSelect?.(polecat.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Status indicator */}
                  <div className="mt-1.5">{getStatusIndicator(polecat.status)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{polecat.name}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          polecat.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : polecat.status === 'stuck'
                              ? 'bg-orange-500/20 text-orange-400'
                              : polecat.status === 'completing'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {getStatusText(polecat.status)}
                      </span>
                    </div>

                    {/* Current work */}
                    {polecat.currentIssue ? (
                      <div className="mb-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-400 truncate">
                            {polecat.currentIssue.title}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 text-xs rounded font-mono">
                            {polecat.currentIssue.id}
                          </span>
                        </div>
                        {polecat.currentIssue.progress !== undefined && (
                          <div className="mt-1.5">
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-500 transition-all"
                                style={{ width: `${polecat.currentIssue.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm mb-2">No active work</p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {polecat.branch && (
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          <span className="font-mono truncate max-w-[120px]">
                            {polecat.branch}
                          </span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatLastActivity(polecat.lastActivity)}
                      </span>
                      {polecat.session && (
                        <span className="flex items-center gap-1">
                          <Terminal className="w-3 h-3" />
                          PID {polecat.session.pid}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {polecat.status === 'stuck' && onNudge && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onNudge(polecat.id)
                        }}
                        className="px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded"
                      >
                        Nudge
                      </button>
                    )}
                    {onTerminate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onTerminate(polecat.id)
                        }}
                        className="px-2 py-1 text-xs bg-slate-600 hover:bg-red-600 text-white rounded"
                      >
                        Kill
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Mock data for development
export const mockPolecats: Polecat[] = [
  {
    id: 'slit',
    name: 'slit',
    status: 'active',
    branch: 'polecat/slit-mk4ny3d5',
    currentIssue: {
      id: 'ga-7ct',
      title: 'Implement Rig View route',
      progress: 40,
    },
    lastActivity: new Date(Date.now() - 2 * 60000).toISOString(),
    session: {
      pid: 41740,
      started: new Date(Date.now() - 3600000).toISOString(),
    },
  },
  {
    id: 'furiosa',
    name: 'furiosa',
    status: 'active',
    branch: 'polecat/furiosa-mk4ng08j',
    currentIssue: {
      id: 'ga-ad4',
      title: 'CI/CD: GitHub Actions',
      progress: 75,
    },
    lastActivity: new Date(Date.now() - 5 * 60000).toISOString(),
    session: {
      pid: 41802,
      started: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
  },
  {
    id: 'dementus',
    name: 'dementus',
    status: 'completing',
    branch: 'polecat/dementus-mk4nzbbj',
    currentIssue: {
      id: 'ga-7dc',
      title: 'Action Intent Parser',
      progress: 95,
    },
    lastActivity: new Date(Date.now() - 1 * 60000).toISOString(),
    session: {
      pid: 41856,
      started: new Date(Date.now() - 1.5 * 3600000).toISOString(),
    },
  },
  {
    id: 'nux',
    name: 'nux',
    status: 'idle',
    branch: 'polecat/nux-mk4nxk9u',
    lastActivity: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'rictus',
    name: 'rictus',
    status: 'stuck',
    branch: 'polecat/rictus-mk4nyf3l',
    currentIssue: {
      id: 'ga-xyz',
      title: 'LFM2.5-Vision integration',
      progress: 60,
    },
    lastActivity: new Date(Date.now() - 15 * 60000).toISOString(),
    session: {
      pid: 41901,
      started: new Date(Date.now() - 45 * 60000).toISOString(),
    },
  },
]
