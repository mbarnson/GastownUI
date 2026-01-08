import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

// Types for Gas Town entities
export interface CommandResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface TmuxSession {
  name: string;
  windows: number;
  attached: boolean;
}

export interface Convoy {
  id: string;
  name: string;
  progress: number;
  status: string;
  polecats: string[];
}

export interface Bead {
  id: string;
  title: string;
  status: string;
  priority: number;
  type: string;
  assignee?: string;
}

export type BeadStatus = 'open' | 'in_progress' | 'closed' | 'blocked';

// Query key factory
const queryKeys = {
  convoys: ['convoys'] as const,
  beads: (rig?: string, status?: BeadStatus) => ['beads', rig, status] as const,
  tmux: ['tmux'] as const,
  status: ['gastown', 'status'] as const,
};

/**
 * Execute a gt or bd command
 */
export async function runCommand(cmd: string, args: string[]): Promise<CommandResult> {
  return invoke<CommandResult>('run_gt_command', { cmd, args });
}

/**
 * Parse convoy list output
 */
function parseConvoyList(output: string): Convoy[] {
  const lines = output.split('\n').filter(line => line.trim());
  const convoys: Convoy[] = [];

  for (const line of lines) {
    // Parse convoy lines like: "1. 🚚 hq-cv-xxx: Name ●"
    const match = line.match(/\d+\.\s+🚚\s+(\S+):\s+(.+?)\s*[●○]/);
    if (match) {
      convoys.push({
        id: match[1],
        name: match[2].trim(),
        progress: 0,
        status: line.includes('●') ? 'active' : 'completed',
        polecats: [],
      });
    }
  }

  return convoys;
}

/**
 * Parse beads list output
 */
function parseBeadsList(output: string): Bead[] {
  const lines = output.split('\n').filter(line => line.trim());
  const beads: Bead[] = [];

  for (const line of lines) {
    // Parse bead lines like: "ga-xxx [P2] [task] open - Title"
    const match = line.match(/^(\S+)\s+\[P(\d)\]\s+\[(\w+)\]\s+(\w+)\s+-\s+(.+)$/);
    if (match) {
      beads.push({
        id: match[1],
        priority: parseInt(match[2]),
        type: match[3],
        status: match[4],
        title: match[5].trim(),
      });
    }
  }

  return beads;
}

/**
 * Hook for fetching convoy list
 */
export function useConvoys() {
  return useQuery({
    queryKey: queryKeys.convoys,
    queryFn: async () => {
      const result = await runCommand('gt', ['convoy', 'list']);
      if (result.exit_code !== 0) {
        throw new Error(result.stderr || 'Failed to list convoys');
      }
      return parseConvoyList(result.stdout);
    },
    refetchInterval: 2000,
  });
}

/**
 * Hook for fetching beads list
 */
export function useBeads(rig?: string, status?: BeadStatus) {
  return useQuery({
    queryKey: queryKeys.beads(rig, status),
    queryFn: async () => {
      const args = ['list'];
      if (status) {
        args.push('--status', status);
      }
      const result = await runCommand('bd', args);
      if (result.exit_code !== 0) {
        throw new Error(result.stderr || 'Failed to list beads');
      }
      return parseBeadsList(result.stdout);
    },
    refetchInterval: 5000,
  });
}

/**
 * Hook for fetching tmux sessions
 */
export function useTmuxSessions() {
  return useQuery({
    queryKey: queryKeys.tmux,
    queryFn: () => invoke<TmuxSession[]>('list_tmux_sessions'),
    refetchInterval: 5000,
  });
}

/**
 * Hook for Gas Town status
 */
export function useGastownStatus() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: async () => {
      const result = await runCommand('gt', ['status']);
      return {
        output: result.stdout,
        healthy: result.exit_code === 0,
      };
    },
    refetchInterval: 10000,
  });
}

/**
 * Mutation hook for slinging work
 */
