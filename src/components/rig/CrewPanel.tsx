import {
  Users,
  User,
  Circle,
  Clock,
  GitBranch,
  Plus,
  Settings,
} from 'lucide-react'

export interface CrewMember {
  id: string
  name: string
  role: string
  status: 'available' | 'working' | 'away' | 'offline'
  currentBranch?: string
  currentTask?: {
    id: string
    title: string
  }
  lastSeen?: string
  avatar?: string
}

interface CrewPanelProps {
  crew: CrewMember[]
  onMemberSelect?: (id: string) => void
  onSpawnPolecat?: (memberId: string) => void
  onConfigureMember?: (id: string) => void
}

export default function CrewPanel({
  crew,
  onMemberSelect,
  onSpawnPolecat,
  onConfigureMember,
}: CrewPanelProps) {
  const getStatusColor = (status: CrewMember['status']) => {
    switch (status) {
      case 'available':
        return 'fill-green-400 text-green-400'
      case 'working':
        return 'fill-cyan-400 text-cyan-400'
      case 'away':
        return 'fill-yellow-400 text-yellow-400'
      case 'offline':
        return 'fill-slate-500 text-slate-500'
    }
  }

  const getStatusText = (status: CrewMember['status']) => {
    switch (status) {
      case 'available':
        return 'Available'
      case 'working':
        return 'Working'
      case 'away':
        return 'Away'
      case 'offline':
        return 'Offline'
    }
  }

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const availableCount = crew.filter((m) => m.status === 'available').length
  const workingCount = crew.filter((m) => m.status === 'working').length

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Crew</h3>
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
            {crew.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Circle className="w-2 h-2 fill-green-400 text-green-400" />
            {availableCount}
          </span>
          <span className="flex items-center gap-1">
            <Circle className="w-2 h-2 fill-cyan-400 text-cyan-400" />
            {workingCount}
          </span>
        </div>
      </div>

      {/* Crew list */}
      <div className="flex-1 overflow-y-auto">
        {crew.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
            <Users className="w-12 h-12 mb-2 opacity-50" />
            <p>No crew configured</p>
            <button className="mt-2 flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm">
              <Plus className="w-4 h-4" />
              Add crew member
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {crew.map((member) => (
              <div
                key={member.id}
                className="p-3 hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => onMemberSelect?.(member.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    {/* Status dot */}
                    <Circle
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${getStatusColor(member.status)}`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-medium">{member.name}</span>
                      <span className="text-slate-500 text-xs">{member.role}</span>
                    </div>

                    {/* Current task or status */}
                    {member.currentTask ? (
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <span className="truncate">{member.currentTask.title}</span>
                        <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 text-xs rounded font-mono">
                          {member.currentTask.id}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        {getStatusText(member.status)}
                      </p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                      {member.currentBranch && (
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          <span className="font-mono truncate max-w-[100px]">
                            {member.currentBranch}
                          </span>
                        </span>
                      )}
                      {member.status !== 'working' && member.lastSeen && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatLastSeen(member.lastSeen)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {member.status === 'available' && onSpawnPolecat && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSpawnPolecat(member.id)
                        }}
                        className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded"
                      >
                        Spawn
                      </button>
                    )}
                    {onConfigureMember && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onConfigureMember(member.id)
                        }}
                        className="p-1 text-slate-500 hover:text-white"
                      >
                        <Settings className="w-4 h-4" />
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
export const mockCrew: CrewMember[] = [
  {
    id: 'slit',
    name: 'slit',
    role: 'Worker',
    status: 'working',
    currentBranch: 'polecat/slit-mk4ny3d5',
    currentTask: {
      id: 'ga-7ct',
      title: 'Implement Rig View route',
    },
  },
  {
    id: 'furiosa',
    name: 'furiosa',
    role: 'Worker',
    status: 'working',
    currentBranch: 'polecat/furiosa-mk4ng08j',
    currentTask: {
      id: 'ga-ad4',
      title: 'CI/CD Pipeline',
    },
  },
  {
    id: 'dementus',
    name: 'dementus',
    role: 'Worker',
    status: 'working',
    currentBranch: 'polecat/dementus-mk4nzbbj',
    currentTask: {
      id: 'ga-7dc',
      title: 'Action Intent Parser',
    },
  },
  {
    id: 'nux',
    name: 'nux',
    role: 'Tester',
    status: 'available',
    lastSeen: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'rictus',
    name: 'rictus',
    role: 'Vision',
    status: 'away',
    lastSeen: new Date(Date.now() - 15 * 60000).toISOString(),
  },
]
