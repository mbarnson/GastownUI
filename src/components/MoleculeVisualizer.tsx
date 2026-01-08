import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Move,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import type { Step, Wire, Position, Formula } from '../types/formula'

/**
 * MoleculeVisualizer - Interactive zoomable/pannable DAG visualization
 *
 * Features:
 * - Zoom in/out with scroll wheel and buttons
 * - Pan by dragging or middle-click
 * - Step status coloring
 * - Click-to-inspect step details
 * - Auto-layout for DAG nodes
 */

interface MoleculeVisualizerProps {
  formula: Formula
  /** Called when a step is selected for inspection */
  onSelectStep?: (step: Step | null) => void
  /** Currently selected step ID */
  selectedStepId?: string | null
  /** Minimum zoom level (default 0.25) */
  minZoom?: number
  /** Maximum zoom level (default 2) */
  maxZoom?: number
  /** Whether to show minimap (default true) */
  showMinimap?: boolean
  className?: string
}

// Status colors for step nodes
const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  pending: {
    bg: 'bg-slate-800',
    border: 'border-slate-600',
    text: 'text-slate-400',
  },
  active: {
    bg: 'bg-yellow-900/30',
    border: 'border-yellow-500',
    text: 'text-yellow-400',
  },
  complete: {
    bg: 'bg-green-900/30',
    border: 'border-green-500',
    text: 'text-green-400',
  },
  failed: {
    bg: 'bg-red-900/30',
    border: 'border-red-500',
    text: 'text-red-400',
  },
}

// Status icons
const StatusIcon = ({ status }: { status?: Step['status'] }) => {
  switch (status) {
    case 'active':
      return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />
    case 'complete':
      return <CheckCircle2 className="w-4 h-4 text-green-400" />
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-400" />
    default:
      return <Circle className="w-4 h-4 text-slate-500" />
  }
}

