import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

export interface MoleculeStep {
  id: string;
  title: string;
  description?: string;
  status: StepStatus;
  agent?: string;
  started_at?: string;
  completed_at?: string;
  dependencies: string[];
}

export interface Molecule {
  id: string;
  name: string;
  description?: string;
  steps: MoleculeStep[];
  current_step?: string;
  progress: number;
  status: string;
}

/**
 * Hook to get molecule progress for a specific issue
 */
export function useMoleculeProgress(issueId: string | undefined) {
  return useQuery({
    queryKey: ['molecule', 'progress', issueId],
    queryFn: () => invoke<Molecule>('get_molecule_progress', { issueId }),
    enabled: !!issueId,
    refetchInterval: 5000,
  });
}

/**
 * Hook to list all active molecules
 */
export function useActiveMolecules() {
  return useQuery({
    queryKey: ['molecules', 'active'],
    queryFn: () => invoke<Molecule[]>('list_active_molecules'),
    refetchInterval: 10000,
  });
}

/**
 * Get status color for a step
 */
export function getStepStatusColor(status: StepStatus): string {
  switch (status) {
    case 'completed':
      return '#4ecca3';
    case 'in_progress':
      return '#f9c846';
    case 'blocked':
      return '#e94560';
    case 'skipped':
      return '#888';
    default:
      return '#0f3460';
  }
}

/**
 * Get status icon for a step
 */
export function getStepStatusIcon(status: StepStatus): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'in_progress':
      return '●';
    case 'blocked':
      return '✕';
    case 'skipped':
      return '○';
    default:
      return '○';
  }
}
