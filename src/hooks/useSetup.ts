import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export interface ToolStatus {
  installed: boolean;
  version: string | null;
  path: string | null;
  error: string | null;
}

export interface PlatformInfo {
  os: string;
  arch: string;
  package_manager: string | null;
}

export interface SetupStatus {
  go: ToolStatus;
  beads: ToolStatus;
  platform: PlatformInfo;
}

/**
 * Hook to check Go installation status
 */
export function useGoStatus() {
  return useQuery({
    queryKey: ['setup', 'go'],
    queryFn: () => invoke<ToolStatus>('check_go_installation'),
    refetchInterval: 5000, // Poll every 5s during setup
    staleTime: 2000,
  });
}

/**
 * Hook to check Beads installation status
 */
export function useBeadsStatus() {
  return useQuery({
    queryKey: ['setup', 'beads'],
    queryFn: () => invoke<ToolStatus>('check_beads_installation'),
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

/**
 * Hook to get platform information
 */
export function usePlatformInfo() {
  return useQuery({
    queryKey: ['setup', 'platform'],
    queryFn: () => invoke<PlatformInfo>('get_platform_info'),
    staleTime: Infinity, // Platform doesn't change
  });
}

/**
 * Hook to get full setup status
 */
export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup', 'status'],
    queryFn: () => invoke<SetupStatus>('get_setup_status'),
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

/**
 * Hook to get Go installation instructions
 */
export function useGoInstructions() {
  return useQuery({
    queryKey: ['setup', 'instructions', 'go'],
    queryFn: () => invoke<string>('get_go_install_instructions'),
    staleTime: Infinity,
  });
}

/**
 * Hook to get Beads installation instructions
 */
export function useBeadsInstructions() {
  return useQuery({
    queryKey: ['setup', 'instructions', 'beads'],
    queryFn: () => invoke<string>('get_beads_install_instructions'),
    staleTime: 30000, // Refresh occasionally in case Go status changed
  });
}

/**
 * Check if all required tools are installed
 */
export function isSetupComplete(status: SetupStatus | undefined): boolean {
  if (!status) return false;
  return status.go.installed && status.beads.installed;
}

/**
 * Get current setup scene based on status
 */
export type SetupScene = 'loading' | 'go-install' | 'beads-install' | 'complete';

export function getCurrentSetupScene(status: SetupStatus | undefined, isLoading: boolean): SetupScene {
  if (isLoading || !status) return 'loading';
  if (!status.go.installed) return 'go-install';
  if (!status.beads.installed) return 'beads-install';
  return 'complete';
}