export default function MoleculeVisualizer({
  formula,
  onSelectStep,
  selectedStepId,
  minZoom = 0.25,
  maxZoom = 2,
  showMinimap = true,
  className = '',
}: MoleculeVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Position>({ x: 50, y: 50 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 })
  const [inspectedStep, setInspectedStep] = useState<Step | null>(null)

  // Auto-layout steps into DAG positions
  const layoutPositions = useMemo(() => {
    const positions = new Map<string, Position>()
    const levels = new Map<string, number>()

    // Build dependency graph
    const deps = new Map<string, Set<string>>()
    const children = new Map<string, Set<string>>()

    formula.steps.forEach((step) => {
      deps.set(step.id, new Set())
      children.set(step.id, new Set())
    })

    formula.wires.forEach((wire) => {
      deps.get(wire.to)?.add(wire.from)
      children.get(wire.from)?.add(wire.to)
    })

    // Calculate levels (topological order)
    const calculateLevel = (stepId: string, visited = new Set<string>()): number => {
      if (visited.has(stepId)) return 0
      if (levels.has(stepId)) return levels.get(stepId)!

      visited.add(stepId)
      const stepDeps = deps.get(stepId) || new Set()

      let maxDepLevel = -1
      stepDeps.forEach((depId) => {
        maxDepLevel = Math.max(maxDepLevel, calculateLevel(depId, visited))
      })

      const level = maxDepLevel + 1
      levels.set(stepId, level)
      return level
    }

    formula.steps.forEach((step) => calculateLevel(step.id))

    // Group steps by level
    const levelGroups = new Map<number, string[]>()
    levels.forEach((level, stepId) => {
      if (!levelGroups.has(level)) levelGroups.set(level, [])
      levelGroups.get(level)!.push(stepId)
    })

    // Position steps
    const nodeWidth = 180
    const nodeHeight = 80
    const horizontalGap = 100
    const verticalGap = 60

    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b)
    sortedLevels.forEach((level) => {
      const stepsAtLevel = levelGroups.get(level) || []
      const totalHeight = stepsAtLevel.length * nodeHeight + (stepsAtLevel.length - 1) * verticalGap
      const startY = -totalHeight / 2

      stepsAtLevel.forEach((stepId, index) => {
        positions.set(stepId, {
          x: level * (nodeWidth + horizontalGap),
          y: startY + index * (nodeHeight + verticalGap),
        })
      })
    })

    return positions
  }, [formula.steps, formula.wires])

  // Handle zoom
  const handleZoom = useCallback(
    (delta: number, centerX?: number, centerY?: number) => {
      setZoom((prev) => {
        const newZoom = Math.max(minZoom, Math.min(maxZoom, prev + delta))

        // Zoom towards center if coordinates provided
        if (centerX !== undefined && centerY !== undefined && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const mx = centerX - rect.left
          const my = centerY - rect.top

          const scale = newZoom / prev
          setPan((p) => ({
            x: mx - (mx - p.x) * scale,
            y: my - (my - p.y) * scale,
          }))
        }

        return newZoom
      })
    },
    [minZoom, maxZoom]
  )

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      handleZoom(delta, e.clientX, e.clientY)
    },
    [handleZoom]
  )

  // Handle pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey) || e.button === 0) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        })
      }
    },
    [isPanning, panStart]
  )

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Fit to view
  const handleFitToView = useCallback(() => {
    if (!containerRef.current || formula.steps.length === 0) return

    const rect = containerRef.current.getBoundingClientRect()
    const positions = Array.from(layoutPositions.values())

    const minX = Math.min(...positions.map((p) => p.x))
    const maxX = Math.max(...positions.map((p) => p.x)) + 180
    const minY = Math.min(...positions.map((p) => p.y))
    const maxY = Math.max(...positions.map((p) => p.y)) + 80

    const graphWidth = maxX - minX + 100
    const graphHeight = maxY - minY + 100

    const scaleX = rect.width / graphWidth
    const scaleY = rect.height / graphHeight
    const newZoom = Math.max(minZoom, Math.min(maxZoom, Math.min(scaleX, scaleY) * 0.9))

    setZoom(newZoom)
    setPan({
      x: rect.width / 2 - ((minX + maxX) / 2) * newZoom,
      y: rect.height / 2 - ((minY + maxY) / 2) * newZoom,
    })
  }, [formula.steps, layoutPositions, minZoom, maxZoom])

  // Handle step click
  const handleStepClick = useCallback(
    (step: Step, e: React.MouseEvent) => {
      e.stopPropagation()
      setInspectedStep(step)
      onSelectStep?.(step)
    },
    [onSelectStep]
  )

  // Close inspector
  const handleCloseInspector = useCallback(() => {
    setInspectedStep(null)
    onSelectStep?.(null)
  }, [onSelectStep])

  // Get step position
  const getStepPosition = (stepId: string): Position => {
    return layoutPositions.get(stepId) || { x: 0, y: 0 }
  }

  // Get wire path
  const getWirePath = (wire: Wire): string => {
    const from = getStepPosition(wire.from)
    const to = getStepPosition(wire.to)

    const startX = from.x + 180
    const startY = from.y + 40
    const endX = to.x
    const endY = to.y + 40

    const midX = (startX + endX) / 2

    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
  }

  // Initial fit
  useEffect(() => {
    handleFitToView()
  }, []) // Only on mount

  return (
    <div className={`relative bg-slate-900 overflow-hidden ${className}`}>
      {/* Canvas */}
      <div
        ref={containerRef}
        className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #334155 1px, transparent 1px),
              linear-gradient(to bottom, #334155 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x % (20 * zoom)}px ${pan.y % (20 * zoom)}px`,
          }}
        />

        {/* SVG for wires */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Wire definitions */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#06b6d4" />
            </marker>
          </defs>

          {/* Wires */}
          {formula.wires.map((wire) => {
            const fromStep = formula.steps.find((s) => s.id === wire.from)
            const toStep = formula.steps.find((s) => s.id === wire.to)

            // Determine wire color based on status
            let wireColor = '#06b6d4' // cyan default
            if (fromStep?.status === 'complete') wireColor = '#22c55e' // green
            if (fromStep?.status === 'failed') wireColor = '#ef4444' // red
            if (fromStep?.status === 'active') wireColor = '#eab308' // yellow

            return (
              <path
                key={wire.id}
                d={getWirePath(wire)}
                stroke={wireColor}
                strokeWidth={2}
                fill="none"
                markerEnd="url(#arrowhead)"
                className="transition-colors duration-200"
              />
            )
          })}
        </svg>

        {/* Step nodes */}
        <div
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {formula.steps.map((step) => {
            const pos = getStepPosition(step.id)
            const colors = statusColors[step.status || 'pending']
            const isSelected = selectedStepId === step.id || inspectedStep?.id === step.id

            return (
              <div
                key={step.id}
                className={`
                  absolute w-[180px] rounded-lg border-2 shadow-lg
                  cursor-pointer transition-all duration-200
                  ${colors.bg} ${colors.border}
                  ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : ''}
                  hover:shadow-xl
                `}
                style={{
                  left: pos.x,
                  top: pos.y,
                }}
                onClick={(e) => handleStepClick(step, e)}
              >
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
                  <StatusIcon status={step.status} />
                  <span className={`text-sm font-medium truncate flex-1 ${colors.text}`}>
                    {step.title}
                  </span>
                </div>

                {/* Body */}
                <div className="px-3 py-2">
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {step.description || 'No description'}
                  </p>
                </div>

                {/* Connectors */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-700 border-2 border-slate-500 rounded-full" />
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-600 border-2 border-cyan-400 rounded-full" />
              </div>
            )
          })}
        </div>

        {/* Empty state */}
        {formula.steps.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No steps in this molecule</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => handleZoom(0.2)}
          className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleZoom(-0.2)}
          className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleFitToView}
          className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          title="Fit to view"
        >
          <Maximize className="w-5 h-5" />
        </button>
        <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-xs text-center">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Minimap */}
      {showMinimap && formula.steps.length > 0 && (
        <div className="absolute bottom-4 right-4 w-32 h-24 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
          <svg className="w-full h-full" viewBox="-100 -100 500 300">
            {formula.wires.map((wire) => (
              <path
                key={wire.id}
                d={getWirePath(wire)}
                stroke="#334155"
                strokeWidth={4}
                fill="none"
              />
            ))}
            {formula.steps.map((step) => {
              const pos = getStepPosition(step.id)
              return (
                <rect
                  key={step.id}
                  x={pos.x}
                  y={pos.y}
                  width={180}
                  height={80}
                  rx={4}
                  fill={step.status === 'complete' ? '#22c55e' : step.status === 'active' ? '#eab308' : '#475569'}
                  opacity={0.8}
                />
              )
            })}
          </svg>
        </div>
      )}

      {/* Step Inspector Panel */}
      {inspectedStep && (
        <div className="absolute top-4 left-4 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <StatusIcon status={inspectedStep.status} />
              <h3 className="text-white font-semibold">{inspectedStep.title}</h3>
            </div>
            <button
              onClick={handleCloseInspector}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Status */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">Status</label>
              <p className={statusColors[inspectedStep.status || 'pending'].text}>
                {inspectedStep.status || 'pending'}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">Description</label>
              <p className="text-slate-300 text-sm">
                {inspectedStep.description || 'No description'}
              </p>
            </div>

            {/* Variables */}
            {Object.keys(inspectedStep.variables).length > 0 && (
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider">Variables</label>
                <div className="mt-2 space-y-1">
                  {Object.entries(inspectedStep.variables).map(([key, binding]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm bg-slate-900/50 px-2 py-1 rounded"
                    >
                      <span className="text-cyan-400">{binding.name}</span>
                      <span className="text-slate-400 truncate max-w-[150px]">
                        {binding.value || '(unset)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider">Dependencies</label>
              <div className="mt-2 space-y-1">
                {formula.wires
                  .filter((w) => w.to === inspectedStep.id)
                  .map((wire) => {
                    const depStep = formula.steps.find((s) => s.id === wire.from)
                    return (
                      <div
                        key={wire.id}
                        className="flex items-center gap-2 text-sm text-slate-400"
                        onClick={() => depStep && handleStepClick(depStep, { stopPropagation: () => {} } as any)}
                      >
                        <ChevronRight className="w-3 h-3" />
                        <span className="hover:text-cyan-400 cursor-pointer">
                          {depStep?.title || wire.from}
                        </span>
                      </div>
                    )
                  })}
                {formula.wires.filter((w) => w.to === inspectedStep.id).length === 0 && (
                  <p className="text-slate-500 text-sm">No dependencies</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help hint */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-600">
        Scroll to zoom | Drag to pan | Click step to inspect
      </div>
    </div>
  )
}

/**
 * Compact molecule status display
 */
interface MoleculeStatusProps {
  formula: Formula
  className?: string
}

export function MoleculeStatus({ formula, className = '' }: MoleculeStatusProps) {
  const completed = formula.steps.filter((s) => s.status === 'complete').length
  const active = formula.steps.filter((s) => s.status === 'active').length
  const failed = formula.steps.filter((s) => s.status === 'failed').length
  const total = formula.steps.length

  const progress = total > 0 ? (completed / total) * 100 : 0

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">
          {completed}/{total} steps
        </span>
        <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {active > 0 && (
        <div className="flex items-center gap-1 text-yellow-400 text-sm">
          <Clock className="w-4 h-4 animate-spin" />
          <span>{active} active</span>
        </div>
      )}

      {failed > 0 && (
        <div className="flex items-center gap-1 text-red-400 text-sm">
          <XCircle className="w-4 h-4" />
          <span>{failed} failed</span>
        </div>
      )}
    </div>
  )
}
