import { useState } from 'react'
import {
  Check,
  Copy,
  AlertTriangle,
  Terminal,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { useInstallDependency, type DependencyInfo } from '../hooks/useGastown'

interface BeadsInstallPanelProps {
  beadsDep?: DependencyInfo
  onInstallComplete?: () => void
  onRefresh?: () => void
}

const INSTALL_COMMAND = 'go install github.com/mbarnson/beads/cmd/bd@latest'
const MIN_VERSION = '0.43.0'

/**
 * BeadsInstallPanel - Dedicated panel for installing beads CLI
 *
 * Features:
 * - Copy button for go install command
 * - Version checking (min 0.43.0)
 * - GOPATH/bin PATH fix guidance
 * - Installation progress tracking
 */
export function BeadsInstallPanel({
  beadsDep,
  onInstallComplete,
  onRefresh,
}: BeadsInstallPanelProps) {
  const [copied, setCopied] = useState(false)
  const installDep = useInstallDependency()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleInstall = async () => {
    try {
      await installDep.mutateAsync('bd')
      onInstallComplete?.()
    } catch {
      // Error handled by hook
    }
  }

  // Check if version is outdated
  const isOutdated = beadsDep?.installed && beadsDep.version && !isVersionOk(beadsDep.version)
  const needsInstall = !beadsDep?.installed || isOutdated

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-purple-500/10">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-purple-400" />
          Beads CLI Installation
        </h2>
      </div>

      <div className="p-6 space-y-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          {beadsDep?.installed && !isOutdated ? (
            <>
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">Beads CLI Installed</p>
                <p className="text-sm text-gray-400">
                  Version: {beadsDep.version || 'unknown'}
                  {beadsDep.path && <span className="text-gray-500"> • {beadsDep.path}</span>}
                </p>
              </div>
            </>
          ) : isOutdated ? (
            <>
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-white font-medium">Update Required</p>
                <p className="text-sm text-yellow-400">
                  Current: {beadsDep?.version} • Required: {MIN_VERSION}+
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Terminal className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-white font-medium">Install Beads CLI</p>
                <p className="text-sm text-gray-400">Required for issue tracking and workflow management</p>
              </div>
            </>
          )}
        </div>

        {/* Install Command */}
        {needsInstall && (
          <div className="space-y-3">
            <label className="block text-sm text-gray-400">
              {isOutdated ? 'Update command:' : 'Install command:'}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 font-mono text-sm text-gray-300 overflow-x-auto">
                {INSTALL_COMMAND}
              </div>
              <button
                onClick={handleCopy}
                className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600 border border-slate-600'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Auto-install button */}
            <div className="flex gap-3">
              <button
                onClick={handleInstall}
                disabled={installDep.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {installDep.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4" />
                    {isOutdated ? 'Update Automatically' : 'Install Automatically'}
                  </>
                )}
              </button>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-gray-300 font-medium rounded-lg transition-colors"
                  title="Check status again"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Error display */}
            {installDep.error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{String(installDep.error)}</p>
              </div>
            )}
          </div>
        )}

        {/* PATH guidance */}
        {needsInstall && (
          <PathGuidance />
        )}

        {/* Links */}
        <div className="flex items-center gap-4 pt-2 border-t border-slate-700">
          <a
            href="https://github.com/mbarnson/beads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            GitHub
          </a>
          <a
            href="https://github.com/mbarnson/beads#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Documentation
          </a>
        </div>
      </div>
    </div>
  )
}

/**
 * PATH guidance component for GOPATH/bin issues
 */
function PathGuidance() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-yellow-500/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-yellow-400 font-medium">
            Command not found after install?
          </span>
        </div>
        <span className="text-xs text-gray-500">{expanded ? 'Hide' : 'Show fix'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-gray-300">
            If <code className="bg-slate-800 px-1.5 py-0.5 rounded">bd</code> isn't found after installation,
            you need to add Go's bin directory to your PATH:
          </p>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">For zsh (macOS default):</p>
            <CopyableCommand command='echo '\''export PATH=$HOME/go/bin:$PATH'\'' >> ~/.zshrc && source ~/.zshrc' />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">For bash:</p>
            <CopyableCommand command='echo '\''export PATH=$HOME/go/bin:$PATH'\'' >> ~/.bashrc && source ~/.bashrc' />
          </div>

          <p className="text-xs text-gray-500">
            Then close and reopen your terminal, or run <code className="bg-slate-800 px-1.5 py-0.5 rounded">source ~/.zshrc</code>
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Small copyable command component
 */
function CopyableCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="flex gap-2">
      <code className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-gray-300 overflow-x-auto font-mono">
        {command}
      </code>
      <button
        onClick={handleCopy}
        className={`px-2 py-2 rounded transition-colors ${
          copied
            ? 'bg-green-500/20 text-green-400'
            : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
        }`}
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  )
}

/**
 * Check if version meets minimum requirement
 */
function isVersionOk(version: string): boolean {
  // Parse version string (e.g., "bd version 0.43.0" or "0.43.0")
  const versionMatch = version.match(/\d+\.\d+\.\d+/)
  if (!versionMatch) return false

  const parts = versionMatch[0].split('.').map(Number)
  const minParts = MIN_VERSION.split('.').map(Number)

  for (let i = 0; i < Math.max(parts.length, minParts.length); i++) {
    const v1 = parts[i] || 0
    const v2 = minParts[i] || 0
    if (v1 > v2) return true
    if (v1 < v2) return false
  }
  return true
}

export default BeadsInstallPanel
