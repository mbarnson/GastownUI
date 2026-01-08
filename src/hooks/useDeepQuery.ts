import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export interface InstructStatus {
  available: boolean;
  model_path: string | null;
  llama_cli_available: boolean;
}

export interface DeepQueryResponse {
  answer: string;
  context_used: string[];
  latency_ms: number;
}

const INSTRUCT_STATUS_KEY = ['instruct', 'status'];

/**
 * Hook for instruct model status
 */
export function useInstructStatus() {
  return useQuery({
    queryKey: INSTRUCT_STATUS_KEY,
    queryFn: () => invoke<InstructStatus>('get_instruct_status'),
    staleTime: 30000,
  });
}

/**
 * Hook for setting instruct model path
 */
export function useSetInstructModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (path: string) =>
      invoke<InstructStatus>('set_instruct_model', { path }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTRUCT_STATUS_KEY });
    },
  });
}

/**
 * Hook for Deep Query - local LLM analysis of Gas Town state
 */
export function useDeepQuery() {
  const mutation = useMutation({
    mutationFn: (query: string) =>
      invoke<DeepQueryResponse>('query_deep', { query }),
  });

  return {
    query: mutation.mutate,
    queryAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    data: mutation.data,
    error: mutation.error,
    reset: mutation.reset,
  };
}
