/**
 * Setup Detection Service
 *
 * Detects system dependencies and workspace state for FTUE (First Time User Experience).
 * This is foundational - all other FTUE features depend on this detection service.
 */

import { invoke } from '@tauri-apps/api/core';
import type { CommandResult } from '../types/gastown';

// ============================================================================
// Types
// ============================================================================

export type DependencyStatus = 'checking' | 'installed' | 'missing' | 'error';

export interface DependencyInfo {
  name: string;
  status: DependencyStatus;
  version?: string;
  path?: string;
  error?: string;
  required: boolean;
  installHint?: string;
}

export interface WorkspaceInfo {
  exists: boolean;
  path: string;
  initialized: boolean;
  rigs: string[];
  beadsConfigured: boolean;
}

export interface SetupState {
  dependencies: {
    go: DependencyInfo;
    bd: DependencyInfo;
    gt: DependencyInfo;
    tmux: DependencyInfo;
  };
  workspace: WorkspaceInfo | null;
  isReady: boolean;
  lastChecked: number;
}

// ============================================================================
// Dependency Definitions
// ============================================================================

const DEPENDENCY_DEFS: Record<string, { required: boolean; installHint: string }> = {
  go: {
    required: true,
    installHint: 'Install Go from https://go.dev/dl/ or use: brew install go',
  },
  bd: {
    required: true,
    installHint: 'Install beads CLI: go install github.com/txgsync/beads/cmd/bd@latest',
  },
  gt: {
    required: true,
    installHint: 'Install Gas Town CLI: go install github.com/txgsync/gastown/cmd/gt@latest',
  },
  tmux: {
    required: true,
    installHint: 'Install tmux: brew install tmux (macOS) or apt install tmux (Linux)',
  },
};

// ============================================================================
// SetupDetector Class
// ============================================================================

