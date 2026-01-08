import { createFileRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Factory,
  Truck,
  Activity,
  DollarSign,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Server,
  Users,
  Mic,
  Plus,
} from 'lucide-react'
import {
  useConvoys,
  useTownStatus,
  useActivityFeed,
  useBeads,
} from '../hooks/useGastown'
import TmuxPanel from '../components/TmuxPanel'
import QuickCreateModal, { useQuickCreate } from '../components/QuickCreateModal'
import { formatShortcut, shortcuts } from '../hooks/useKeyboardShortcut'
import type { Convoy, ActivityItem, Bead, TownStatus as TownStatusType } from '../types/gastown'

export const Route = createFileRoute('/dashboard')({ component: Dashboard })

// Create a query client for this route
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

function Dashboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  )
}

function DashboardContent() {
  const { data: townStatus, isLoading: townLoading } = useTownStatus()
  const { data: convoys, isLoading: convoysLoading } = useConvoys()
  const { data: activity, isLoading: activityLoading } = useActivityFeed()
  const { data: beads } = useBeads()
  const quickCreate = useQuickCreate()

  const handleCreateBead = (bead: { title: string; type: string; priority: number }) => {
    // In production, this would call the API
    console.log('Creating bead:', bead)
    // Could add to activity feed or refetch beads
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Quick Create Modal */}
      <QuickCreateModal
        isOpen={quickCreate.isOpen}
        onClose={quickCreate.close}
        onCreate={handleCreateBead}
        defaultRig="GastownUI"
      />

      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Factory className="w-10 h-10 text-orange-500" />
          <h1 className="text-3xl font-black text-white tracking-tight">
            GAS TOWN
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick Create Button */}
          <button
            onClick={quickCreate.open}
            className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
            title={`Quick Create (${formatShortcut(shortcuts.quickCreate.key, shortcuts.quickCreate.modifiers)})`}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 bg-cyan-700 rounded text-xs">
              {formatShortcut(shortcuts.quickCreate.key, shortcuts.quickCreate.modifiers)}
            </kbd>
          </button>
          <CostTracker status={townStatus} />
          <HealthIndicator status={townStatus} loading={townLoading} />
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Town Status & Convoys */}
        <div className="lg:col-span-2 space-y-6">
          <TownStatusPanel status={townStatus} loading={townLoading} />
          <ConvoyDashboard convoys={convoys || []} loading={convoysLoading} />
          <TmuxPanel />
        </div>

        {/* Right Column: Activity Feed */}
        <div className="lg:col-span-1">
          <ActivityFeed items={activity || []} loading={activityLoading} />
        </div>
      </div>
    </div>
  )
}

