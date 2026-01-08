import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  Panel,
  MarkerType,
} from '@xyflow/react'
import dagre from 'dagre'
import '@xyflow/react/dist/style.css'

import { useDemoMolecule } from '../hooks/useMolecule'
import type { Molecule, MoleculeStep, StepStatus } from '../types/molecule'
import { stepStatusColors } from '../types/molecule'

// Custom node component for molecule steps
function StepNode({ data }: { data: MoleculeStep & { onClick: () => void } }) {
  const colors = stepStatusColors[data.status]

  return (
    <div
      onClick={data.onClick}
      className="px-4 py-3 rounded-lg shadow-lg cursor-pointer transition-all hover:scale-105 hover:shadow-xl min-w-[160px]"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: 2,
        borderStyle: 'solid',
        color: colors.text,
      }}
    >
      <div className="font-semibold text-sm">{data.title}</div>
      <div className="text-xs mt-1 opacity-80 capitalize">{data.status}</div>
      {data.assignee && (
        <div className="text-xs mt-1 opacity-70">@{data.assignee}</div>
      )}
    </div>
  )
}

const nodeTypes: NodeTypes = {
  step: StepNode,
}

// Layout nodes using dagre
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  const nodeWidth = 180
  const nodeHeight = 80

  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 })

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

// Convert molecule to React Flow nodes and edges
function moleculeToFlow(
  molecule: Molecule,
  onStepClick: (step: MoleculeStep) => void
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = molecule.steps.map((step) => ({
    id: step.id,
    type: 'step',
    position: { x: 0, y: 0 },
    data: { ...step, onClick: () => onStepClick(step) },
  }))

  const edges: Edge[] = molecule.steps.flatMap((step) =>
    step.depends_on.map((depId) => ({
      id: `${depId}-${step.id}`,
      source: depId,
      target: step.id,
      type: 'smoothstep',
      animated: step.status === 'active',
      style: { stroke: '#64748b', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#64748b',
      },
    }))
  )

  return getLayoutedElements(nodes, edges)
}

// Step details panel
function StepDetails({ step, onClose }: { step: MoleculeStep; onClose: () => void }) {
  const colors = stepStatusColors[step.status]

  return (
    <div className="absolute right-4 top-4 w-80 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-10">
      <div
        className="px-4 py-3 flex justify-between items-center"
        style={{ backgroundColor: colors.bg }}
      >
        <h3 className="font-semibold text-white">{step.title}</h3>
        <button
          onClick={onClose}
          className="text-white opacity-70 hover:opacity-100 text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-xs text-slate-400 uppercase">Status</div>
          <div className="text-slate-200 capitalize">{step.status}</div>
        </div>
        {step.description && (
          <div>
            <div className="text-xs text-slate-400 uppercase">Description</div>
            <div className="text-slate-200 text-sm">{step.description}</div>
          </div>
        )}
        {step.assignee && (
          <div>
            <div className="text-xs text-slate-400 uppercase">Assignee</div>
            <div className="text-slate-200">@{step.assignee}</div>
          </div>
        )}
        {step.depends_on.length > 0 && (
          <div>
            <div className="text-xs text-slate-400 uppercase">Dependencies</div>
            <div className="text-slate-200 text-sm">
              {step.depends_on.join(', ')}
            </div>
          </div>
        )}
        {step.started_at && (
          <div>
            <div className="text-xs text-slate-400 uppercase">Started</div>
            <div className="text-slate-200 text-sm">
              {new Date(step.started_at * 1000).toLocaleString()}
            </div>
          </div>
        )}
        {step.completed_at && (
          <div>
            <div className="text-xs text-slate-400 uppercase">Completed</div>
            <div className="text-slate-200 text-sm">
              {new Date(step.completed_at * 1000).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Legend component
function Legend() {
  return (
    <div className="bg-slate-800/90 rounded-lg p-3 border border-slate-700">
      <div className="text-xs text-slate-400 uppercase mb-2">Status Legend</div>
      <div className="space-y-1">
        {(Object.entries(stepStatusColors) as [StepStatus, typeof stepStatusColors[StepStatus]][]).map(
          ([status, colors]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: colors.bg }}
              />
              <span className="text-xs text-slate-300 capitalize">{status}</span>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export function MoleculeVisualizer() {
  const { data: molecule, isLoading, error } = useDemoMolecule()
  const [selectedStep, setSelectedStep] = useState<MoleculeStep | null>(null)

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!molecule) return { initialNodes: [], initialEdges: [] }
    const { nodes, edges } = moleculeToFlow(molecule, setSelectedStep)
    return { initialNodes: nodes, initialEdges: edges }
  }, [molecule])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes/edges when molecule changes
  useMemo(() => {
    if (molecule) {
      const { nodes: newNodes, edges: newEdges } = moleculeToFlow(
        molecule,
        setSelectedStep
      )
      setNodes(newNodes)
      setEdges(newEdges)
    }
  }, [molecule, setNodes, setEdges])

  const onPaneClick = useCallback(() => {
    setSelectedStep(null)
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          Loading molecule...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-red-400">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          Error loading molecule: {String(error)}
        </div>
      </div>
    )
  }

  if (!molecule) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400">
        No molecule data available
      </div>
    )
  }

  return (
    <div className="h-screen w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-slate-900"
      >
        <Background color="#334155" gap={20} />
        <Controls className="bg-slate-800 border-slate-700" />
        <MiniMap
          nodeColor={(node) => {
            const status = (node.data as MoleculeStep).status
            return stepStatusColors[status].bg
          }}
          className="bg-slate-800 border-slate-700"
        />
        <Panel position="top-left" className="m-4">
          <div className="bg-slate-800/90 rounded-lg p-4 border border-slate-700">
            <h2 className="text-lg font-semibold text-slate-200">
              {molecule.name}
            </h2>
            {molecule.description && (
              <p className="text-sm text-slate-400 mt-1">{molecule.description}</p>
            )}
            <div className="text-xs text-slate-500 mt-2">
              {molecule.steps.length} steps •{' '}
              {molecule.steps.filter((s) => s.status === 'complete').length} complete
            </div>
          </div>
        </Panel>
        <Panel position="bottom-left" className="m-4">
          <Legend />
        </Panel>
      </ReactFlow>
      {selectedStep && (
        <StepDetails step={selectedStep} onClose={() => setSelectedStep(null)} />
      )}
    </div>
  )
}
