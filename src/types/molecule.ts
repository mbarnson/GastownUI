// Types matching the Rust backend structs for molecules

export type StepStatus = 'pending' | 'active' | 'complete' | 'failed' | 'blocked'

export interface MoleculeStep {
  id: string
  title: string
  description: string | null
  status: StepStatus
  depends_on: string[]
  assignee: string | null
  started_at: number | null
  completed_at: number | null
}

export interface Molecule {
  id: string
  name: string
  description: string | null
  status: string
  steps: MoleculeStep[]
  created_at: number | null
  updated_at: number | null
}

// Step status colors for visualization
export const stepStatusColors: Record<StepStatus, { bg: string; border: string; text: string }> = {
  pending: { bg: '#64748b', border: '#475569', text: '#f1f5f9' },
  active: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
  complete: { bg: '#22c55e', border: '#16a34a', text: '#ffffff' },
  failed: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
  blocked: { bg: '#f97316', border: '#ea580c', text: '#ffffff' },
}
