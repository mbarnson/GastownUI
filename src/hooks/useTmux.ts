import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { TmuxSession, TmuxSessionDetail, TmuxPane } from '../types/tmux'

// List all tmux sessions
export function useTmuxSessions(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['tmux', 'sessions'],
    queryFn: () => invoke<TmuxSession[]>('list_tmux_sessions'),
    refetchInterval: options?.refetchInterval ?? 3000,
  })
}

// Get detailed info for a specific session
export function useTmuxSessionDetail(
  sessionName: string | null,
  options?: { refetchInterval?: number }
) {
  return useQuery({
    queryKey: ['tmux', 'session', sessionName],
    queryFn: () =>
      sessionName
        ? invoke<TmuxSessionDetail>('get_session_details', { sessionName })
        : Promise.reject('No session selected'),
    enabled: !!sessionName,
    refetchInterval: options?.refetchInterval ?? 2000,
  })
}

// Get panes for a session
export function useTmuxPanes(sessionName: string | null) {
  return useQuery({
    queryKey: ['tmux', 'panes', sessionName],
    queryFn: () =>
      sessionName
        ? invoke<TmuxPane[]>('get_tmux_panes', { sessionName })
        : Promise.reject('No session selected'),
    enabled: !!sessionName,
    refetchInterval: 2000,
  })
}

// Capture pane content
export function useTmuxPaneContent(
  target: string | null,
  options?: { lines?: number; refetchInterval?: number }
) {
  return useQuery({
    queryKey: ['tmux', 'pane-content', target, options?.lines],
    queryFn: () =>
      target
        ? invoke<string>('capture_tmux_pane', {
            target,
            lines: options?.lines ?? 30,
          })
        : Promise.reject('No pane selected'),
    enabled: !!target,
    refetchInterval: options?.refetchInterval ?? 1000,
  })
}

// Attach to session mutation
export function useAttachTmuxSession() {
  return useMutation({
    mutationFn: (sessionName: string) =>
      invoke('attach_tmux_session', { sessionName }),
  })
}

// Copy connection string to clipboard
export function useCopyConnectionString() {
  return useMutation({
    mutationFn: async (connectionString: string) => {
      await navigator.clipboard.writeText(connectionString)
      return connectionString
    },
  })
}
