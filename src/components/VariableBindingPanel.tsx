import { useState } from 'react'
import {
  Variable as VariableIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Hash,
  ToggleLeft,
  Type,
  List,
} from 'lucide-react'
import type { Variable, Formula, Step } from '../types/formula'

interface VariableBindingPanelProps {
  formula: Formula
  onFormulaChange: (formula: Formula) => void
  selectedStep: Step | null
  onStepChange: (step: Step) => void
}

export default function VariableBindingPanel({
  formula,
  onFormulaChange,
  selectedStep,
  onStepChange,
}: VariableBindingPanelProps) {
  const [isAddingVariable, setIsAddingVariable] = useState(false)
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null)
  const [newVariable, setNewVariable] = useState<Partial<Variable>>({
    name: '',
    description: '',
    type: 'string',
    required: true,
  })

  // Type icons
  const TypeIcon = ({ type }: { type: Variable['type'] }) => {
    switch (type) {
      case 'number':
        return <Hash className="w-3 h-3" />
      case 'boolean':
        return <ToggleLeft className="w-3 h-3" />
      case 'array':
        return <List className="w-3 h-3" />
      default:
        return <Type className="w-3 h-3" />
    }
  }

  // Add a new variable
  const handleAddVariable = () => {
    if (!newVariable.name) return

    const variable: Variable = {
      name: newVariable.name,
      description: newVariable.description || '',
      type: newVariable.type || 'string',
      required: newVariable.required ?? true,
      default: newVariable.default,
    }

    onFormulaChange({
      ...formula,
      variables: [...formula.variables, variable],
    })

    setNewVariable({
      name: '',
      description: '',
      type: 'string',
      required: true,
    })
    setIsAddingVariable(false)
  }

  // Delete a variable
  const handleDeleteVariable = (name: string) => {
    onFormulaChange({
      ...formula,
      variables: formula.variables.filter((v) => v.name !== name),
    })
  }

  // Update a variable
  const handleUpdateVariable = (oldName: string, updates: Partial<Variable>) => {
    onFormulaChange({
      ...formula,
      variables: formula.variables.map((v) =>
        v.name === oldName ? { ...v, ...updates } : v
      ),
    })
  }

  // Bind variable to step
  const handleBindVariable = (varName: string, value: string) => {
    if (!selectedStep) return

    const updatedStep: Step = {
      ...selectedStep,
      variables: {
        ...selectedStep.variables,
        [varName]: {
          name: varName,
          description: '',
          value,
          required: true,
          type: 'string',
        },
      },
    }

    onStepChange(updatedStep)
  }

  return (
    <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <VariableIcon className="w-5 h-5 text-cyan-400" />
          Variables
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Define variables used in your formula
        </p>
      </div>

      {/* Global Variables */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-400 text-sm font-medium">
              Formula Variables
            </h3>
            <button
              onClick={() => setIsAddingVariable(true)}
              className="p-1 text-slate-400 hover:text-cyan-400 transition-colors"
              title="Add variable"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add variable form */}
          {isAddingVariable && (
            <div className="p-3 bg-slate-900 border border-slate-600 rounded-lg mb-3">
              <input
                type="text"
                placeholder="Variable name"
                value={newVariable.name}
                onChange={(e) =>
                  setNewVariable({ ...newVariable, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-2"
                autoFocus
              />
              <input
                type="text"
                placeholder="Description"
                value={newVariable.description}
                onChange={(e) =>
                  setNewVariable({ ...newVariable, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-2"
              />
              <div className="flex gap-2 mb-2">
                <select
                  value={newVariable.type}
                  onChange={(e) =>
                    setNewVariable({
                      ...newVariable,
                      type: e.target.value as Variable['type'],
                    })
                  }
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="array">Array</option>
                </select>
                <label className="flex items-center gap-2 text-slate-400 text-sm">
                  <input
                    type="checkbox"
                    checked={newVariable.required}
                    onChange={(e) =>
                      setNewVariable({
                        ...newVariable,
                        required: e.target.checked,
                      })
                    }
                    className="rounded border-slate-600"
                  />
                  Required
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddVariable}
                  disabled={!newVariable.name}
                  className="flex-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded transition-colors flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingVariable(false)
                    setNewVariable({
                      name: '',
                      description: '',
                      type: 'string',
                      required: true,
                    })
                  }}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Variables list */}
          {formula.variables.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-4">
              No variables defined
            </p>
          ) : (
            <div className="space-y-2">
              {formula.variables.map((variable) => (
                <div
                  key={variable.name}
                  className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-slate-700 rounded">
                        <TypeIcon type={variable.type} />
                      </div>
                      <span className="text-white font-mono text-sm">
                        {'{{'}
                        {variable.name}
                        {'}}'}
                      </span>
                      {variable.required && (
                        <span className="px-1.5 py-0.5 bg-red-900/30 text-red-400 text-xs rounded">
                          required
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteVariable(variable.name)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs">
                    {variable.description || 'No description'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step-specific bindings */}
        {selectedStep && (
          <div>
            <h3 className="text-slate-400 text-sm font-medium mb-3">
              Step Bindings: {selectedStep.title}
            </h3>

            {formula.variables.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-4">
                Add formula variables first
              </p>
            ) : (
              <div className="space-y-2">
                {formula.variables.map((variable) => (
                  <div
                    key={variable.name}
                    className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg"
                  >
                    <label className="block text-slate-400 text-xs mb-1">
                      {variable.name}
                    </label>
                    <input
                      type="text"
                      placeholder={`Value for ${variable.name}`}
                      value={
                        selectedStep.variables[variable.name]?.value || ''
                      }
                      onChange={(e) =>
                        handleBindVariable(variable.name, e.target.value)
                      }
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="p-3 border-t border-slate-700">
        <p className="text-slate-600 text-xs text-center">
          Use {'{{variable}}'} syntax in step descriptions
        </p>
      </div>
    </div>
  )
}
