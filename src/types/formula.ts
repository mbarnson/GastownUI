// Types for visual formula/molecule editor

export interface Position {
  x: number
  y: number
}

export interface Step {
  id: string
  title: string
  description: string
  position: Position
  variables: Record<string, VariableBinding>
  status?: 'pending' | 'active' | 'complete' | 'failed'
}

export interface Wire {
  id: string
  from: string // Step ID
  to: string // Step ID
}

export interface VariableBinding {
  name: string
  description: string
  value?: string
  required: boolean
  type: 'string' | 'number' | 'boolean' | 'array'
}

export interface Variable {
  name: string
  description: string
  required: boolean
  type: 'string' | 'number' | 'boolean' | 'array'
  default?: string
}

export interface Formula {
  id: string
  name: string
  description: string
  version: number
  steps: Step[]
  wires: Wire[]
  variables: Variable[]
}

// Default empty formula
export function createEmptyFormula(name: string = 'New Formula'): Formula {
  return {
    id: `formula-${Date.now()}`,
    name,
    description: '',
    version: 1,
    steps: [],
    wires: [],
    variables: [],
  }
}

// Create a new step at position
export function createStep(
  title: string,
  position: Position,
  description: string = ''
): Step {
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    description,
    position,
    variables: {},
    status: 'pending',
  }
}

// Create a wire between steps
export function createWire(fromId: string, toId: string): Wire {
  return {
    id: `wire-${fromId}-${toId}`,
    from: fromId,
    to: toId,
  }
}

// Export formula to TOML format
export function formulaToToml(formula: Formula): string {
  const lines: string[] = []

  // Header
  lines.push(`description = "${escapeToml(formula.description)}"`)
  lines.push(`formula = "${escapeToml(formula.name)}"`)
  lines.push(`type = "workflow"`)
  lines.push(`version = ${formula.version}`)
  lines.push('')

  // Steps
  for (const step of formula.steps) {
    lines.push('[[steps]]')
    lines.push(`id = "${step.id}"`)
    lines.push(`title = "${escapeToml(step.title)}"`)

    // Find dependencies (wires pointing to this step)
    const needs = formula.wires
      .filter((w) => w.to === step.id)
      .map((w) => `"${w.from}"`)

    if (needs.length > 0) {
      lines.push(`needs = [${needs.join(', ')}]`)
    }

    lines.push(`description = """`)
    lines.push(step.description)
    lines.push(`"""`)
    lines.push('')
  }

  // Variables
  for (const variable of formula.variables) {
    lines.push(`[vars.${variable.name}]`)
    lines.push(`description = "${escapeToml(variable.description)}"`)
    lines.push(`required = ${variable.required}`)
    if (variable.default) {
      lines.push(`default = "${escapeToml(variable.default)}"`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// Helper to escape TOML strings
function escapeToml(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
}

// Parse step dependencies into a DAG order
export function topologicalSort(formula: Formula): Step[] {
  const visited = new Set<string>()
  const result: Step[] = []
  const stepMap = new Map(formula.steps.map((s) => [s.id, s]))

  // Build adjacency list (dependencies)
  const deps = new Map<string, string[]>()
  for (const step of formula.steps) {
    deps.set(step.id, [])
  }
  for (const wire of formula.wires) {
    const existing = deps.get(wire.to) || []
    existing.push(wire.from)
    deps.set(wire.to, existing)
  }

  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)

    // Visit dependencies first
    for (const depId of deps.get(id) || []) {
      visit(depId)
    }

    const step = stepMap.get(id)
    if (step) result.push(step)
  }

  for (const step of formula.steps) {
    visit(step.id)
  }

  return result
}

// Validate formula for cycles
export function validateFormula(formula: Formula): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for cycles using DFS
  const visited = new Set<string>()
  const inStack = new Set<string>()

  // Build adjacency list
  const adj = new Map<string, string[]>()
  for (const step of formula.steps) {
    adj.set(step.id, [])
  }
  for (const wire of formula.wires) {
    const existing = adj.get(wire.from) || []
    existing.push(wire.to)
    adj.set(wire.from, existing)
  }

  function hasCycle(id: string): boolean {
    if (inStack.has(id)) return true
    if (visited.has(id)) return false

    visited.add(id)
    inStack.add(id)

    for (const neighbor of adj.get(id) || []) {
      if (hasCycle(neighbor)) return true
    }

    inStack.delete(id)
    return false
  }

  for (const step of formula.steps) {
    if (hasCycle(step.id)) {
      errors.push(`Cycle detected involving step "${step.title}"`)
      break
    }
  }

  // Check for orphan wires
  const stepIds = new Set(formula.steps.map((s) => s.id))
  for (const wire of formula.wires) {
    if (!stepIds.has(wire.from)) {
      errors.push(`Wire references non-existent step: ${wire.from}`)
    }
    if (!stepIds.has(wire.to)) {
      errors.push(`Wire references non-existent step: ${wire.to}`)
    }
  }

  // Check for duplicate step IDs
  const seenIds = new Set<string>()
  for (const step of formula.steps) {
    if (seenIds.has(step.id)) {
      errors.push(`Duplicate step ID: ${step.id}`)
    }
    seenIds.add(step.id)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
