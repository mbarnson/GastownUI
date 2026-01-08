import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Move,
  Link as LinkIcon,
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  GripVertical,
} from 'lucide-react'
import type { Step, Wire, Position, Formula } from '../types/formula'
import { createStep, createWire } from '../types/formula'

interface DesignCanvasProps {
  formula: Formula
  onFormulaChange: (formula: Formula) => void
  selectedStepId: string | null
  onSelectStep: (id: string | null) => void
}

export default function DesignCanvas({
  formula,
  onFormulaChange,
  selectedStepId,
  onSelectStep,
}: DesignCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStepId, setDragStepId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  const [isDrawingWire, setIsDrawingWire] = useState(false)
  const [wireStart, setWireStart] = useState<string | null>(null)
  const [wireEndPos, setWireEndPos] = useState<Position | null>(null)
  const [canvasOffset, setCanvasOffset] = useState<Position>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 })

  // Handle mouse move for dragging steps and drawing wires
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left - canvasOffset.x
      const y = e.clientY - rect.top - canvasOffset.y

      // Panning the canvas
      if (isPanning) {
        const dx = e.clientX - panStart.x
        const dy = e.clientY - panStart.y
        setCanvasOffset({ x: canvasOffset.x + dx, y: canvasOffset.y + dy })
        setPanStart({ x: e.clientX, y: e.clientY })
        return
      }

      // Dragging a step
      if (isDragging && dragStepId) {
        const newSteps = formula.steps.map((step) => {
          if (step.id === dragStepId) {
            return {
              ...step,
              position: {
                x: Math.max(0, x - dragOffset.x),
                y: Math.max(0, y - dragOffset.y),
              },
            }
          }
          return step
        })
        onFormulaChange({ ...formula, steps: newSteps })
      }

      // Drawing a wire
      if (isDrawingWire && wireStart) {
        setWireEndPos({ x, y })
      }
    },
    [
      isDragging,
      dragStepId,
      dragOffset,
      isDrawingWire,
      wireStart,
      formula,
      onFormulaChange,
      canvasOffset,
      isPanning,
      panStart,
    ]
  )

  // Handle mouse up
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false)
        return
      }

      if (isDragging) {
        setIsDragging(false)
        setDragStepId(null)
      }

      if (isDrawingWire && wireStart) {
        // Check if we're over a step
        const canvas = canvasRef.current
        if (canvas) {
          const rect = canvas.getBoundingClientRect()
          const x = e.clientX - rect.left - canvasOffset.x
          const y = e.clientY - rect.top - canvasOffset.y

          // Find step at position
          const targetStep = formula.steps.find(
            (step) =>
              step.id !== wireStart &&
              x >= step.position.x &&
              x <= step.position.x + 200 &&
              y >= step.position.y &&
              y <= step.position.y + 80
          )

          if (targetStep) {
            // Check if wire already exists
            const existingWire = formula.wires.find(
              (w) => w.from === wireStart && w.to === targetStep.id
            )
            if (!existingWire) {
              const newWire = createWire(wireStart, targetStep.id)
              onFormulaChange({
                ...formula,
                wires: [...formula.wires, newWire],
              })
            }
          }
        }

        setIsDrawingWire(false)
        setWireStart(null)
        setWireEndPos(null)
      }
    },
    [isDragging, isDrawingWire, wireStart, formula, onFormulaChange, canvasOffset, isPanning]
  )

  // Handle canvas click for deselection
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelectStep(null)
    }
  }

  // Handle middle-click panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  // Start dragging a step
  const handleStepMouseDown = (
    e: React.MouseEvent,
    stepId: string,
    step: Step
  ) => {
    e.stopPropagation()

    if (e.button === 0 && !e.altKey) {
      const rect = (e.target as HTMLElement)
        .closest('.step-node')
        ?.getBoundingClientRect()
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
      setIsDragging(true)
      setDragStepId(stepId)
      onSelectStep(stepId)
    }
  }

  // Start drawing a wire from a step's output
  const handleStartWire = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation()
    setIsDrawingWire(true)
    setWireStart(stepId)

    const step = formula.steps.find((s) => s.id === stepId)
    if (step) {
      setWireEndPos({
        x: step.position.x + 200,
        y: step.position.y + 40,
      })
    }
  }

  // Delete a step
  const handleDeleteStep = (stepId: string) => {
    const newSteps = formula.steps.filter((s) => s.id !== stepId)
    const newWires = formula.wires.filter(
      (w) => w.from !== stepId && w.to !== stepId
    )
    onFormulaChange({ ...formula, steps: newSteps, wires: newWires })
    onSelectStep(null)
  }

  // Delete a wire
  const handleDeleteWire = (wireId: string) => {
    const newWires = formula.wires.filter((w) => w.id !== wireId)
    onFormulaChange({ ...formula, wires: newWires })
  }

  // Get step center position for wire drawing
  const getStepCenter = (stepId: string, isOutput: boolean): Position => {
    const step = formula.steps.find((s) => s.id === stepId)
    if (!step) return { x: 0, y: 0 }
    return {
      x: isOutput ? step.position.x + 200 : step.position.x,
      y: step.position.y + 40,
    }
  }

  // Status icon for step
  const StatusIcon = ({ status }: { status?: Step['status'] }) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return <Circle className="w-4 h-4 text-slate-500" />
    }
  }

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-slate-900 overflow-hidden cursor-grab"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
      onClick={handleCanvasClick}
      style={{ minHeight: '500px' }}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #334155 1px, transparent 1px),
            linear-gradient(to bottom, #334155 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          transform: `translate(${canvasOffset.x % 20}px, ${canvasOffset.y % 20}px)`,
        }}
      />

      {/* Wires Layer */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
        }}
      >
        {formula.wires.map((wire) => {
          const from = getStepCenter(wire.from, true)
          const to = getStepCenter(wire.to, false)
          const midX = (from.x + to.x) / 2

          return (
            <g key={wire.id} className="pointer-events-auto">
              <path
                d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`}
                stroke="#06b6d4"
                strokeWidth="2"
                fill="none"
                className="cursor-pointer hover:stroke-cyan-300"
                onClick={() => handleDeleteWire(wire.id)}
              />
              {/* Arrow head */}
              <circle cx={to.x} cy={to.y} r="4" fill="#06b6d4" />
            </g>
          )
        })}

        {/* Drawing wire preview */}
        {isDrawingWire && wireStart && wireEndPos && (
          <path
            d={`M ${getStepCenter(wireStart, true).x} ${getStepCenter(wireStart, true).y} L ${wireEndPos.x} ${wireEndPos.y}`}
            stroke="#06b6d4"
            strokeWidth="2"
            strokeDasharray="5,5"
            fill="none"
            className="opacity-50"
          />
        )}
      </svg>

      {/* Steps Layer */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
        }}
      >
        {formula.steps.map((step) => (
          <div
            key={step.id}
            className={`step-node absolute w-[200px] bg-slate-800 border-2 rounded-lg shadow-lg cursor-move select-none transition-shadow ${
              selectedStepId === step.id
                ? 'border-cyan-400 shadow-cyan-400/20'
                : 'border-slate-600 hover:border-slate-500'
            }`}
            style={{
              left: step.position.x,
              top: step.position.y,
            }}
            onMouseDown={(e) => handleStepMouseDown(e, step.id, step)}
          >
            {/* Step Header */}
            <div className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-t-lg border-b border-slate-600">
              <GripVertical className="w-4 h-4 text-slate-500" />
              <StatusIcon status={step.status} />
              <span className="text-white font-medium text-sm truncate flex-1">
                {step.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteStep(step.id)
                }}
                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Step Body */}
            <div className="p-2">
              <p className="text-slate-400 text-xs line-clamp-2">
                {step.description || 'No description'}
              </p>
            </div>

            {/* Input connector (left) */}
            <div
              className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-700 border-2 border-slate-500 rounded-full hover:border-cyan-400 transition-colors"
              title="Input (drop wire here)"
            />

            {/* Output connector (right) */}
            <div
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-600 border-2 border-cyan-400 rounded-full cursor-crosshair hover:bg-cyan-500 transition-colors"
              onMouseDown={(e) => handleStartWire(e, step.id)}
              title="Output (drag to create dependency)"
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {formula.steps.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-slate-500">
            <Plus className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Drag steps from the palette to get started</p>
            <p className="text-sm text-slate-600 mt-1">
              Or double-click to add a step
            </p>
          </div>
        </div>
      )}

      {/* Canvas controls hint */}
      <div className="absolute bottom-4 left-4 text-xs text-slate-600">
        Alt+Drag to pan | Click wire to delete | Drag output to connect
      </div>
    </div>
  )
}
