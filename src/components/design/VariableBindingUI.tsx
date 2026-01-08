import { useState, useCallback } from 'react'
import { Plus, Trash2, AlertTriangle, Check, Variable } from 'lucide-react'
import type { FormulaVariable, Formula } from '../../types/formula'
import { getUsedVariables } from '../../types/formula'

interface VariableBindingUIProps {
  variables: FormulaVariable[]
  formula: Formula
  onChange: (variables: FormulaVariable[]) => void
}

/** Panel for managing formula variables */
export function VariableBindingUI({ variables, formula, onChange }: VariableBindingUIProps) {
  const [newVarName, setNewVarName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Get variables that are used in steps but not defined
  const usedVars = getUsedVariables(formula)
  const definedVarNames = new Set(variables.map(v => v.name))
  const undefinedVars = usedVars.filter(v => !definedVarNames.has(v))

  const handleAddVariable = useCallback(() => {
    const name = newVarName.trim().replace(/[^a-zA-Z0-9_]/g, '_')
    if (!name || definedVarNames.has(name)) return

    onChange([
      ...variables,
      {
        name,
        description: '',
        required: true,
      },
    ])
    setNewVarName('')
    setEditingId(name)
  }, [newVarName, variables, definedVarNames, onChange])

  const handleQuickAdd = useCallback((name: string) => {
    if (definedVarNames.has(name)) return

    onChange([
      ...variables,
      {
        name,
        description: '',
        required: true,
      },
    ])
    setEditingId(name)
  }, [variables, definedVarNames, onChange])

  const handleUpdateVariable = useCallback((index: number, updates: Partial<FormulaVariable>) => {
    const updated = [...variables]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }, [variables, onChange])

  const handleDeleteVariable = useCallback((index: number) => {
    onChange(variables.filter((_, i) => i !== index))
  }, [variables, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddVariable()
    }
  }, [handleAddVariable])

  return (
    <div className="bg-slate-800 border-l border-slate-700 w-80 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-750">
        <div className="flex items-center gap-2">
          <Variable className="w-4 h-4 text-purple-400" />
          <h3 className="font-semibold text-slate-200">Variables</h3>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Define template variables for your formula
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Undefined variables warning */}
        {undefinedVars.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-900/30 border border-amber-700">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Undefined Variables
            </div>
            <p className="text-xs text-amber-300/80 mb-2">
              These variables are used in steps but not defined:
            </p>
            <div className="flex flex-wrap gap-1">
              {undefinedVars.map(v => (
                <button
                  key={v}
                  onClick={() => handleQuickAdd(v)}
                  className="px-2 py-1 rounded bg-amber-800/50 hover:bg-amber-700/50 border border-amber-600 text-amber-200 text-xs font-mono transition-colors"
                  title="Click to define"
                >
                  {`{{${v}}}`}
                  <Plus className="w-3 h-3 inline ml-1" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add new variable */}
        <div>
          <label className="block text-xs text-slate-400 uppercase mb-2">Add Variable</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newVarName}
              onChange={e => setNewVarName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="variable_name"
            />
            <button
              onClick={handleAddVariable}
              disabled={!newVarName.trim() || definedVarNames.has(newVarName.trim())}
              className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Variable list */}
        {variables.length > 0 ? (
          <div className="space-y-3">
            {variables.map((variable, index) => (
              <VariableCard
                key={variable.name}
                variable={variable}
                isEditing={editingId === variable.name}
                isUsed={usedVars.includes(variable.name)}
                onEdit={() => setEditingId(editingId === variable.name ? null : variable.name)}
                onUpdate={(updates) => handleUpdateVariable(index, updates)}
                onDelete={() => handleDeleteVariable(index)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Variable className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No variables defined</p>
            <p className="text-xs mt-1">
              Use <code className="text-purple-400">{`{{name}}`}</code> in step titles/descriptions
            </p>
          </div>
        )}
      </div>

      {/* Usage hint */}
      <div className="px-4 py-3 border-t border-slate-700 bg-slate-750">
        <p className="text-xs text-slate-500">
          Variables become parameters when the formula is run.
          Mark as required to ensure they're always provided.
        </p>
      </div>
    </div>
  )
}

/** Individual variable card */
function VariableCard({
  variable,
  isEditing,
  isUsed,
  onEdit,
  onUpdate,
  onDelete,
}: {
  variable: FormulaVariable
  isEditing: boolean
  isUsed: boolean
  onEdit: () => void
  onUpdate: (updates: Partial<FormulaVariable>) => void
  onDelete: () => void
}) {
  return (
    <div
      className={`
        rounded-lg border transition-colors
        ${isEditing
          ? 'bg-slate-900 border-purple-500'
          : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
        }
      `}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between cursor-pointer"
        onClick={onEdit}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-purple-300">{`{{${variable.name}}}`}</span>
          {variable.required && (
            <span className="text-xs text-red-400">required</span>
          )}
          {isUsed && (
            <Check className="w-3 h-3 text-green-400" title="Used in steps" />
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1 rounded hover:bg-red-600/50 text-slate-400 hover:text-red-300 transition-colors"
          title="Delete variable"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded form */}
      {isEditing && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-700/50 pt-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <input
              type="text"
              value={variable.description}
              onChange={e => onUpdate({ description: e.target.value })}
              className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="What this variable is for"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={variable.required}
                onChange={e => onUpdate({ required: e.target.checked })}
                className="rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
              />
              Required
            </label>
          </div>
          {!variable.required && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Default Value</label>
              <input
                type="text"
                value={variable.default || ''}
                onChange={e => onUpdate({ default: e.target.value || undefined })}
                className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Default if not provided"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
