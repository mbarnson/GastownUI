import { useState, useEffect, useCallback } from 'react'
import {
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { useFTUE } from '../../contexts/FTUEContext'
import { useLiveRegion } from '../a11y/LiveRegion'
import { TypewriterText, StagedReveal } from './TheatricalTransition'

/**
 * FTUE Gas Town Installation Flow
 *
 * Guides users through installing the gt CLI:
 * 1. Detect if gt is already installed
 * 2. Show installation command (npm install -g @anthropic/gastown)
 * 3. Verify installation success
 * 4. Proceed to workspace setup
 */

interface InstallationStatus {
  checked: boolean
  installed: boolean
  version?: string
  error?: string
}

interface InstallationFlowProps {
  /** Called when installation is complete */
  onComplete?: () => void
  /** Skip directly to next stage if already installed */
  autoAdvance?: boolean
}

export default function InstallationFlow({
  onComplete,
  autoAdvance = true,
}: InstallationFlowProps) {
  const { nextStage, addCompletedStep, touchInteraction } = useFTUE()
  const { announce } = useLiveRegion()

  const [status, setStatus] = useState<InstallationStatus>({
    checked: false,
    installed: false,
  })
  const [isChecking, setIsChecking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showManualInstructions, setShowManualInstructions] = useState(false)

  // Installation command
  const installCommand = 'npm install -g @anthropic/gastown'

  // Check if gt CLI is installed
  const checkInstallation = useCallback(async () => {
    setIsChecking(true)
    touchInteraction()

    try {
      // In a real Tauri app, this would use invoke to run a shell command
      // For now, we simulate the check
      // const result = await invoke<{ installed: boolean; version?: string }>('check_gt_installed')

      // Simulated check - in production this calls Tauri shell
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Simulate gt being installed (would be real check in production)
      const mockInstalled = Math.random() > 0.3 // 70% chance installed for demo

      if (mockInstalled) {
        setStatus({
          checked: true,
          installed: true,
          version: '0.4.2',
        })
        announce('Gas Town CLI is installed')
        addCompletedStep('Installed Gas Town CLI')

        if (autoAdvance) {
          // Auto-advance after showing success briefly
          setTimeout(() => {
            nextStage()
            onComplete?.()
          }, 2000)
        }
      } else {
        setStatus({
          checked: true,
          installed: false,
        })
        announce('Gas Town CLI not found. Installation required.')
      }
    } catch (error) {
      setStatus({
        checked: true,
        installed: false,
        error: error instanceof Error ? error.message : 'Check failed',
      })
      announce('Failed to check installation status')
    } finally {
      setIsChecking(false)
    }
  }, [touchInteraction, announce, addCompletedStep, autoAdvance, nextStage, onComplete])

  // Check on mount
  useEffect(() => {
    checkInstallation()
  }, []) // Only run once on mount

  // Copy command to clipboard
  const handleCopyCommand = async () => {
    touchInteraction()
    try {
      await navigator.clipboard.writeText(installCommand)
      setCopied(true)
      announce('Command copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      announce('Failed to copy command')
    }
  }

  // Handle manual continue
  const handleContinue = () => {
    touchInteraction()
    addCompletedStep('Installed Gas Town CLI')
    nextStage()
    onComplete?.()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Terminal className="w-8 h-8 text-cyan-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            <TypewriterText text="Install Gas Town CLI" speed={50} />
          </h1>
          <p className="text-slate-400">
            The command-line foundation for Gas Town
          </p>
        </div>

        {/* Status card */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden mb-6">
          {/* Checking state */}
          {isChecking && (
            <div className="flex items-center gap-4 p-6">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <div>
                <p className="text-white font-medium">Checking installation...</p>
                <p className="text-sm text-slate-400">Looking for gt CLI on your system</p>
              </div>
            </div>
          )}

          {/* Already installed */}
          {status.checked && status.installed && (
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Gas Town CLI Installed</p>
                  <p className="text-sm text-green-400">Version {status.version}</p>
                </div>
              </div>

              {!autoAdvance && (
                <button
                  onClick={handleContinue}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {autoAdvance && (
                <p className="text-sm text-slate-400 text-center">
                  Continuing to next step...
                </p>
              )}
            </div>
          )}

          {/* Not installed - show installation instructions */}
          {status.checked && !status.installed && !status.error && (
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Installation Required</p>
                  <p className="text-sm text-slate-400">Run the command below to install</p>
                </div>
              </div>

              {/* Install command */}
              <div className="mb-6">
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Installation Command
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-cyan-400 font-mono text-sm">
                    {installCommand}
                  </code>
                  <button
                    onClick={handleCopyCommand}
                    className={`
                      p-3 rounded-lg border transition-colors
                      ${copied
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                      }
                    `}
                    title="Copy to clipboard"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Verify button */}
              <button
                onClick={checkInstallation}
                disabled={isChecking}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-medium rounded-lg transition-colors mb-4"
              >
                <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Verify Installation</span>
              </button>

              {/* Manual instructions toggle */}
              <button
                onClick={() => setShowManualInstructions(!showManualInstructions)}
                className="w-full text-sm text-slate-400 hover:text-white transition-colors"
              >
                {showManualInstructions ? 'Hide' : 'Show'} manual instructions
              </button>
            </div>
          )}

          {/* Error state */}
          {status.error && (
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Check Failed</p>
                  <p className="text-sm text-red-400">{status.error}</p>
                </div>
              </div>

              <button
                onClick={checkInstallation}
                disabled={isChecking}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Try Again</span>
              </button>
            </div>
          )}
        </div>

        {/* Manual instructions */}
        {showManualInstructions && (
          <StagedReveal
            staggerDelay={100}
            containerClassName="bg-slate-800/50 rounded-xl border border-slate-700 p-6 space-y-4"
          >
            <div>
              <h3 className="text-white font-medium mb-2">Prerequisites</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Node.js 18+ installed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>npm or yarn package manager</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-2">Step-by-step</h3>
              <ol className="text-sm text-slate-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-medium">1.</span>
                  <span>Open your terminal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-medium">2.</span>
                  <span>Run: <code className="px-1 bg-slate-900 rounded text-cyan-400">{installCommand}</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-medium">3.</span>
                  <span>Verify with: <code className="px-1 bg-slate-900 rounded text-cyan-400">gt --version</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-medium">4.</span>
                  <span>Click &quot;Verify Installation&quot; above</span>
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-white font-medium mb-2">Troubleshooting</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">⚠</span>
                  <span>Permission error? Try: <code className="px-1 bg-slate-900 rounded text-cyan-400">sudo npm install -g @anthropic/gastown</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">⚠</span>
                  <span>Not in PATH? Check your shell config (~/.bashrc, ~/.zshrc)</span>
                </li>
              </ul>
            </div>

            <a
              href="https://github.com/anthropics/gastown"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Gas Town Documentation</span>
            </a>
          </StagedReveal>
        )}

        {/* Skip option */}
        {status.checked && !status.installed && (
          <div className="text-center mt-6">
            <button
              onClick={handleContinue}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip for now (I&apos;ll install later)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact installation status indicator
 */
interface InstallStatusIndicatorProps {
  className?: string
}

export function InstallStatusIndicator({ className = '' }: InstallStatusIndicatorProps) {
  const [installed, setInstalled] = useState<boolean | null>(null)

  useEffect(() => {
    // Check installation status
    // In production: invoke('check_gt_installed')
    setTimeout(() => setInstalled(true), 1000)
  }, [])

  if (installed === null) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        <span className="text-sm text-slate-400">Checking...</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {installed ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400">gt CLI installed</span>
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-yellow-400">gt CLI not found</span>
        </>
      )}
    </div>
  )
}