export function useSling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bead, rig }: { bead: string; rig: string }) => {
      const result = await runCommand('gt', ['sling', bead, rig]);
      if (result.exit_code !== 0) {
        throw new Error(result.stderr || 'Failed to sling work');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.convoys });
      queryClient.invalidateQueries({ queryKey: ['beads'] });
    },
  });
}

/**
 * Mutation hook for stopping agents
 */
export function useStopAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agent?: string) => {
      const args = agent ? ['stop', agent] : ['stop', '--all'];
      const result = await runCommand('gt', args);
      if (result.exit_code !== 0) {
        throw new Error(result.stderr || 'Failed to stop agent');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.convoys });
      queryClient.invalidateQueries({ queryKey: queryKeys.tmux });
    },
  });
}

/**
 * Mutation hook for nudging agents
 */
export function useNudgeAgent() {
  return useMutation({
    mutationFn: async (agent: string) => {
      const result = await runCommand('gt', ['nudge', agent]);
      if (result.exit_code !== 0) {
        throw new Error(result.stderr || 'Failed to nudge agent');
      }
      return result;
    },
  });
}

// ============== Vision Integration ==============

export interface VisionServerStatus {
  running: boolean
  ready: boolean
  url: string
}

export interface VisionResponse {
  description: string
  latency_ms: number
}

export interface ScreenshotResult {
  image_base64: string
  width: number
  height: number
}

// Check vision server status
export function useVisionServerStatus() {
  return useQuery({
    queryKey: ['visionServerStatus'],
    queryFn: async (): Promise<VisionServerStatus> => {
      if (!isTauri()) {
        return { running: false, ready: false, url: 'http://127.0.0.1:8081' }
      }
      return invoke<VisionServerStatus>('get_vision_server_status')
    },
    refetchInterval: 5000,
    staleTime: 2000,
    enabled: isBrowser,
  })
}

// Start vision server (on demand)
export function useStartVisionServer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<VisionServerStatus> => {
      if (!isTauri()) {
        return { running: true, ready: true, url: 'http://127.0.0.1:8081' }
      }
      return invoke<VisionServerStatus>('start_vision_server', { config: null })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visionServerStatus'] })
    },
  })
}

// Stop vision server
export function useStopVisionServer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (!isTauri()) {
        return
      }
      return invoke<void>('stop_vision_server')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visionServerStatus'] })
    },
  })
}

// Capture screenshot only (without analysis)
export function useCaptureScreenshot() {
  return useMutation({
    mutationFn: async (): Promise<ScreenshotResult> => {
      if (!isTauri()) {
        // Mock screenshot in dev
        return {
          image_base64: 'mock_base64_data',
          width: 1920,
          height: 1080,
        }
      }
      return invoke<ScreenshotResult>('capture_screenshot')
    },
  })
}

// Describe screen - captures screenshot and analyzes it
// This is the main "what am I looking at?" function
export function useDescribeScreen() {
  return useMutation({
    mutationFn: async (customPrompt?: string): Promise<VisionResponse> => {
      if (!isTauri()) {
        // Mock response in dev
        return {
          description: 'Mock: You are looking at the GastownUI dashboard. It shows 2 active convoys, 3 polecats (2 active, 1 idle), and 5 open beads. The merge queue has 2 items pending.',
          latency_ms: 1500,
        }
      }
      return invoke<VisionResponse>('describe_screen', { customPrompt: customPrompt || null })
    },
  })
}

// Describe an arbitrary image
export function useDescribeImage() {
  return useMutation({
    mutationFn: async ({ imageBase64, prompt }: { imageBase64: string; prompt?: string }): Promise<VisionResponse> => {
      if (!isTauri()) {
        return {
          description: 'Mock: Image description not available in dev mode.',
          latency_ms: 1000,
        }
      }
      return invoke<VisionResponse>('describe_image', {
        imageBase64,
        prompt: prompt || null,
      })
    },
  })
}
