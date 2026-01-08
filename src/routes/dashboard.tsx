import { createFileRoute } from '@tanstack/react-router'
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
import { useState } from 'react'
import TmuxPanel from '../components/TmuxPanel'
import QuickCreateModal, { useQuickCreate } from '../components/QuickCreateModal'
import VoiceGasTown, { VoiceButton } from '../components/VoiceGasTown'
import { formatShortcut, shortcuts } from '../hooks/useKeyboardShortcut'
import type { Convoy, ActivityItem, Bead, TownStatus as TownStatusType } from '../types/gastown'
import {
  useAnnouncerInit,
  useConvoyProgressAnnouncer,
  getConvoyDescription,
  getRigDescription,
  getActivityDescription,
  getLandmarkProps,
} from '../lib/voiceover'
import { focusRingClasses } from '../lib/a11y'
import { useReducedMotion, useHighContrast } from '../lib/windowsA11y'

export const Route = createFileRoute('/dashboard')({ component: Dashboard })

function Dashboard() {
  const { data: townStatus, isLoading: townLoading } = useTownStatus()
  const { data: convoys, isLoading: convoysLoading } = useConvoys()
  const { data: activity, isLoading: activityLoading } = useActivityFeed()
  const { data: beads } = useBeads()
  const quickCreate = useQuickCreate()
  const [showVoicePanel, setShowVoicePanel] = useState(false)

  const handleCreateBead = (bead: { title: string; type: string; priority: number }) => {
    // In production, this would call the API
    console.log('Creating bead:', bead)
    // Could add to activity feed or refetch beads
  }

  const handleVoiceCommand = async (command: string) => {
    // In production, this would execute the actual gt/bd command
    console.log('Executing voice command:', command)
    // Simulate command execution
    return new Promise<{ success: boolean; output?: string }>((resolve) => {
      setTimeout(() => {
        resolve({ success: true, output: `Executed: ${command}` })
      }, 500)
    })
  }

  // Initialize VoiceOver announcer system
  useAnnouncerInit()

  // Announce convoy progress changes to screen readers
  useConvoyProgressAnnouncer(convoys)

  // Windows accessibility: detect reduced motion and high contrast
  const reducedMotion = useReducedMotion()
  const { isHighContrast } = useHighContrast()

  // Adjust animation classes based on user preferences
  const pulseClass = reducedMotion ? 'opacity-70' : 'animate-pulse'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Quick Create Modal */}
      <QuickCreateModal
        isOpen={quickCreate.isOpen}
        onClose={quickCreate.close}
        onCreate={handleCreateBead}
        defaultRig="GastownUI"
      />

      {/* Voice Panel (slide-over) */}
      {showVoicePanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-50 p-4">
          <VoiceGasTown
            expanded={true}
            onClose={() => setShowVoicePanel(false)}
            onExecuteCommand={handleVoiceCommand}
          />
        </div>
      )}

      {/* Floating Voice Button */}
      {!showVoicePanel && (
        <VoiceButton onClick={() => setShowVoicePanel(true)} />
      )}

      {/* Header */}
      <header className="flex items-center justify-between mb-8" role="banner">
        <div className="flex items-center gap-3">
          <Factory className="w-10 h-10 text-orange-500" aria-hidden="true" />
          <h1 className="text-3xl font-black text-white tracking-tight">
            GAS TOWN
          </h1>
        </div>
        <div className="flex items-center gap-4" role="group" aria-label="Quick actions and status">
          {/* Quick Create Button */}
          <button
            onClick={quickCreate.open}
            className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
            title={`Quick Create (${formatShortcut(shortcuts.quickCreate.key, shortcuts.quickCreate.modifiers)})`}
            aria-label={`Quick Create, shortcut ${formatShortcut(shortcuts.quickCreate.key, shortcuts.quickCreate.modifiers)}`}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">New</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 bg-cyan-700 rounded text-xs" aria-hidden="true">
              {formatShortcut(shortcuts.quickCreate.key, shortcuts.quickCreate.modifiers)}
            </kbd>
          </button>
          <CostTracker status={townStatus} />
          <HealthIndicator status={townStatus} loading={townLoading} />
        </div>
      </header>

      {/* Main Grid */}
      <main
        id="main-content"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        {...getLandmarkProps('main', 'Gas Town Dashboard')}
      >
        {/* Left Column: Town Status & Convoys */}
        <div className="lg:col-span-2 space-y-6">
          <TownStatusPanel status={townStatus} loading={townLoading} />
          <ConvoyDashboard convoys={convoys || []} loading={convoysLoading} />
          <TmuxPanel />
        </div>

        {/* Right Column: Activity Feed */}
        <aside
          className="lg:col-span-1"
          {...getLandmarkProps('complementary', 'Recent activity')}
        >
          <ActivityFeed items={activity || []} loading={activityLoading} />
        </aside>
      </main>
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
      <div
        className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-full"
        role="status"
        aria-label="Loading system status"
      >
        <div className="w-3 h-3 rounded-full bg-slate-500 animate-pulse" aria-hidden="true" />
        <span className="text-slate-300 text-sm font-medium">Loading...</span>
      </div>
    )
  }

  const healthy = status?.healthy ?? false
  const statusText = healthy ? 'Active' : 'Issues detected'
  const statusDescription = healthy
    ? 'All systems operational'
    : 'System requires attention'

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-full ${
        healthy ? 'bg-green-900/50' : 'bg-red-900/50'
      }`}
      role="status"
      aria-label={`System health: ${statusText}. ${statusDescription}`}
    >
      <div
        className={`w-3 h-3 rounded-full ${
          healthy ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
        aria-hidden="true"
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
  const costLabel = costRate > 0
    ? `Cost today: $${costToday.toFixed(2)}, Rate: $${costRate.toFixed(2)} per hour`
    : `Cost today: $${costToday.toFixed(2)}`

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 bg-orange-900/30 border border-orange-500/30 rounded-full"
      role="status"
      aria-label={costLabel}
    >
      <DollarSign className="w-4 h-4 text-orange-400" aria-hidden="true" />
      <span className="text-orange-300 font-mono text-sm" aria-hidden="true">
        ${costToday.toFixed(2)}/day
      </span>
      {costRate > 0 && (
        <span className="text-orange-400 text-xs" aria-hidden="true">
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
      <section
        className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
        aria-labelledby="town-status-heading"
        aria-busy="true"
      >
        <h2 id="town-status-heading" className="sr-only">Town Status - Loading</h2>
        <div className="animate-pulse space-y-4" aria-hidden="true">
          <div className="h-6 bg-slate-700 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-slate-700 rounded" />
            <div className="h-20 bg-slate-700 rounded" />
            <div className="h-20 bg-slate-700 rounded" />
          </div>
        </div>
      </section>
    )
  }

  const rigs = status?.rigs || []
  const activeAgents = status?.active_agents ?? 0
  const runningConvoys = status?.running_convoys ?? 0

  return (
    <section
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
      aria-labelledby="town-status-heading"
    >
      <h2
        id="town-status-heading"
        className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
      >
        <Server className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        Town Status
      </h2>

      <div
        className="grid grid-cols-3 gap-4 mb-6"
        role="group"
        aria-label="Key metrics"
      >
        <StatCard
          icon={<Server className="w-6 h-6 text-cyan-400" aria-hidden="true" />}
          label="Active Rigs"
          value={rigs.length}
          color="cyan"
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-green-400" aria-hidden="true" />}
          label="Running Agents"
          value={activeAgents}
          color="green"
        />
        <StatCard
          icon={<Truck className="w-6 h-6 text-orange-400" aria-hidden="true" />}
          label="Active Convoys"
          value={runningConvoys}
          color="orange"
        />
      </div>

      {/* Rig List */}
      {rigs.length > 0 && (
        <div className="space-y-2">
          <h3 id="rigs-list-heading" className="text-sm font-medium text-slate-300 mb-2">
            Rigs
          </h3>
          <ul aria-labelledby="rigs-list-heading" className="space-y-2">
            {rigs.map((rig) => (
              <li
                key={rig.name}
                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                aria-label={getRigDescription(rig)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full bg-green-500"
                    aria-hidden="true"
                    role="presentation"
                  />
                  <span className="text-white font-medium">{rig.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm" aria-hidden="true">
                  <span className="text-slate-300">
                    {rig.polecats.length} polecats
                  </span>
                  <span className="text-cyan-400">
                    {rig.beads_count.in_progress} active
                  </span>
                  <span className="text-green-400">
                    {rig.beads_count.closed} closed
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
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
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="text-2xl font-bold text-white mt-2" aria-hidden="true">{value}</span>
      <span className="text-xs text-slate-300" aria-hidden="true">{label}</span>
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
      <section
        className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
        aria-labelledby="convoys-heading"
        aria-busy="true"
      >
        <h2 id="convoys-heading" className="sr-only">Convoys in Flight - Loading</h2>
        <div className="animate-pulse space-y-4" aria-hidden="true">
          <div className="h-6 bg-slate-700 rounded w-1/3" />
          <div className="h-24 bg-slate-700 rounded" />
          <div className="h-24 bg-slate-700 rounded" />
        </div>
      </section>
    )
  }

  return (
    <section
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
      aria-labelledby="convoys-heading"
    >
      <h2
        id="convoys-heading"
        className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
      >
        <Truck className="w-5 h-5 text-orange-400" aria-hidden="true" />
        Convoys in Flight
        <span className="sr-only"> - {convoys.length} convoy{convoys.length !== 1 ? 's' : ''}</span>
      </h2>

      {convoys.length === 0 ? (
        <div className="text-center py-8 text-slate-400" role="status">
          <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
          <p>No active convoys</p>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Active convoys">
          {convoys.map((convoy) => (
            <ConvoyCard key={convoy.id} convoy={convoy} />
          ))}
        </ul>
      )}
    </section>
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
    running: <Clock className="w-4 h-4" aria-hidden="true" />,
    completed: <CheckCircle2 className="w-4 h-4" aria-hidden="true" />,
    paused: <Circle className="w-4 h-4" aria-hidden="true" />,
    failed: <AlertCircle className="w-4 h-4" aria-hidden="true" />,
  }

  // Build accessible description for the convoy
  const description = getConvoyDescription(convoy)

  return (
    <li
      className="bg-slate-900/50 border border-slate-600 rounded-lg p-4"
      aria-label={description}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-orange-400" aria-hidden="true" />
          <span className="text-white font-medium">{convoy.name}</span>
        </div>
        <div
          className={`flex items-center gap-1 ${statusColors[convoy.status]}`}
          role="status"
          aria-label={`Status: ${convoy.status}`}
        >
          {statusIcons[convoy.status]}
          <span className="text-sm capitalize" aria-hidden="true">{convoy.status}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-1" aria-hidden="true">
          <span>Progress</span>
          <span>{convoy.progress}%</span>
        </div>
        <div
          className="h-2 bg-slate-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={convoy.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Convoy progress: ${convoy.progress}%`}
        >
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
            style={{ width: `${convoy.progress}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Details */}
      <div className="flex items-center justify-between text-sm" aria-hidden="true">
        <span className="text-slate-300">
          {convoy.beads.length} beads | {convoy.active_polecats} polecats
        </span>
        {convoy.eta && (
          <span className="text-slate-400">ETA: {convoy.eta}</span>
        )}
      </div>

      {/* Bead IDs */}
      <div className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
        {convoy.beads.slice(0, 5).map((beadId) => (
          <span
            key={beadId}
            className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded font-mono"
          >
            {beadId}
          </span>
        ))}
        {convoy.beads.length > 5 && (
          <span className="px-2 py-0.5 text-slate-400 text-xs">
            +{convoy.beads.length - 5} more
          </span>
        )}
      </div>
    </li>
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
      <section
        className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 h-full"
        aria-labelledby="activity-feed-heading"
        aria-busy="true"
      >
        <h2 id="activity-feed-heading" className="sr-only">Activity Feed - Loading</h2>
        <div className="animate-pulse space-y-4" aria-hidden="true">
          <div className="h-6 bg-slate-700 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-700 rounded" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 h-full"
      aria-labelledby="activity-feed-heading"
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          id="activity-feed-heading"
          className="text-lg font-semibold text-white flex items-center gap-2"
        >
          <Activity className="w-5 h-5 text-cyan-400" aria-hidden="true" />
          Activity Feed
        </h2>
        <div
          className="flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-500/30 rounded-full"
          role="status"
          aria-label="Voice commands enabled"
        >
          <Mic className="w-3 h-3 text-green-400" aria-hidden="true" />
          <span className="text-green-400 text-xs" aria-hidden="true">Voice: ON</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-slate-400" role="status">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
          <p>No recent activity</p>
        </div>
      ) : (
        <ul
          className="space-y-2 max-h-96 overflow-y-auto"
          role="log"
          aria-live="polite"
          aria-label="Recent activity events"
        >
          {items.map((item) => (
            <ActivityItemComponent key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}

// Activity Item Component
function ActivityItemComponent({ item }: { item: ActivityItem }) {
  const typeColors = {
    bead_update: 'text-cyan-400',
    merge: 'text-green-400',
    convoy: 'text-orange-400',
    polecat: 'text-purple-400',
    system: 'text-slate-300',
  }

  // Build accessible description
  const description = getActivityDescription(item)

  return (
    <li
      className="flex items-start gap-3 p-2 hover:bg-slate-900/50 rounded-lg transition-colors"
      aria-label={description}
    >
      <time
        dateTime={item.timestamp}
        className="text-slate-400 text-xs font-mono whitespace-nowrap"
        aria-hidden="true"
      >
        {new Date(item.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })}
      </time>
      <span className={`text-sm ${typeColors[item.type]}`} aria-hidden="true">
        {item.message}
      </span>
    </li>
  )
}
