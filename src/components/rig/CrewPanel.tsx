import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { Users, Circle, Zap, FolderGit2 } from 'lucide-react'
import type { CommandResult, CrewMember } from '../../hooks/useGastown'

interface CrewPanelProps {
  rigId: string
}

// Parse crew list output
function parseCrewOutput(output: string, rigName: string): CrewMember[] {
  const lines = output.trim().split('\n').filter(Boolean)
  const crew: CrewMember[] = []

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 1 && parts[0]) {
      crew.push({
        name: parts[0].replace(/[^\w-]/g, ''),
        rig: rigName,
        status: line.includes('active') ? 'active' : 'idle',
        worktree: parts[1] || undefined,
      })
    }
  }
  return crew
}

export default function CrewPanel({ rigId }: CrewPanelProps) {
  const { data: crew = [], isPending, error } = useQuery({
    queryKey: ['crew', rigId],
    queryFn: async () => {
      // gt crew list <rig> - lists named crew members
      const result = await invoke<CommandResult>('run_gt_command', {
        cmd: 'gt',
        args: ['crew', 'list', rigId],
      })
      if (result.exit_code !== 0 && !result.stdout) {
        return []
      }
      return parseCrewOutput(result.stdout, rigId)
    },
    refetchInterval: 5000,
    initialData: [], // Prevent indefinite loading state when crew count is 0
  })

  const activeCount = crew.filter((c) => c.status === 'active').length

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">Crew</h2>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {activeCount > 0 && (
            <span className="text-green-400">{activeCount} active</span>
          )}
          <span className="text-gray-400">{crew.length} total</span>
        </div>
      </div>

      {isPending ? (
        <div className="text-center py-8 text-gray-500">
          <div className="animate-pulse">Loading crew...</div>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-400">
          <p>Error loading crew</p>
        </div>
      ) : crew.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No crew members in this rig</p>
          <p className="text-xs mt-1">
            Named crew are persistent workers (vs ephemeral polecats)
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {crew.map((member) => (
            <div
              key={member.name}
              className={`
                flex items-center gap-3 p-3 rounded-lg border transition-all
                ${member.status === 'active'
                  ? 'border-green-700/50 bg-green-900/10'
                  : 'border-slate-600 bg-slate-700/50'
                }
                hover:border-slate-500
              `}
            >
              {/* Status indicator */}
              <div className={`w-2 h-2 rounded-full ${member.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />

              {/* Avatar/icon */}
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Name and details */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white">
                  {member.name}
                </div>
                {member.worktree && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <FolderGit2 className="w-3 h-3" />
                    <span className="font-mono truncate">{member.worktree}</span>
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                member.status === 'active' ? 'bg-green-400/10' : 'bg-gray-400/10'
              }`}>
                {member.status === 'active' ? (
                  <Zap className="w-3 h-3 text-green-400" />
                ) : (
                  <Circle className="w-3 h-3 text-gray-400" />
                )}
                <span className={`text-xs font-medium ${
                  member.status === 'active' ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {member.status === 'active' ? 'Active' : 'Idle'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
