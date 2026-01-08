import { useState, useMemo } from 'react'
import {
  Circle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Tag,
  User,
} from 'lucide-react'

export interface Bead {
  id: string
  title: string
  type: 'task' | 'bug' | 'feature' | 'epic'
  status: 'open' | 'in_progress' | 'blocked' | 'closed'
  priority: number
  assignee?: string
  labels?: string[]
  createdAt: string
  updatedAt?: string
  blockedBy?: string[]
}

interface BeadsBrowserProps {
  beads: Bead[]
  onBeadSelect?: (id: string) => void
  onAssign?: (beadId: string, assignee: string) => void
  onStatusChange?: (beadId: string, status: Bead['status']) => void
}

type StatusFilter = 'all' | 'ready' | 'in_progress' | 'blocked'
type TypeFilter = 'all' | 'task' | 'bug' | 'feature' | 'epic'

export default function BeadsBrowser({
  beads,
  onBeadSelect,
  onAssign,
  onStatusChange,
}: BeadsBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'updated' | 'created'>('priority')

  const filteredBeads = useMemo(() => {
    let result = [...beads]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (b) =>
          b.id.toLowerCase().includes(query) ||
          b.title.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter === 'ready') {
      result = result.filter(
        (b) => b.status === 'open' && (!b.blockedBy || b.blockedBy.length === 0)
      )
    } else if (statusFilter === 'in_progress') {
      result = result.filter((b) => b.status === 'in_progress')
    } else if (statusFilter === 'blocked') {
      result = result.filter(
        (b) => b.status === 'blocked' || (b.blockedBy && b.blockedBy.length > 0)
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((b) => b.type === typeFilter)
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'priority') {
        return a.priority - b.priority
      } else if (sortBy === 'updated') {
        return (
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
        )
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return result
  }, [beads, searchQuery, statusFilter, typeFilter, sortBy])

  const getStatusIcon = (status: Bead['status'], blockedBy?: string[]) => {
    if (blockedBy && blockedBy.length > 0) {
      return <AlertTriangle className="w-4 h-4 text-orange-400" />
    }
    switch (status) {
      case 'open':
        return <Circle className="w-4 h-4 text-slate-400" />
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
      case 'blocked':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />
      case 'closed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
    }
  }

  const getTypeColor = (type: Bead['type']) => {
    switch (type) {
      case 'task':
        return 'bg-blue-500/20 text-blue-400'
      case 'bug':
        return 'bg-red-500/20 text-red-400'
      case 'feature':
        return 'bg-purple-500/20 text-purple-400'
      case 'epic':
        return 'bg-orange-500/20 text-orange-400'
    }
  }

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 0:
        return { label: 'P0', color: 'text-red-400' }
      case 1:
        return { label: 'P1', color: 'text-orange-400' }
      case 2:
        return { label: 'P2', color: 'text-yellow-400' }
      case 3:
        return { label: 'P3', color: 'text-slate-400' }
      default:
        return { label: `P${priority}`, color: 'text-slate-500' }
    }
  }

  const counts = {
    ready: beads.filter(
      (b) => b.status === 'open' && (!b.blockedBy || b.blockedBy.length === 0)
    ).length,
    in_progress: beads.filter((b) => b.status === 'in_progress').length,
    blocked: beads.filter(
      (b) => b.status === 'blocked' || (b.blockedBy && b.blockedBy.length > 0)
    ).length,
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Circle className="w-5 h-5 text-cyan-400" />
          <h3 className="text-white font-semibold">Beads</h3>
          <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full">
            {beads.filter((b) => b.status !== 'closed').length} open
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-slate-700/50 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search beads..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <FilterChip
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          >
            All
          </FilterChip>
          <FilterChip
            active={statusFilter === 'ready'}
            onClick={() => setStatusFilter('ready')}
            count={counts.ready}
            color="green"
          >
            Ready
          </FilterChip>
          <FilterChip
            active={statusFilter === 'in_progress'}
            onClick={() => setStatusFilter('in_progress')}
            count={counts.in_progress}
            color="cyan"
          >
            In Progress
          </FilterChip>
          <FilterChip
            active={statusFilter === 'blocked'}
            onClick={() => setStatusFilter('blocked')}
            count={counts.blocked}
            color="orange"
          >
            Blocked
          </FilterChip>
        </div>

        {/* Type filter & sort */}
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All types</option>
            <option value="task">Tasks</option>
            <option value="bug">Bugs</option>
            <option value="feature">Features</option>
            <option value="epic">Epics</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'priority' | 'updated' | 'created')
            }
            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="priority">Sort by priority</option>
            <option value="updated">Sort by updated</option>
            <option value="created">Sort by created</option>
          </select>
        </div>
      </div>

      {/* Beads list */}
      <div className="flex-1 overflow-y-auto">
        {filteredBeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
            <Circle className="w-12 h-12 mb-2 opacity-50" />
            <p>No beads found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filteredBeads.map((bead) => {
              const priority = getPriorityLabel(bead.priority)
              return (
                <div
                  key={bead.id}
                  className="p-3 hover:bg-slate-800/50 transition-colors cursor-pointer"
                  onClick={() => onBeadSelect?.(bead.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Status */}
                    <div className="mt-0.5">
                      {getStatusIcon(bead.status, bead.blockedBy)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold ${priority.color}`}>
                          {priority.label}
                        </span>
                        <span className="text-white font-medium truncate">
                          {bead.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 text-xs rounded font-mono">
                          {bead.id}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 ${getTypeColor(bead.type)} text-xs rounded`}
                        >
                          {bead.type}
                        </span>
                        {bead.assignee && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <User className="w-3 h-3" />
                            {bead.assignee}
                          </span>
                        )}
                        {bead.labels?.map((label) => (
                          <span
                            key={label}
                            className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/50 text-slate-400 text-xs rounded"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {label}
                          </span>
                        ))}
                      </div>

                      {/* Blocked by */}
                      {bead.blockedBy && bead.blockedBy.length > 0 && (
                        <div className="mt-1.5 text-xs text-orange-400">
                          Blocked by: {bead.blockedBy.join(', ')}
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterChip({
  children,
  active,
  onClick,
  count,
  color,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  count?: number
  color?: 'green' | 'cyan' | 'orange' | 'red'
}) {
  const colors = {
    green: 'bg-green-500/20 text-green-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    orange: 'bg-orange-500/20 text-orange-400',
    red: 'bg-red-500/20 text-red-400',
  }

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors
        ${active
          ? color
            ? colors[color]
            : 'bg-cyan-500/20 text-cyan-400'
          : 'bg-slate-800 text-slate-400 hover:text-white'
        }
      `}
    >
      {children}
      {count !== undefined && (
        <span
          className={`
            px-1.5 rounded-full text-[10px] font-bold
            ${active ? 'bg-white/20' : 'bg-slate-700'}
          `}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// Mock data for development
export const mockBeads: Bead[] = [
  {
    id: 'ga-7ct',
    title: 'Implement Rig View route with MQ, Polecats, Crew, Beads panels',
    type: 'feature',
    status: 'in_progress',
    priority: 1,
    assignee: 'slit',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'ga-bpp',
    title: 'Events Stream Watcher',
    type: 'feature',
    status: 'open',
    priority: 1,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'ga-x7v',
    title: 'Voice Command Routing',
    type: 'feature',
    status: 'open',
    priority: 1,
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 'ga-7dc',
    title: 'Action Intent Parser',
    type: 'feature',
    status: 'in_progress',
    priority: 0,
    assignee: 'dementus',
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'ga-ad4',
    title: 'CI/CD: GitHub Actions',
    type: 'task',
    status: 'in_progress',
    priority: 1,
    assignee: 'furiosa',
    createdAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'ga-clk',
    title: 'PRD Sweep: Verify all features',
    type: 'task',
    status: 'open',
    priority: 1,
    assignee: 'nux',
    labels: ['verification'],
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'ga-xyz',
    title: 'LFM2.5-Vision integration',
    type: 'feature',
    status: 'blocked',
    priority: 2,
    assignee: 'rictus',
    blockedBy: ['ga-7dc'],
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'ga-abc',
    title: 'Fix tmux session detection',
    type: 'bug',
    status: 'open',
    priority: 2,
    labels: ['tmux'],
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
]
