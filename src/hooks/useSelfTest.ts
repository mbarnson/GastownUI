import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

// Types matching Rust structs
export interface TestCase {
  id: string;
  command: string;
  expected_action: string;
  validation_prompt: string;
}

export interface TestResult {
  test_id: string;
  command: string;
  passed: boolean;
  tester_output: string;
  verifier_output: string;
  duration_ms: number;
}

export interface SelfTestSession {
  id: string;
  status: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  current_test: string | null;
  results: TestResult[];
  duration_ms: number;
}

const SELF_TEST_STATUS_KEY = ['selfTest', 'status'];
const TEST_CASES_KEY = ['selfTest', 'cases'];

/**
 * Hook for self-test session status
 */
export function useSelfTestStatus() {
  return useQuery({
    queryKey: SELF_TEST_STATUS_KEY,
    queryFn: () => invoke<SelfTestSession>('get_self_test_status'),
    refetchInterval: (query) => {
      // Poll more frequently while running
      const data = query.state.data;
      return data?.status === 'running' ? 500 : 5000;
    },
  });
}

/**
 * Hook for available test cases
 */
export function useTestCases() {
  return useQuery({
    queryKey: TEST_CASES_KEY,
    queryFn: () => invoke<TestCase[]>('get_test_cases'),
  });
}

/**
 * Hook for running self-tests
 */
export function useSelfTest() {
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: (testIds?: string[]) =>
      invoke<SelfTestSession>('start_self_test', { testIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SELF_TEST_STATUS_KEY });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => invoke('stop_self_test'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SELF_TEST_STATUS_KEY });
    },
  });

  const addTestMutation = useMutation({
    mutationFn: (testCase: TestCase) =>
      invoke('add_test_case', { testCase }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEST_CASES_KEY });
    },
  });

  return {
    start: startMutation.mutate,
    stop: stopMutation.mutate,
    addTest: addTestMutation.mutate,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    error: startMutation.error || stopMutation.error,
  };
}
