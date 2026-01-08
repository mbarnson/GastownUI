// Types for Design Mode - Visual formula/molecule editor

import type { StepStatus } from './molecule'

/** Variable definition for a formula template */
export interface FormulaVariable {
  name: string
  description: string
  required: boolean
  default?: string
}

/** Step definition for design mode (editable, not runtime) */
export interface FormulaStep {
  id: string
  title: string
  description: string
  depends_on: string[]  // IDs of steps this depends on
}

/** Complete formula definition */
export interface Formula {
  name: string
  description: string
  type: 'workflow' | 'blueprint'
  version: number
  steps: FormulaStep[]
  variables: FormulaVariable[]
}

/** Design state for a step being edited */
export interface DesignStep extends FormulaStep {
  // Position in the canvas (managed by React Flow but tracked for persistence)
  position: { x: number; y: number }
  // UI state
  isEditing: boolean
  isSelected: boolean
}

/** Design mode state */
export interface DesignState {
  formula: Formula
  steps: DesignStep[]
  selectedStepId: string | null
  isDirty: boolean
}

/** Empty formula template */
export function createEmptyFormula(name: string = 'New Formula'): Formula {
  return {
    name,
    description: '',
    type: 'workflow',
    version: 1,
    steps: [],
    variables: [],
  }
}

/** Create a new step with default values */
export function createNewStep(id: string): FormulaStep {
  return {
    id,
    title: 'New Step',
    description: '',
    depends_on: [],
  }
}

/** Generate unique step ID */
export function generateStepId(): string {
  return `step-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`
}

/** Convert formula to TOML format for Gas Town */
export function formulaToToml(formula: Formula): string {
  const lines: string[] = []

  // Header
  lines.push(`description = "${escapeTomlString(formula.description)}"`)
  lines.push(`formula = "${escapeTomlString(formula.name)}"`)
  lines.push(`type = "${formula.type}"`)
  lines.push(`version = ${formula.version}`)
  lines.push('')

  // Steps
  for (const step of formula.steps) {
    lines.push('[[steps]]')
    lines.push(`id = "${escapeTomlString(step.id)}"`)
    lines.push(`title = "${escapeTomlString(step.title)}"`)

    if (step.depends_on.length > 0) {
      lines.push(`needs = [${step.depends_on.map(d => `"${escapeTomlString(d)}"`).join(', ')}]`)
    }

    lines.push(`description = """`)
    lines.push(step.description)
    lines.push(`"""`)
    lines.push('')
  }

  // Variables
  for (const variable of formula.variables) {
    lines.push(`[vars.${variable.name}]`)
    lines.push(`description = "${escapeTomlString(variable.description)}"`)
    lines.push(`required = ${variable.required}`)
    if (variable.default !== undefined) {
      lines.push(`default = "${escapeTomlString(variable.default)}"`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

/** Escape special characters for TOML strings */
function escapeTomlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

/** Parse variable references in text (e.g., {{feature}}) */
export function extractVariableRefs(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.slice(2, -2)))]
}

/** Get all variable references used in a formula */
export function getUsedVariables(formula: Formula): string[] {
  const used = new Set<string>()

  for (const step of formula.steps) {
    extractVariableRefs(step.title).forEach(v => used.add(v))
    extractVariableRefs(step.description).forEach(v => used.add(v))
  }

  return [...used]
}

/** Validate formula for completeness */
export interface ValidationError {
  type: 'error' | 'warning'
  message: string
  stepId?: string
  field?: string
}

export function validateFormula(formula: Formula): ValidationError[] {
  const errors: ValidationError[] = []

  // Name required
  if (!formula.name.trim()) {
    errors.push({ type: 'error', message: 'Formula name is required', field: 'name' })
  }

  // At least one step
  if (formula.steps.length === 0) {
    errors.push({ type: 'error', message: 'Formula must have at least one step' })
  }

  // Check each step
  const stepIds = new Set(formula.steps.map(s => s.id))
  for (const step of formula.steps) {
    if (!step.title.trim()) {
      errors.push({
        type: 'error',
        message: `Step "${step.id}" must have a title`,
        stepId: step.id,
        field: 'title'
      })
    }

    // Check dependencies exist
    for (const dep of step.depends_on) {
      if (!stepIds.has(dep)) {
        errors.push({
          type: 'error',
          message: `Step "${step.id}" depends on unknown step "${dep}"`,
          stepId: step.id,
          field: 'depends_on'
        })
      }
    }
  }

  // Check for cycles (simplified - just check self-reference)
  for (const step of formula.steps) {
    if (step.depends_on.includes(step.id)) {
      errors.push({
        type: 'error',
        message: `Step "${step.id}" cannot depend on itself`,
        stepId: step.id
      })
    }
  }

  // Check variables are defined
  const definedVars = new Set(formula.variables.map(v => v.name))
  const usedVars = getUsedVariables(formula)
  for (const usedVar of usedVars) {
    if (!definedVars.has(usedVar)) {
      errors.push({
        type: 'warning',
        message: `Variable "{{${usedVar}}}" is used but not defined`,
        field: 'variables'
      })
    }
  }

  return errors
}
