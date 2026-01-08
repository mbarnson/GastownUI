/**
 * Setup Detection Hook
 *
 * React hook for FTUE setup detection with automatic polling.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SetupDetector,
  getSetupDetector,
  isTauriEnvironment,
  type SetupState,
  type DependencyInfo,
} from '../lib/setupDetector';

export interface UseSetupResult {
  /** Current setup state */
  state: SetupState;
  /** Whether the system is fully ready */
  isReady: boolean;
  /** Whether detection is currently running */
  isChecking: boolean;
  /** List of missing dependencies */
  missingDeps: DependencyInfo[];
  /** Next step to complete setup */
  nextStep: string | null;
  /** Manually trigger a check */
  refresh: () => Promise<void>;
  /** Start polling for changes */
  startPolling: (intervalMs?: number) => void;
  /** Stop polling */
  stopPolling: () => void;
}

// Mock state for non-Tauri environments
const mockState: SetupState = {
  dependencies: {
    go: { name: 'go', status: 'installed', version: '1.22.0', required: true },
    bd: { name: 'bd', status: 'installed', version: '0.1.0', required: true },
    gt: { name: 'gt', status: 'installed', version: '0.1.0', required: true },
    tmux: { name: 'tmux', status: 'installed', version: '3.4', required: true },
  },
  workspace: {
    exists: true,
    path: '/Users/demo/gt',
    initialized: true,
    rigs: ['GastownUI', 'demo-project'],
    beadsConfigured: true,
  },
  isReady: true,
  lastChecked: Date.now(),
};

/**
 * Hook to access setup detection state
 */
export function useSetup(options?: { autoStart?: boolean; pollInterval?: number }): UseSetupResult {
  const { autoStart = true, pollInterval = 5000 } = options ?? {};

  const [detector] = useState<SetupDetector | null>(() =>
    isTauriEnvironment() ? getSetupDetector() : null
  );

  const [state, setState] = useState<SetupState>(() =>
    detector?.getState() ?? mockState
  );

  const [isChecking, setIsChecking] = useState(false);

  // Subscribe to detector state changes
  useEffect(() => {
    if (!detector) return;

    const unsubscribe = detector.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [detector]);

  // Auto-start polling if enabled
  useEffect(() => {
    if (!detector || !autoStart) return;

    detector.startPolling(pollInterval);

    return () => {
      detector.stopPolling();
    };
  }, [detector, autoStart, pollInterval]);

  const refresh = useCallback(async () => {
    if (!detector) return;

    setIsChecking(true);
    try {
      await detector.check();
    } finally {
      setIsChecking(false);
    }
  }, [detector]);

  const startPolling = useCallback(
    (intervalMs?: number) => {
      detector?.startPolling(intervalMs ?? pollInterval);
    },
    [detector, pollInterval]
  );

  const stopPolling = useCallback(() => {
    detector?.stopPolling();
  }, [detector]);

  const missingDeps = useMemo(() => {
    return Object.values(state.dependencies).filter(
      (dep) => dep.required && dep.status !== 'installed'
    );
  }, [state.dependencies]);

  const nextStep = useMemo(() => {
    if (!detector) return null;
    return detector.getNextSetupStep();
  }, [detector, state]);

  return {
    state,
    isReady: state.isReady,
    isChecking,
    missingDeps,
    nextStep,
    refresh,
    startPolling,
    stopPolling,
  };
}

/**
 * Hook to check a specific dependency
 */
export function useDependency(name: keyof SetupState['dependencies']): DependencyInfo {
  const { state } = useSetup({ autoStart: false });
  return state.dependencies[name];
}

/**
 * Hook to check workspace state
 */
export function useWorkspace() {
  const { state } = useSetup({ autoStart: false });
  return state.workspace;
}

/**
 * Hook that returns true only when system is fully ready
 */
export function useIsSystemReady(): boolean {
  const { isReady } = useSetup();
  return isReady;
}

/**
 * Hook for setup wizard flow
 */
export function useSetupWizard() {
  const { state, missingDeps, nextStep, refresh, isChecking } = useSetup({
    autoStart: true,
    pollInterval: 3000, // Faster polling during setup
  });

  const currentStep = useMemo(() => {
    // Determine current wizard step based on state
    if (missingDeps.length > 0) {
      return {
        phase: 'dependencies' as const,
        title: 'Install Dependencies',
        progress: Object.values(state.dependencies).filter((d) => d.status === 'installed').length,
        total: Object.keys(state.dependencies).length,
      };
    }

    if (!state.workspace?.exists) {
      return {
        phase: 'workspace' as const,
        title: 'Create Workspace',
        progress: 0,
        total: 3,
      };
    }

    if (!state.workspace?.initialized) {
      return {
        phase: 'initialize' as const,
        title: 'Initialize Gas Town',
        progress: 1,
        total: 3,
      };
    }

    if (state.workspace.rigs.length === 0) {
      return {
        phase: 'add-rig' as const,
        title: 'Add First Rig',
        progress: 2,
        total: 3,
      };
    }

    return {
      phase: 'complete' as const,
      title: 'Setup Complete',
      progress: 3,
      total: 3,
    };
  }, [state, missingDeps]);

  return {
    state,
    currentStep,
    missingDeps,
    nextStep,
    refresh,
    isChecking,
    isComplete: currentStep.phase === 'complete',
  };
}
