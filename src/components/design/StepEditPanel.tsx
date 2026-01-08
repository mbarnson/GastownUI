import { useState, useCallback, useEffect } from 'react'
import { X, Save, AlertCircle, Link2 } from 'lucide-react'
import type { FormulaStep } from '../../types/formula'
import { extractVariableRefs } from '../../types/formula'

interface StepEditPanelProps {
  step: FormulaStep
  allSteps: FormulaStep[]
  onSave: (step: FormulaStep) => void
  onClose: () => void
}

/** Side panel for editing step details */
export function StepEditPanel({ step, allSteps, onSave, onClose }: StepEditPanelProps) {
  const [title, setTitle] = useState(step.title)
  const [description, setDescription] = useState(step.description)
  const [isDirty, setIsDirty] = useState(false)

  // Track variable references in the step
  const titleVars = extractVariableRefs(title)
  const descVars = extractVariableRefs(description)
  const allVars = [...new Set([...titleVars, ...descVars])]

  // Other steps that could be dependencies
  const availableDeps = allSteps.filter(s => s.id !== step.id)

  useEffect(() => {
    setTitle(step.title)
    setDescription(step.description)
    setIsDirty(false)
  }, [step])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    setIsDirty(true)
  }, [])

  const handleDescChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value)
    setIsDirty(true)
  }, [])

  const handleSave = useCallback(() => {
    onSave({
      ...step,
      title,
      description,
    })
    setIsDirty(false)
  }, [step, title, description, onSave])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }, [handleSave, onClose])

  const hasErrors = !title.trim()

  return (
    <div
      className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col h-full"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between bg-slate-750">
        <h3 className="font-semibold text-slate-200 truncate">Edit Step</h3>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={hasErrors}
              className={`
                p-1.5 rounded transition-colors
                ${hasErrors
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500 text-white'
                }
              `}
              title="Save (Cmd+S)"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Step ID */}
        <div>
          <label className="block text-xs text-slate-400 uppercase mb-1">Step ID</label>
          <div className="text-sm text-slate-300 font-mono bg-slate-900 px-3 py-2 rounded border border-slate-700">
            {step.id}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs text-slate-400 uppercase mb-1">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className={`
              w-full px-3 py-2 rounded bg-slate-900 border text-slate-200
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${!title.trim() ? 'border-red-500' : 'border-slate-700'}
            `}
            placeholder="e.g., Implement {{feature}}"
          />
          {!title.trim() && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
              <AlertCircle className="w-3 h-3" />
              Title is required
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-slate-400 uppercase mb-1">Description</label>
          <textarea
            value={description}
            onChange={handleDescChange}
            rows={6}
            className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Describe what this step does. Use {{variable}} for template variables."
          />
        </div>

        {/* Variable references */}
        {allVars.length > 0 && (
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-2">Variables Used</label>
            <div className="flex flex-wrap gap-2">
              {allVars.map(v => (
                <span
                  key={v}
                  className="px-2 py-1 rounded bg-purple-900/50 border border-purple-700 text-purple-300 text-xs font-mono"
                >
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Define these in the Variables panel
            </p>
          </div>
        )}

        {/* Dependencies */}
        <div>
          <label className="block text-xs text-slate-400 uppercase mb-2">
            <Link2 className="w-3 h-3 inline mr-1" />
            Dependencies ({step.depends_on.length})
          </label>
          {step.depends_on.length > 0 ? (
            <div className="space-y-1">
              {step.depends_on.map(depId => {
                const depStep = allSteps.find(s => s.id === depId)
                return (
                  <div
                    key={depId}
                    className="flex items-center gap-2 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-slate-300 truncate">
                      {depStep?.title || depId}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">
              No dependencies. Draw an edge from another step to add one.
            </p>
          )}
        </div>

        {/* Available steps to connect */}
        {availableDeps.length > 0 && (
          <div>
            <label className="block text-xs text-slate-400 uppercase mb-2">
              Available Steps
            </label>
            <div className="text-xs text-slate-500 mb-2">
              Drag from another step's bottom handle to this step's top handle to create a dependency.
            </div>
            <div className="space-y-1">
              {availableDeps.map(s => (
                <div
                  key={s.id}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded text-sm
                    ${step.depends_on.includes(s.id)
                      ? 'bg-blue-900/30 border border-blue-700 text-blue-300'
                      : 'bg-slate-900/50 text-slate-400'
                    }
                  `}
                >
                  <div className={`w-2 h-2 rounded-full ${step.depends_on.includes(s.id) ? 'bg-blue-500' : 'bg-slate-600'}`} />
                  <span className="truncate">{s.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-slate-700 bg-slate-750">
        <p className="text-xs text-slate-500">
          Press <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-400">Cmd+S</kbd> to save,{' '}
          <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-400">Esc</kbd> to close
        </p>
      </div>
    </div>
  )
}
