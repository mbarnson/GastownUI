import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types matching Rust structs
export type AgentPersona =
  | 'default'
  | 'mayor'
  | 'witness'
  | 'refinery'
  | 'deacon'
  | 'polecat'
  | 'crew';

export interface PersonaInfo {
  id: AgentPersona;
  name: string;
  description: string;
}

// Zustand store for current persona selection (persisted)
interface PersonaState {
  currentPersona: AgentPersona;
  polecatName: string | null;
  setPersona: (persona: AgentPersona) => void;
  setPolecatName: (name: string | null) => void;
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      currentPersona: 'default',
      polecatName: null,
      setPersona: (persona) => set({ currentPersona: persona }),
      setPolecatName: (name) => set({ polecatName: name }),
    }),
    {
      name: 'gastownui-persona',
    }
  )
);

/**
 * Hook to get available personas from backend
 */
export function useVoicePersonas() {
  return useQuery({
    queryKey: ['voice', 'personas'],
    queryFn: () => invoke<PersonaInfo[]>('get_voice_personas'),
    staleTime: Infinity, // Personas don't change
  });
}

/**
 * Hook for managing current persona selection
 */
export function useCurrentPersona() {
  const { currentPersona, polecatName, setPersona, setPolecatName } = usePersonaStore();
  const { data: personas } = useVoicePersonas();

  const currentPersonaInfo = personas?.find((p) => p.id === currentPersona);

  return {
    persona: currentPersona,
    polecatName,
    personaInfo: currentPersonaInfo,
    personas: personas || [],
    setPersona,
    setPolecatName,
  };
}

/**
 * Get persona display info (icon and color)
 */
export function getPersonaStyle(persona: AgentPersona): { icon: string; color: string; bgColor: string } {
  switch (persona) {
    case 'mayor':
      return { icon: '👔', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
    case 'witness':
      return { icon: '👀', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
    case 'refinery':
      return { icon: '🏭', color: 'text-orange-400', bgColor: 'bg-orange-500/20' };
    case 'deacon':
      return { icon: '🌑', color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
    case 'polecat':
      return { icon: '⚡', color: 'text-green-400', bgColor: 'bg-green-500/20' };
    case 'crew':
      return { icon: '🔧', color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
    default:
      return { icon: '🎤', color: 'text-rose-400', bgColor: 'bg-rose-500/20' };
  }
}
