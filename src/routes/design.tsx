import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Workflow,
  Save,
  Download,
  Upload,
  Trash2,
  Play,
  AlertCircle,
  CheckCircle2,
  Copy,
  FileText,
} from 'lucide-react'
import DesignCanvas from '../components/DesignCanvas'
import StepPalette from '../components/StepPalette'
import VariableBindingPanel from '../components/VariableBindingPanel'
import type { Formula, Step } from '../types/formula'
import {
  createEmptyFormula,
  formulaToToml,
  validateFormula,
} from '../types/formula'

export const Route = createFileRoute('/design')({ component: DesignMode })

function DesignMode() {
  const [formula, setFormula] = useState<Formula>(
    createEmptyFormula('My Workflow')
  )
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [showTomlExport, setShowTomlExport] = useState(false)
  const [tomlOutput, setTomlOutput] = useState('')
  const [validation, setValidation] = useState<{
    valid: boolean
    errors: string[]
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Get selected step
  const selectedStep = formula.steps.find((s) => s.id === selectedStepId) || null

  // Handle formula changes
  const handleFormulaChange = useCallback((newFormula: Formula) => {
    setFormula(newFormula)
    setValidation(null) // Clear validation on change
  }, [])

  // Handle step selection
  const handleSelectStep = useCallback((id: string | null) => {
    setSelectedStepId(id)
  }, [])

  // Handle step changes (from variable binding)
  const handleStepChange = useCallback(
    (updatedStep: Step) => {
      setFormula({
        ...formula,
        steps: formula.steps.map((s) =>
          s.id === updatedStep.id ? updatedStep : s
        ),
      })
    },
    [formula]
  )

  // Export to TOML
  const handleExport = () => {
    const result = validateFormula(formula)
    setValidation(result)

    if (result.valid) {
      const toml = formulaToToml(formula)
      setTomlOutput(toml)
      setShowTomlExport(true)
    }
  }

  // Copy TOML to clipboard
  const handleCopyToml = async () => {
    await navigator.clipboard.writeText(tomlOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Download TOML file
  const handleDownloadToml = () => {
    const blob = new Blob([tomlOutput], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${formula.name.toLowerCase().replace(/\s+/g, '-')}.formula.toml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Clear formula
  const handleClear = () => {
    if (
      formula.steps.length > 0 &&
      !confirm('Clear all steps? This cannot be undone.')
    ) {
      return
    }
    setFormula(createEmptyFormula('My Workflow'))
    setSelectedStepId(null)
    setValidation(null)
    setShowTomlExport(false)
  }

  // Update formula name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormula({ ...formula, name: e.target.value })
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Workflow className="w-6 h-6 text-cyan-400" />
            <span className="text-white font-semibold">Design Mode</span>
          </div>
          <input
            type="text"
            value={formula.name}
            onChange={handleNameChange}
            className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded text-white font-medium focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Validation status */}
          {validation && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded ${
                validation.valid
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-red-900/30 text-red-400'
              }`}
            >
              {validation.valid ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Valid</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    {validation.errors.length} error
                    {validation.errors.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="text-slate-400 text-sm px-3">
            {formula.steps.length} steps | {formula.wires.length} connections
          </div>

          {/* Actions */}
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={handleExport}
            disabled={formula.steps.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            Export TOML
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Step Palette */}
        <StepPalette formula={formula} onFormulaChange={handleFormulaChange} />

        {/* Center: Design Canvas */}
        <div className="flex-1 relative">
          <DesignCanvas
            formula={formula}
            onFormulaChange={handleFormulaChange}
            selectedStepId={selectedStepId}
            onSelectStep={handleSelectStep}
          />

          {/* Validation errors overlay */}
          {validation && !validation.valid && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-500 rounded-lg p-4 max-w-md">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Validation Errors</span>
              </div>
              <ul className="text-red-300 text-sm space-y-1">
                {validation.errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* TOML Export modal */}
          {showTomlExport && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-8">
              <div className="bg-slate-800 border border-slate-600 rounded-xl w-full max-w-2xl max-h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    <span className="text-white font-semibold">
                      TOML Export
                    </span>
                  </div>
                  <button
                    onClick={() => setShowTomlExport(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 font-mono overflow-x-auto">
                    {tomlOutput}
                  </pre>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700">
                  <button
                    onClick={handleCopyToml}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownloadToml}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download .toml
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Variable Binding Panel */}
        <VariableBindingPanel
          formula={formula}
          onFormulaChange={handleFormulaChange}
          selectedStep={selectedStep}
          onStepChange={handleStepChange}
        />
      </div>
    </div>
  )
}
