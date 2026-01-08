import { useState, useRef, useCallback, useEffect } from 'react'
import { useRigs, useRigComparison, RigWithHealth, Polecat } from '../hooks/useGastown'
import { useHaptics } from '../hooks/useHaptics'
import {
  Server,
  Users,
  Circle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  Link2,
  Unlink2,
} from 'lucide-react'

interface RigComparisonViewProps {
  className?: string
}

/**
 * Health status badge component
 */
function HealthBadge({ health }: { health: RigWithHealth['health'] }) {
  const config = {
    healthy: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    degraded: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    unhealthy: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  }

  const { icon: Icon, color, bg } = config[health]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${color} ${bg}`}>
      <Icon className="w-3 h-3" />
      {health}
    </span>
  )
}

/**
 * Polecat status indicator
 */
function PolecatStatus({ polecat }: { polecat: Polecat }) {
  const statusColors: Record<Polecat['status'], string> = {
    active: 'bg-emerald-500',
    idle: 'bg-gray-500',
    stuck: 'bg-red-500',
    offline: 'bg-slate-600',
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded border border-slate-700">
      <div className={`w-2 h-2 rounded-full ${statusColors[polecat.status]}`} />
      <span className="text-sm text-white font-medium">{polecat.name}</span>
      {polecat.current_work && (
        <span className="text-xs text-gray-400 truncate flex-1">{polecat.current_work}</span>
      )}
      <span className={`text-xs ${polecat.status === 'active' ? 'text-emerald-400' : 'text-gray-500'}`}>
        {polecat.status}
      </span>
    </div>
  )
}

/**
 * Single rig panel for comparison view
 */
function RigPanel({
  rig,
  setScrollRef,
  onScroll,
}: {
  rig: RigWithHealth
  setScrollRef: (el: HTMLDivElement | null) => void
  onScroll?: (scrollTop: number) => void
}) {
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (onScroll) {
      onScroll(e.currentTarget.scrollTop)
    }
  }

  return (
    <div className="flex-1 min-w-[300px] max-w-[500px] bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-semibold text-white">{rig.name}</h3>
          </div>
          <HealthBadge health={rig.health} />
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{rig.polecats.length} polecats</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle className="w-3 h-3 fill-current text-cyan-400" />
            <span>{rig.beads_count.open} open</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle className="w-3 h-3 fill-current text-amber-400" />
            <span>{rig.beads_count.in_progress} in progress</span>
          </div>
          {rig.beads_count.blocked > 0 && (
            <div className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="w-3 h-3" />
              <span>{rig.beads_count.blocked} blocked</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={setScrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        onScroll={handleScroll}
      >
        {rig.polecats.length > 0 ? (
          rig.polecats.map((polecat) => (
            <PolecatStatus key={polecat.name} polecat={polecat} />
          ))
        ) : (
          <div className="text-center text-gray-400 py-8">
            No polecats in this rig
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Multi-rig comparison view with synchronized scrolling
 */
export function RigComparisonView({ className = '' }: RigComparisonViewProps) {
  const { data: availableRigs, isLoading: rigsLoading } = useRigs()
  const [selectedRigs, setSelectedRigs] = useState<string[]>([])
  const [syncScroll, setSyncScroll] = useState(true)
  const { data: rigStatuses, isLoading: statusLoading, refetch } = useRigComparison(selectedRigs)
  const { selection } = useHaptics()

  // Refs for scroll synchronization
  const scrollRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const isScrolling = useRef(false)

  // Initialize with first two rigs when available
  useEffect(() => {
    if (availableRigs && availableRigs.length > 0 && selectedRigs.length === 0) {
      // useRigs returns string[] on main
      setSelectedRigs(availableRigs.slice(0, 2))
    }
  }, [availableRigs, selectedRigs.length])

  // Synchronized scroll handler
  const handleScroll = useCallback(
    (sourceRig: string, scrollTop: number) => {
      if (!syncScroll || isScrolling.current) return

      isScrolling.current = true

      // Sync all other panels to the same scroll position
      scrollRefs.current.forEach((ref, rigName) => {
        if (rigName !== sourceRig && ref) {
          ref.scrollTop = scrollTop
        }
      })

      // Reset scrolling flag after a short delay
      requestAnimationFrame(() => {
        isScrolling.current = false
      })
    },
    [syncScroll]
  )

  // Set scroll ref
  const setScrollRef = useCallback((rigName: string, el: HTMLDivElement | null) => {
    scrollRefs.current.set(rigName, el)
  }, [])

  // Toggle rig selection
  const toggleRig = (rigName: string) => {
    selection()
    setSelectedRigs((prev) => {
      if (prev.includes(rigName)) {
        return prev.filter((r) => r !== rigName)
      }
      return [...prev, rigName]
    })
  }

  if (rigsLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
        <span className="ml-2 text-gray-400">Loading rigs...</span>
      </div>
    )
  }

  if (!availableRigs || availableRigs.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <Server className="w-12 h-12 text-gray-600 mb-4" />
        <p className="text-gray-400">No rigs found in this Gas Town instance.</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-4">
        {/* Rig selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400">Compare:</span>
          {availableRigs.map((rigName) => (
            <button
              key={rigName}
              onClick={() => toggleRig(rigName)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedRigs.includes(rigName)
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                  : 'bg-slate-700 text-gray-400 hover:text-white border border-slate-600'
              }`}
            >
              {rigName}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              selection()
              setSyncScroll(!syncScroll)
            }}
            className={`flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors ${
              syncScroll
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-slate-700 text-gray-400'
            }`}
            title={syncScroll ? 'Synchronized scrolling enabled' : 'Synchronized scrolling disabled'}
          >
            {syncScroll ? <Link2 className="w-4 h-4" /> : <Unlink2 className="w-4 h-4" />}
            Sync
          </button>
          <button
            onClick={() => {
              selection()
              refetch()
            }}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-slate-700 text-gray-400 hover:text-white rounded transition-colors"
            title="Refresh all"
          >
            <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Comparison panels */}
      {selectedRigs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <ChevronDown className="w-8 h-8 mx-auto mb-2 animate-bounce" />
            <p>Select rigs above to compare</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {rigStatuses?.map((rig) => (
            <RigPanel
              key={rig.name}
              rig={rig}
              setScrollRef={(el) => setScrollRef(rig.name, el)}
              onScroll={(scrollTop) => handleScroll(rig.name, scrollTop)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default RigComparisonView