// Health Indicator Badge
function HealthIndicator({
  status,
  loading,
}: {
  status?: TownStatusType
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-full">
        <div className="w-3 h-3 rounded-full bg-slate-500 animate-pulse" />
        <span className="text-slate-400 text-sm font-medium">Loading...</span>
      </div>
    )
  }

  const healthy = status?.healthy ?? false
  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full ${
        healthy ? 'bg-green-900/50' : 'bg-red-900/50'
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full ${
          healthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span
        className={`text-sm font-medium ${
          healthy ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {healthy ? 'Active' : 'Issues'}
      </span>
    </div>
  )
}

// Cost Tracker
function CostTracker({ status }: { status?: TownStatusType }) {
  const costToday = status?.cost_today ?? 0
  const costRate = status?.cost_rate ?? 0

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-orange-900/30 border border-orange-500/30 rounded-full">
      <DollarSign className="w-4 h-4 text-orange-400" />
      <span className="text-orange-300 font-mono text-sm">
        ${costToday.toFixed(2)}/day
      </span>
      {costRate > 0 && (
        <span className="text-orange-500/70 text-xs">
          (${costRate.toFixed(2)}/hr)
        </span>
      )}
    </div>
  )
}

// Town Status Panel
function TownStatusPanel({
  status,
  loading,
}: {
  status?: TownStatusType
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-slate-700 rounded" />
            <div className="h-20 bg-slate-700 rounded" />
            <div className="h-20 bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const rigs = status?.rigs || []
  const activeAgents = status?.active_agents ?? 0
  const runningConvoys = status?.running_convoys ?? 0

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Server className="w-5 h-5 text-cyan-400" />
        Town Status
      </h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={<Server className="w-6 h-6 text-cyan-400" />}
          label="Active Rigs"
          value={rigs.length}
          color="cyan"
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-green-400" />}
          label="Running Agents"
          value={activeAgents}
          color="green"
        />
        <StatCard
          icon={<Truck className="w-6 h-6 text-orange-400" />}
          label="Active Convoys"
          value={runningConvoys}
          color="orange"
        />
      </div>

      {/* Rig List */}
      {rigs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Rigs</h3>
          {rigs.map((rig) => (
            <div
              key={rig.name}
              className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-white font-medium">{rig.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-400">
                  {rig.polecats.length} polecats
                </span>
                <span className="text-cyan-400">
                  {rig.beads_count.in_progress} active
                </span>
                <span className="text-green-400">
                  {rig.beads_count.closed} closed
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'cyan' | 'green' | 'orange' | 'red'
}) {
  const bgColors = {
    cyan: 'bg-cyan-900/30 border-cyan-500/30',
    green: 'bg-green-900/30 border-green-500/30',
    orange: 'bg-orange-900/30 border-orange-500/30',
    red: 'bg-red-900/30 border-red-500/30',
  }

  return (
    <div
      className={`p-4 rounded-lg border ${bgColors[color]} flex flex-col items-center justify-center`}
    >
      {icon}
      <span className="text-2xl font-bold text-white mt-2">{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}

// Convoy Dashboard
function ConvoyDashboard({
  convoys,
  loading,
}: {
  convoys: Convoy[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3" />
          <div className="h-24 bg-slate-700 rounded" />
          <div className="h-24 bg-slate-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Truck className="w-5 h-5 text-orange-400" />
        Convoys in Flight
      </h2>

      {convoys.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No active convoys</p>
        </div>
      ) : (
        <div className="space-y-4">
          {convoys.map((convoy) => (
            <ConvoyCard key={convoy.id} convoy={convoy} />
          ))}
        </div>
      )}
    </div>
  )
}

// Convoy Card
function ConvoyCard({ convoy }: { convoy: Convoy }) {
  const statusColors = {
    running: 'text-green-400',
    completed: 'text-cyan-400',
    paused: 'text-yellow-400',
    failed: 'text-red-400',
  }

  const statusIcons = {
    running: <Clock className="w-4 h-4" />,
    completed: <CheckCircle2 className="w-4 h-4" />,
    paused: <Circle className="w-4 h-4" />,
    failed: <AlertCircle className="w-4 h-4" />,
  }

  return (
    <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-orange-400" />
          <span className="text-white font-medium">{convoy.name}</span>
        </div>
        <div
          className={`flex items-center gap-1 ${statusColors[convoy.status]}`}
        >
          {statusIcons[convoy.status]}
          <span className="text-sm capitalize">{convoy.status}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Progress</span>
          <span>{convoy.progress}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
            style={{ width: `${convoy.progress}%` }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">
          {convoy.beads.length} beads | {convoy.active_polecats} polecats
        </span>
        {convoy.eta && (
          <span className="text-slate-500">ETA: {convoy.eta}</span>
        )}
      </div>

      {/* Bead IDs */}
      <div className="mt-2 flex flex-wrap gap-1">
        {convoy.beads.slice(0, 5).map((beadId) => (
          <span
            key={beadId}
            className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded font-mono"
          >
            {beadId}
          </span>
        ))}
        {convoy.beads.length > 5 && (
          <span className="px-2 py-0.5 text-slate-500 text-xs">
            +{convoy.beads.length - 5} more
          </span>
        )}
      </div>
    </div>
  )
}

// Activity Feed
function ActivityFeed({
  items,
  loading,
}: {
  items: ActivityItem[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 h-full">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Activity Feed
        </h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-500/30 rounded-full">
          <Mic className="w-3 h-3 text-green-400" />
          <span className="text-green-400 text-xs">Voice: ON</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No recent activity</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.map((item) => (
            <ActivityItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

// Activity Item
function ActivityItem({ item }: { item: ActivityItem }) {
  const typeColors = {
    bead_update: 'text-cyan-400',
    merge: 'text-green-400',
    convoy: 'text-orange-400',
    polecat: 'text-purple-400',
    system: 'text-slate-400',
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  return (
    <div className="flex items-start gap-3 p-2 hover:bg-slate-900/50 rounded-lg transition-colors">
      <span className="text-slate-500 text-xs font-mono whitespace-nowrap">
        {formatTime(item.timestamp)}
      </span>
      <span className={`text-sm ${typeColors[item.type]}`}>{item.message}</span>
    </div>
  )
}
