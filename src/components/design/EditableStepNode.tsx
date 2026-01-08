import { memo, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Pencil, Trash2, GripVertical } from 'lucide-react'
import type { FormulaStep } from '../../types/formula'

export interface EditableStepNodeData extends FormulaStep {
  isSelected: boolean
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

/** Editable step node for design mode with connection handles */
function EditableStepNodeComponent({ data, id, selected }: NodeProps<EditableStepNodeData>) {
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    data.onEdit(id)
  }, [data, id])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    data.onDelete(id)
  }, [data, id])

  const isHighlighted = selected || data.isSelected

  return (
    <div
      className={`
        group relative px-4 py-3 rounded-lg shadow-lg min-w-[200px] max-w-[280px]
        transition-all duration-200
        ${isHighlighted
          ? 'bg-blue-600 border-blue-400 ring-2 ring-blue-400/50'
          : 'bg-slate-700 border-slate-600 hover:bg-slate-650 hover:border-slate-500'
        }
        border-2 cursor-grab active:cursor-grabbing
      `}
    >
      {/* Top handle for incoming dependencies */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-600 hover:!bg-blue-400 hover:!border-blue-500 transition-colors"
      />

      {/* Drag handle indicator */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-30 group-hover:opacity-60 transition-opacity">
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>

      {/* Content */}
      <div className="ml-3">
        <div className="font-semibold text-sm text-white truncate pr-14">
          {data.title}
        </div>
        {data.description && (
          <div className="text-xs text-slate-300 mt-1 line-clamp-2 opacity-80">
            {data.description}
          </div>
        )}
        {data.depends_on.length > 0 && (
          <div className="text-xs text-slate-400 mt-1">
            Needs: {data.depends_on.length} step{data.depends_on.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleEdit}
          className="p-1.5 rounded bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white transition-colors"
          title="Edit step"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded bg-red-600/80 hover:bg-red-500 text-red-200 hover:text-white transition-colors"
          title="Delete step"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom handle for outgoing dependencies */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-600 hover:!bg-green-400 hover:!border-green-500 transition-colors"
      />
    </div>
  )
}

export const EditableStepNode = memo(EditableStepNodeComponent)
