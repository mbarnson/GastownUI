import { createFileRoute } from '@tanstack/react-router'
import { useBeads, usePolecats, useMergeQueue } from '../../hooks/useGastown'
import MergeQueuePanel from '../../components/rig/MergeQueuePanel'
import PolecatsPanel from '../../components/rig/PolecatsPanel'
import CrewPanel from '../../components/rig/CrewPanel'
import BeadsBrowser from '../../components/rig/BeadsBrowser'
import { Factory, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/rig/$rigId')({
  component: RigView,
})

function RigView() {
  const { rigId } = Route.useParams()

  const {
    data: beads,
    isLoading: beadsLoading,
    error: beadsError,
  } = useBeads(rigId)

  const {
    data: polecats,
    isLoading: polecatsLoading,
    error: polecatsError,
  } = usePolecats(rigId)

  const {
    data: mergeQueue,
    isLoading: mqLoading,
    error: mqError,
  } = useMergeQueue(rigId)

  const isLoading = beadsLoading || polecatsLoading || mqLoading
  const hasError = beadsError || polecatsError || mqError

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Factory className="w-8 h-8 text-orange-400" />
          <h1 className="text-3xl font-bold text-white">
            Rig: <span className="text-orange-400">{rigId}</span>
          </h1>
        </div>
        <p className="text-gray-400">
          Manage merge queue, workers, and issues for this rig
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-gray-400">Loading rig data...</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">
              {(beadsError as Error)?.message ||
                (polecatsError as Error)?.message ||
                (mqError as Error)?.message ||
                'Error loading rig data'}
            </span>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      {!isLoading && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Row: Merge Queue and Polecats */}
          <MergeQueuePanel items={mergeQueue || []} rigId={rigId} />
          <PolecatsPanel polecats={polecats || []} rigId={rigId} />

          {/* Bottom Row: Crew and Beads Browser */}
          <CrewPanel rigId={rigId} />
          <BeadsBrowser beads={beads || []} rigId={rigId} />
        </div>
      )}
    </div>
  )
}
