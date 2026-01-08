import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Settings,
  RefreshCw,
  LayoutGrid,
  Rows,
} from 'lucide-react'
import MergeQueuePanel, {
  mockMergeRequests,
  type MergeRequest,
} from '../components/rig/MergeQueuePanel'
import PolecatsPanel, {
  mockPolecats,
  type Polecat,
} from '../components/rig/PolecatsPanel'
import CrewPanel, {
  mockCrew,
  type CrewMember,
} from '../components/rig/CrewPanel'
import BeadsBrowser, {
  mockBeads,
  type Bead,
} from '../components/rig/BeadsBrowser'

export const Route = createFileRoute('/rig/$rigId')({
  component: RigViewPage,
})

type LayoutMode = 'grid' | 'list'

function RigViewPage() {
  const { rigId } = Route.useParams()
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // State for panels
  const [mergeRequests, setMergeRequests] = useState<MergeRequest[]>(mockMergeRequests)
  const [polecats] = useState<Polecat[]>(mockPolecats)
  const [crew] = useState<CrewMember[]>(mockCrew)
  const [beads] = useState<Bead[]>(mockBeads)

  const handleReorderMergeQueue = (requests: MergeRequest[]) => {
    setMergeRequests(requests)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  // Rig stats
  const activePolecats = polecats.filter((p) => p.status === 'active').length
  const queuedMRs = mergeRequests.filter((mr) => mr.status !== 'merged').length
  const readyBeads = beads.filter(
    (b) => b.status === 'open' && (!b.blockedBy || b.blockedBy.length === 0)
  ).length

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-700">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-white">{rigId}</h1>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                  <span>{activePolecats} polecats active</span>
                  <span>{queuedMRs} in merge queue</span>
                  <span>{readyBeads} beads ready</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Layout toggle */}
              <div className="flex items-center bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`p-1.5 rounded ${
                    layoutMode === 'grid'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLayoutMode('list')}
                  className={`p-1.5 rounded ${
                    layoutMode === 'list'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Rows className="w-4 h-4" />
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw
                  className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>

              {/* Settings */}
              <button className="p-2 text-slate-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1800px] mx-auto p-6">
        {layoutMode === 'grid' ? (
          /* Grid layout - 2x2 */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Merge Queue */}
            <div className="h-[500px]">
              <MergeQueuePanel
                mergeRequests={mergeRequests}
                onReorder={handleReorderMergeQueue}
                onCancel={(id) => {
                  setMergeRequests((prev) => prev.filter((mr) => mr.id !== id))
                }}
                onRetry={(id) => {
                  setMergeRequests((prev) =>
                    prev.map((mr) =>
                      mr.id === id ? { ...mr, status: 'queued' as const } : mr
                    )
                  )
                }}
              />
            </div>

            {/* Polecats */}
            <div className="h-[500px]">
              <PolecatsPanel
                polecats={polecats}
                onPolecatSelect={(id) => console.log('Select polecat:', id)}
                onNudge={(id) => console.log('Nudge polecat:', id)}
                onTerminate={(id) => console.log('Terminate polecat:', id)}
              />
            </div>

            {/* Crew */}
            <div className="h-[500px]">
              <CrewPanel
                crew={crew}
                onMemberSelect={(id) => console.log('Select crew:', id)}
                onSpawnPolecat={(id) => console.log('Spawn polecat for:', id)}
                onConfigureMember={(id) => console.log('Configure:', id)}
              />
            </div>

            {/* Beads */}
            <div className="h-[500px]">
              <BeadsBrowser
                beads={beads}
                onBeadSelect={(id) => console.log('Select bead:', id)}
              />
            </div>
          </div>
        ) : (
          /* List layout - stacked */
          <div className="space-y-6">
            {/* Merge Queue - Full width */}
            <div className="h-[350px]">
              <MergeQueuePanel
                mergeRequests={mergeRequests}
                onReorder={handleReorderMergeQueue}
                onCancel={(id) => {
                  setMergeRequests((prev) => prev.filter((mr) => mr.id !== id))
                }}
                onRetry={(id) => {
                  setMergeRequests((prev) =>
                    prev.map((mr) =>
                      mr.id === id ? { ...mr, status: 'queued' as const } : mr
                    )
                  )
                }}
              />
            </div>

            {/* Polecats & Crew side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[400px]">
                <PolecatsPanel
                  polecats={polecats}
                  onPolecatSelect={(id) => console.log('Select polecat:', id)}
                  onNudge={(id) => console.log('Nudge polecat:', id)}
                  onTerminate={(id) => console.log('Terminate polecat:', id)}
                />
              </div>
              <div className="h-[400px]">
                <CrewPanel
                  crew={crew}
                  onMemberSelect={(id) => console.log('Select crew:', id)}
                  onSpawnPolecat={(id) => console.log('Spawn polecat for:', id)}
                  onConfigureMember={(id) => console.log('Configure:', id)}
                />
              </div>
            </div>

            {/* Beads - Full width */}
            <div className="h-[500px]">
              <BeadsBrowser
                beads={beads}
                onBeadSelect={(id) => console.log('Select bead:', id)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
