import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { Molecule } from '../types/molecule'

export function useMolecules() {
  return useQuery({
    queryKey: ['molecules'],
    queryFn: async () => {
      return invoke<Molecule[]>('list_molecules')
    },
    refetchInterval: 5000,
  })
}

export function useMolecule(id: string | null) {
  return useQuery({
    queryKey: ['molecule', id],
    queryFn: async () => {
      if (!id) return null
      return invoke<Molecule>('get_molecule_details', { id })
    },
    enabled: !!id,
    refetchInterval: 2000,
  })
}

export function useDemoMolecule() {
  return useQuery({
    queryKey: ['demo-molecule'],
    queryFn: async () => {
      return invoke<Molecule>('get_demo_molecule')
    },
  })
}
