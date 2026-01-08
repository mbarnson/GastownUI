// FTUE Detection Service - Check for Go, bd, gt, and workspace

import { invoke } from '@tauri-apps/api/core'
import { homeDir, join } from '@tauri-apps/api/path'
import type { SetupState, Platform, Arch } from './types'
import { MIN_VERSIONS } from './types'

const POLL_INTERVAL = 3000 // 3 seconds

/** Compare semver versions */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA > numB) return 1
    if (numA < numB) return -1
  }
  return 0
}

/** Run a command and get stdout */
async function runCommand(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await invoke<{ stdout: string; stderr: string }>('run_command', {
      cmd,
      args,
    })
    return result
  } catch (error) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}: ${error}`)
  }
}

/** Sleep for specified milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Detection service for checking Gas Town prerequisites */
export class SetupDetector {
  private polling = false
  private callbacks: Map<string, (detected: boolean, version?: string) => void> = new Map()

  /** Check all prerequisites at once */
  async checkAll(): Promise<SetupState> {
    const [go, bd, gt, tmux, workspace, platform, arch] = await Promise.all([
      this.checkGo(),
      this.checkBeads(),
      this.checkGastown(),
      this.checkTmux(),
      this.findWorkspace(),
      this.getPlatform(),
      this.getArch(),
    ])

    const pathIncludesGobin = await this.checkGobinInPath()
    const hasHomebrew = platform === 'darwin' ? await this.checkHomebrew() : undefined

    return {
      ...go,
      ...bd,
      ...gt,
      ...tmux,
      ...workspace,
      platform,
      arch,
      hasHomebrew,
      pathIncludesGobin,
    }
  }

  /** Check if Go is installed */
  async checkGo(): Promise<{ hasGo: boolean; goVersion?: string }> {
    try {
      const result = await runCommand('go', ['version'])
      const match = result.stdout.match(/go(\d+\.\d+(\.\d+)?)/)
      return {
        hasGo: true,
        goVersion: match?.[1],
      }
    } catch {
      return { hasGo: false }
    }
  }

  /** Check if Beads is installed */
  async checkBeads(): Promise<{ hasBd: boolean; bdVersion?: string; hasBdMinVersion: boolean }> {
    try {
      const result = await runCommand('bd', ['version'])
      const match = result.stdout.match(/bd version (\d+\.\d+\.\d+)/)
      const version = match?.[1]
      return {
        hasBd: true,
        bdVersion: version,
        hasBdMinVersion: version ? compareVersions(version, MIN_VERSIONS.bd) >= 0 : false,
      }
    } catch {
      return { hasBd: false, hasBdMinVersion: false }
    }
  }

  /** Check if Gas Town is installed */
  async checkGastown(): Promise<{ hasGt: boolean; gtVersion?: string; hasGtMinVersion: boolean }> {
    try {
      const result = await runCommand('gt', ['version'])
      const match = result.stdout.match(/gt version (\d+\.\d+\.\d+)/)
      const version = match?.[1]
      return {
        hasGt: true,
        gtVersion: version,
        hasGtMinVersion: version ? compareVersions(version, MIN_VERSIONS.gt) >= 0 : false,
      }
    } catch {
      return { hasGt: false, hasGtMinVersion: false }
    }
  }

  /** Check if tmux is installed */
  async checkTmux(): Promise<{ hasTmux: boolean; tmuxVersion?: string }> {
    try {
      const result = await runCommand('tmux', ['-V'])
      const match = result.stdout.match(/tmux (\d+\.\d+)/)
      return {
        hasTmux: true,
        tmuxVersion: match?.[1],
      }
    } catch {
      return { hasTmux: false }
    }
  }

  /** Find Gas Town workspace */
  async findWorkspace(): Promise<{ hasWorkspace: boolean; workspacePath?: string; workspaceRigs?: string[] }> {
    try {
      const home = await homeDir()
      const candidates = [
        await join(home, 'gt'),
        await join(home, 'gastown'),
      ]

      for (const path of candidates) {
        if (await this.isWorkspace(path)) {
          const rigs = await this.listRigs(path)
          return { hasWorkspace: true, workspacePath: path, workspaceRigs: rigs }
        }
      }

      return { hasWorkspace: false }
    } catch {
      return { hasWorkspace: false }
    }
  }

  /** Check if a directory is a Gas Town workspace */
  private async isWorkspace(path: string): Promise<boolean> {
    try {
      const townJsonPath = await join(path, 'mayor', 'town.json')
      await invoke('path_exists', { path: townJsonPath })
      return true
    } catch {
      return false
    }
  }

  /** List rigs in a workspace */
  private async listRigs(workspacePath: string): Promise<string[]> {
    try {
      const result = await runCommand('gt', ['rigs', '--json'])
      const rigs = JSON.parse(result.stdout)
      return rigs.map((r: { name: string }) => r.name)
    } catch {
      return []
    }
  }

  /** Get platform */
  private async getPlatform(): Promise<Platform> {
    try {
      const result = await invoke<string>('get_platform')
      return result as Platform
    } catch {
      return 'darwin' // Default to macOS
    }
  }

  /** Get architecture */
  private async getArch(): Promise<Arch> {
    try {
      const result = await invoke<string>('get_arch')
      return result as Arch
    } catch {
      return 'arm64' // Default to ARM
    }
  }

  /** Check if Homebrew is installed (macOS) */
  async checkHomebrew(): Promise<boolean> {
    try {
      await runCommand('brew', ['--version'])
      return true
    } catch {
      return false
    }
  }

  /** Check if GOPATH/bin is in PATH */
  async checkGobinInPath(): Promise<boolean> {
    try {
      const result = await runCommand('go', ['env', 'GOPATH'])
      const gopath = result.stdout.trim()
      const pathResult = await invoke<string>('get_env', { name: 'PATH' })
      return pathResult.includes(`${gopath}/bin`) || pathResult.includes(`${gopath}\\bin`)
    } catch {
      return false
    }
  }

  /** Start polling for a specific tool */
  startPolling(target: 'go' | 'bd' | 'gt', callback: (detected: boolean, version?: string) => void): void {
    this.callbacks.set(target, callback)
    if (!this.polling) {
      this.polling = true
      this.pollLoop()
    }
  }

  /** Stop polling for a specific tool */
  stopPollingFor(target: 'go' | 'bd' | 'gt'): void {
    this.callbacks.delete(target)
    if (this.callbacks.size === 0) {
      this.polling = false
    }
  }

  /** Stop all polling */
  stopPolling(): void {
    this.polling = false
    this.callbacks.clear()
  }

  /** Internal polling loop */
  private async pollLoop(): Promise<void> {
    while (this.polling && this.callbacks.size > 0) {
      for (const [target, callback] of this.callbacks) {
        const check = target === 'go' ? await this.checkGo() :
                      target === 'bd' ? await this.checkBeads() :
                      await this.checkGastown()

        const hasIt = target === 'go' ? check.hasGo :
                      target === 'bd' ? (check as Awaited<ReturnType<typeof this.checkBeads>>).hasBd :
                      (check as Awaited<ReturnType<typeof this.checkGastown>>).hasGt

        const version = target === 'go' ? (check as Awaited<ReturnType<typeof this.checkGo>>).goVersion :
                        target === 'bd' ? (check as Awaited<ReturnType<typeof this.checkBeads>>).bdVersion :
                        (check as Awaited<ReturnType<typeof this.checkGastown>>).gtVersion

        if (hasIt) {
          callback(true, version)
          this.callbacks.delete(target)
        }
      }
      await sleep(POLL_INTERVAL)
    }
    this.polling = false
  }

  /** Create a new Gas Town workspace */
  async createWorkspace(path: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Expand ~ to home directory
      let resolvedPath = path
      if (path.startsWith('~/')) {
        const home = await homeDir()
        resolvedPath = await join(home, path.slice(2))
      }

      // Run gt install to create the workspace
      const result = await runCommand('gt', ['install', resolvedPath])

      // Check if workspace was created successfully
      if (await this.isWorkspace(resolvedPath)) {
        return { success: true }
      }

      return {
        success: false,
        error: result.stderr || 'Workspace creation failed'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating workspace'
      }
    }
  }

  /** Add a rig (Git repository) to the workspace */
  async addRig(gitUrl: string): Promise<{ success: boolean; rigName?: string; error?: string }> {
    try {
      // Parse rig name from URL
      const rigName = gitUrl.split('/').pop()?.replace('.git', '') || 'project'

      // Run gt rig add
      const result = await runCommand('gt', ['rig', 'add', rigName, gitUrl])

      if (result.stderr && result.stderr.toLowerCase().includes('error')) {
        return { success: false, error: result.stderr }
      }

      return { success: true, rigName }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error adding rig'
      }
    }
  }

  /** Start the Mayor agent */
  async startMayor(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await runCommand('gt', ['mayor', 'start'])

      if (result.stderr && result.stderr.toLowerCase().includes('error')) {
        return { success: false, error: result.stderr }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error starting mayor'
      }
    }
  }
}

/** Singleton instance */
let detectorInstance: SetupDetector | null = null

/** Get the detector singleton */
export function getDetector(): SetupDetector {
  if (!detectorInstance) {
    detectorInstance = new SetupDetector()
  }
  return detectorInstance
}
