import { useCallback, useState, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnConnect,
  Panel,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import dagre from 'dagre'
import '@xyflow/react/dist/style.css'
import {
  Plus,
  Download,
  Save,
  FileText,
  AlertTriangle,
  Check,
  Undo2,
  Redo2,
  Variable,
} from 'lucide-react'

import { EditableStepNode, type EditableStepNodeData } from './EditableStepNode'
import { StepEditPanel } from './StepEditPanel'
import { VariableBindingUI } from './VariableBindingUI'
import type { Formula, FormulaStep, FormulaVariable } from '../../types/formula'
import {
  createEmptyFormula,
  createNewStep,
  generateStepId,
  formulaToToml,
  validateFormula,
  type ValidationError,
} from '../../types/formula'

const nodeTypes: NodeTypes = {
  step: EditableStepNode,
}

// Layout nodes using dagre
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes: [], edges: [] }

  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  const nodeWidth = 220
  const nodeHeight = 80

  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

interface FormulaDesignerInnerProps {
  initialFormula?: Formula
  onSave?: (formula: Formula) => void
}

function FormulaDesignerInner({ initialFormula, onSave }: FormulaDesignerInnerProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  // Formula state
  const [formula, setFormula] = useState<Formula>(
    initialFormula || createEmptyFormula()
  )
  const [isDirty, setIsDirty] = useState(false)

  // UI state
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [showVariables, setShowVariables] = useState(false)
  const [showTomlPreview, setShowTomlPreview] = useState(false)

  // Validation
  const errors = useMemo(() => validateFormula(formula), [formula])
  const hasErrors = errors.some(e => e.type === 'error')

  // Convert formula steps to nodes/edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node<EditableStepNodeData>[] = formula.steps.map((step) => ({
      id: step.id,
      type: 'step',
      position: { x: 0, y: 0 },
      data: {
        ...step,
        isSelected: step.id === selectedStepId,
        onEdit: (id: string) => setSelectedStepId(id),
        onDelete: handleDeleteStep,
      },
    }))

    const edges: Edge[] = formula.steps.flatMap((step) =>
      step.depends_on.map((depId) => ({
        id: `${depId}-${step.id}`,
        source: depId,
        target: step.id,
        type: 'smoothstep',
        style: { stroke: '#64748b', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#64748b',
        },
      }))
    )

    return getLayoutedElements(nodes, edges)
  }, [formula.steps, selectedStepId])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Sync nodes/edges when formula changes
  useMemo(() => {
    const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
      formula.steps.map((step) => ({
        id: step.id,
        type: 'step' as const,
        position: { x: 0, y: 0 },
        data: {
          ...step,
          isSelected: step.id === selectedStepId,
          onEdit: (id: string) => setSelectedStepId(id),
          onDelete: handleDeleteStep,
        },
      })),
      formula.steps.flatMap((step) =>
        step.depends_on.map((depId) => ({
          id: `${depId}-${step.id}`,
          source: depId,
          target: step.id,
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#64748b',
          },
        }))
      )
    )
    setNodes(newNodes)
    setEdges(newEdges)
  }, [formula, selectedStepId])

  // Handle new edge connection (dependency)
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return

      // Update formula with new dependency
      setFormula((prev) => ({
        ...prev,
        steps: prev.steps.map((step) =>
          step.id === connection.target && !step.depends_on.includes(connection.source!)
            ? { ...step, depends_on: [...step.depends_on, connection.source!] }
            : step
        ),
      }))
      setIsDirty(true)
    },
    []
  )

  // Add new step
  const handleAddStep = useCallback(() => {
    const id = generateStepId()
    const newStep = createNewStep(id)

    setFormula((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }))
    setSelectedStepId(id)
    setIsDirty(true)
  }, [])

  // Delete step
  function handleDeleteStep(id: string) {
    setFormula((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((s) => s.id !== id)
        .map((s) => ({
          ...s,
          depends_on: s.depends_on.filter((d) => d !== id),
        })),
    }))
    if (selectedStepId === id) {
      setSelectedStepId(null)
    }
    setIsDirty(true)
  }

  // Update step
  const handleUpdateStep = useCallback((updatedStep: FormulaStep) => {
    setFormula((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === updatedStep.id ? updatedStep : s)),
    }))
    setIsDirty(true)
  }, [])

  // Update variables
  const handleUpdateVariables = useCallback((variables: FormulaVariable[]) => {
    setFormula((prev) => ({ ...prev, variables }))
    setIsDirty(true)
  }, [])

  // Update formula metadata
  const handleUpdateFormula = useCallback((updates: Partial<Formula>) => {
    setFormula((prev) => ({ ...prev, ...updates }))
    setIsDirty(true)
  }, [])

  // Export to TOML
  const handleExportToml = useCallback(() => {
    const toml = formulaToToml(formula)
    const blob = new Blob([toml], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formula.name.toLowerCase().replace(/\s+/g, '-')}.formula.toml`
    a.click()
    URL.revokeObjectURL(url)
  }, [formula])

  // Save formula
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(formula)
    }
    setIsDirty(false)
  }, [formula, onSave])

  // Get selected step
  const selectedStep = formula.steps.find((s) => s.id === selectedStepId)

  return (
    <div className="h-screen w-full flex bg-slate-900">
      {/* Main canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Formula name */}
            <input
              type="text"
              value={formula.name}
              onChange={(e) => handleUpdateFormula({ name: e.target.value })}
              className="text-lg font-semibold bg-transparent text-slate-200 border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-none px-1"
              placeholder="Formula Name"
            />
            {isDirty && (
              <span className="text-xs text-amber-400">• Unsaved changes</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Validation status */}
            {errors.length > 0 && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  hasErrors
                    ? 'bg-red-900/50 text-red-300'
                    : 'bg-amber-900/50 text-amber-300'
                }`}
                title={errors.map((e) => e.message).join('\n')}
              >
                <AlertTriangle className="w-3 h-3" />
                {errors.length} issue{errors.length !== 1 ? 's' : ''}
              </div>
            )}
            {errors.length === 0 && formula.steps.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-900/50 text-green-300">
                <Check className="w-3 h-3" />
                Valid
              </div>
            )}

            {/* Add step */}
            <button
              onClick={handleAddStep}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Step
            </button>

            {/* Toggle variables */}
            <button
              onClick={() => setShowVariables(!showVariables)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                showVariables
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              <Variable className="w-4 h-4" />
              Variables
            </button>

            {/* Preview TOML */}
            <button
              onClick={() => setShowTomlPreview(!showTomlPreview)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                showTomlPreview
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Preview
            </button>

            {/* Export */}
            <button
              onClick={handleExportToml}
              disabled={hasErrors}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm transition-colors"
              title={hasErrors ? 'Fix errors before exporting' : 'Export as TOML'}
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Save */}
            {onSave && (
              <button
                onClick={handleSave}
                disabled={!isDirty}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.1}
            maxZoom={2}
            className="bg-slate-900"
            deleteKeyCode={['Backspace', 'Delete']}
            onNodeClick={(_, node) => setSelectedStepId(node.id)}
            onPaneClick={() => setSelectedStepId(null)}
          >
            <Background color="#334155" gap={20} />
            <Controls className="bg-slate-800 border-slate-700" />
            <MiniMap
              nodeColor="#3b82f6"
              className="bg-slate-800 border-slate-700"
            />

            {/* Instructions panel */}
            {formula.steps.length === 0 && (
              <Panel position="top-center" className="mt-20">
                <div className="bg-slate-800/90 rounded-lg p-6 border border-slate-700 text-center max-w-md">
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">
                    Design Your Formula
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Click "Add Step" to create workflow steps, then drag between
                    step handles to create dependencies.
                  </p>
                  <button
                    onClick={handleAddStep}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Add Your First Step
                  </button>
                </div>
              </Panel>
            )}

            {/* Formula description */}
            <Panel position="bottom-left" className="m-4">
              <div className="bg-slate-800/90 rounded-lg p-3 border border-slate-700 max-w-xs">
                <textarea
                  value={formula.description}
                  onChange={(e) => handleUpdateFormula({ description: e.target.value })}
                  placeholder="Formula description..."
                  rows={2}
                  className="w-full bg-transparent text-sm text-slate-300 placeholder-slate-500 resize-none focus:outline-none"
                />
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* TOML Preview */}
      {showTomlPreview && (
        <div className="w-96 bg-slate-850 border-l border-slate-700 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-200">TOML Preview</h3>
            <button
              onClick={() => setShowTomlPreview(false)}
              className="text-slate-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-xs text-slate-300 font-mono bg-slate-900">
            {formulaToToml(formula)}
          </pre>
        </div>
      )}

      {/* Step edit panel */}
      {selectedStep && !showVariables && (
        <StepEditPanel
          step={selectedStep}
          allSteps={formula.steps}
          onSave={handleUpdateStep}
          onClose={() => setSelectedStepId(null)}
        />
      )}

      {/* Variables panel */}
      {showVariables && (
        <VariableBindingUI
          variables={formula.variables}
          formula={formula}
          onChange={handleUpdateVariables}
        />
      )}
    </div>
  )
}

/** Wrapper with ReactFlow provider */
export function FormulaDesigner(props: FormulaDesignerInnerProps) {
  return (
    <ReactFlowProvider>
      <FormulaDesignerInner {...props} />
    </ReactFlowProvider>
  )
}