export class SetupDetector {
  private state: SetupState;
  private listeners: Set<(state: SetupState) => void> = new Set();
  private pollInterval: number | null = null;
  private polling = false;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): SetupState {
    return {
      dependencies: {
        go: this.createDependencyInfo('go'),
        bd: this.createDependencyInfo('bd'),
        gt: this.createDependencyInfo('gt'),
        tmux: this.createDependencyInfo('tmux'),
      },
      workspace: null,
      isReady: false,
      lastChecked: 0,
    };
  }

  private createDependencyInfo(name: string): DependencyInfo {
    const def = DEPENDENCY_DEFS[name];
    return {
      name,
      status: 'checking',
      required: def?.required ?? true,
      installHint: def?.installHint,
    };
  }

  /**
   * Get current setup state
   */
  getState(): SetupState {
    return this.state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: SetupState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /**
   * Check if a command exists and get its version/path
   */
  private async checkCommand(cmd: string): Promise<DependencyInfo> {
    const info = this.createDependencyInfo(cmd);

    try {
      // Check if command exists using 'which'
      const whichResult = await invoke<CommandResult>('run_shell_command', {
        command: 'which',
        args: [cmd],
      });

      if (whichResult.exit_code !== 0) {
        info.status = 'missing';
        return info;
      }

      info.path = whichResult.stdout.trim();
      info.status = 'installed';

      // Get version
      const versionArg = cmd === 'go' ? 'version' : '--version';
      try {
        const versionResult = await invoke<CommandResult>('run_shell_command', {
          command: cmd,
          args: [versionArg],
        });

        if (versionResult.exit_code === 0) {
          // Parse version from output
          const versionMatch = versionResult.stdout.match(
            /(?:go\s+version\s+go|v?)?(\d+\.\d+(?:\.\d+)?)/
          );
          if (versionMatch) {
            info.version = versionMatch[1];
          } else {
            // Just take first line if no version pattern found
            info.version = versionResult.stdout.split('\n')[0]?.trim();
          }
        }
      } catch {
        // Version check failed but command exists
      }

      return info;
    } catch (error) {
      info.status = 'error';
      info.error = error instanceof Error ? error.message : 'Unknown error';
      return info;
    }
  }

  /**
   * Check workspace state
   */
  private async checkWorkspace(): Promise<WorkspaceInfo | null> {
    try {
      // Check if ~/gt exists
      const homeResult = await invoke<CommandResult>('run_shell_command', {
        command: 'sh',
        args: ['-c', 'echo $HOME'],
      });

      const home = homeResult.stdout.trim();
      const gtPath = `${home}/gt`;

      // Check if directory exists
      const existsResult = await invoke<CommandResult>('run_shell_command', {
        command: 'test',
        args: ['-d', gtPath],
      });

      if (existsResult.exit_code !== 0) {
        return {
          exists: false,
          path: gtPath,
          initialized: false,
          rigs: [],
          beadsConfigured: false,
        };
      }

      // Check if initialized (has .beads directory)
      const beadsResult = await invoke<CommandResult>('run_shell_command', {
        command: 'test',
        args: ['-d', `${gtPath}/.beads`],
      });

      const initialized = beadsResult.exit_code === 0;

      // List rigs if initialized
      let rigs: string[] = [];
      if (initialized) {
        try {
          const rigsResult = await invoke<CommandResult>('run_gt_command', {
            cmd: 'gt',
            args: ['rigs'],
          });
          if (rigsResult.exit_code === 0) {
            rigs = rigsResult.stdout
              .trim()
              .split('\n')
              .filter((line) => line.trim());
          }
        } catch {
          // gt rigs failed, leave empty
        }
      }

      // Check beads config
      const configResult = await invoke<CommandResult>('run_shell_command', {
        command: 'test',
        args: ['-f', `${gtPath}/.beads/config.yaml`],
      });

      return {
        exists: true,
        path: gtPath,
        initialized,
        rigs,
        beadsConfigured: configResult.exit_code === 0,
      };
    } catch (error) {
      console.error('Workspace check failed:', error);
      return null;
    }
  }

  /**
   * Run a full detection check
   */
  async check(): Promise<SetupState> {
    // Check all dependencies in parallel
    const [go, bd, gt, tmux, workspace] = await Promise.all([
      this.checkCommand('go'),
      this.checkCommand('bd'),
      this.checkCommand('gt'),
      this.checkCommand('tmux'),
      this.checkWorkspace(),
    ]);

    // Determine if ready (all required deps installed and workspace initialized)
    const allDepsInstalled =
      go.status === 'installed' &&
      bd.status === 'installed' &&
      gt.status === 'installed' &&
      tmux.status === 'installed';

    const workspaceReady = workspace?.initialized ?? false;

    this.state = {
      dependencies: { go, bd, gt, tmux },
      workspace,
      isReady: allDepsInstalled && workspaceReady,
      lastChecked: Date.now(),
    };

    this.notifyListeners();
    return this.state;
  }

  /**
   * Start polling for setup changes
   */
  startPolling(intervalMs = 5000): void {
    if (this.polling) return;

    this.polling = true;
    this.check(); // Initial check

    this.pollInterval = window.setInterval(() => {
      this.check();
    }, intervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    this.polling = false;
    if (this.pollInterval !== null) {
      window.clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Check if system is ready for Gas Town
   */
  isSystemReady(): boolean {
    return this.state.isReady;
  }

  /**
   * Get list of missing dependencies
   */
  getMissingDependencies(): DependencyInfo[] {
    return Object.values(this.state.dependencies).filter(
      (dep) => dep.required && dep.status !== 'installed'
    );
  }

  /**
   * Get next setup step
   */
  getNextSetupStep(): string | null {
    const missing = this.getMissingDependencies();
    if (missing.length > 0) {
      return `Install ${missing[0].name}: ${missing[0].installHint}`;
    }

    if (!this.state.workspace?.exists) {
      return 'Create Gas Town workspace: mkdir ~/gt && cd ~/gt && gt init';
    }

    if (!this.state.workspace?.initialized) {
      return 'Initialize Gas Town: cd ~/gt && gt init';
    }

    if (this.state.workspace?.rigs.length === 0) {
      return 'Add a rig: gt rig add <name> <repo-url>';
    }

    return null;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let detector: SetupDetector | null = null;

export function getSetupDetector(): SetupDetector {
  if (!detector) {
    detector = new SetupDetector();
  }
  return detector;
}

/**
 * Quick check if running in Tauri
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}
