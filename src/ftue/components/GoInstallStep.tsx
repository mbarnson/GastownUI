/**
 * GoInstallStep - Enhanced Go installation step with voice guidance and detection
 *
 * Features:
 * - Platform-specific installation instructions
 * - Real-time detection polling with visual feedback
 * - PATH error detection and fix instructions
 * - Voice guidance integration
 */

import { useEffect, useState, useCallback } from 'react'
import { Check, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { CommandBlock, PathFixInstructions } from './CommandBlock'
import type { Platform } from '../types'

interface GoInstallStepProps {
  /** Current platform */
  platform: Platform
  /** Whether Homebrew is available (macOS) */
  hasHomebrew?: boolean
  /** Whether Go is detected */
  goDetected: boolean
  /** Detected Go version */
  goVersion?: string
  /** Whether PATH includes Go bin */
  pathIncludesGobin: boolean
  /** Whether currently polling for Go */
  isPolling?: boolean
  /** Callback to play voice clip */
  onPlayVoice?: () => void
  /** Error message if any */
  error?: string
}

/** Polling status indicator */
function DetectionStatus({
  detected,
  version,
  isPolling,
  pathError,
}: {
  detected: boolean
  version?: string
  isPolling?: boolean
  pathError?: boolean
}) {
  if (detected && !pathError) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-900/30 border border-green-700/50 rounded-lg">
        <Check className="w-5 h-5 text-green-400" />
        <span className="text-green-300">
          Go {version} detected
        </span>
      </div>
    )
  }

  if (pathError) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-900/30 border border-amber-700/50 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-400" />
        <span className="text-amber-300">
          Go installed but not in PATH
        </span>
      </div>
    )
  }

  if (isPolling) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        <span className="text-slate-400">
          Waiting for Go installation...
        </span>
      </div>
    )
  }

  return null
}

/** Platform-specific download link */
function GoDownloadLink({ platform }: { platform: Platform }) {
  const downloadUrl = 'https://go.dev/dl/'

  return (
    <a
      href={downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:underline text-sm"
    >
      Download from go.dev
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  )
}

/** macOS installation instructions */
function MacOSInstructions({ hasHomebrew }: { hasHomebrew?: boolean }) {
  return (
    <div className="space-y-4">
      {hasHomebrew ? (
        <>
          <p className="text-slate-300 text-sm">
            You have Homebrew installed. Run this command in your terminal:
          </p>
          <CommandBlock
            command="brew install go"
            description=""
          />
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            The easiest way to install Go on macOS is with Homebrew:
          </p>

          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Option 1: Install Homebrew first (recommended)
            </p>
            <CommandBlock
              command='/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
              description=""
            />
            <p className="text-xs text-slate-500">
              Then run: <code className="px-1 py-0.5 bg-slate-900 rounded">brew install go</code>
            </p>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Option 2: Direct download
            </p>
            <GoDownloadLink platform="darwin" />
            <p className="text-xs text-slate-500">
              Download the .pkg installer and run it.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/** Linux installation instructions */
function LinuxInstructions() {
  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-sm">
        Install Go using your package manager or download directly:
      </p>

      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Ubuntu / Debian
        </p>
        <CommandBlock
          command="sudo apt update && sudo apt install golang-go"
          description=""
        />
      </div>

      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Fedora
        </p>
        <CommandBlock
          command="sudo dnf install golang"
          description=""
        />
      </div>

      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Arch Linux
        </p>
        <CommandBlock
          command="sudo pacman -S go"
          description=""
        />
      </div>

      <div className="pt-2">
        <GoDownloadLink platform="linux" />
        <p className="text-xs text-slate-500 mt-1">
          Or download the tarball and extract to /usr/local/go
        </p>
      </div>
    </div>
  )
}

/** Windows installation instructions */
function WindowsInstructions() {
  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-sm">
        Download and run the Windows installer:
      </p>

      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
        <GoDownloadLink platform="win32" />
        <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside mt-3">
          <li>Download the .msi installer for Windows</li>
          <li>Run the installer</li>
          <li className="text-amber-400">
            Important: Check "Add to PATH" during installation
          </li>
          <li>Restart your terminal after installation</li>
        </ol>
      </div>

      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Alternative: Using Scoop
        </p>
        <CommandBlock
          command="scoop install go"
          description=""
        />
      </div>
    </div>
  )
}

/** Enhanced PATH fix instructions with shell detection */
function EnhancedPathFix({ platform }: { platform: Platform }) {
  if (platform === 'win32') {
    return (
      <div className="space-y-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
        <p className="text-sm text-amber-300 font-medium">
          Go is installed but not in your PATH
        </p>
        <ol className="text-xs text-amber-400/80 space-y-2 list-decimal list-inside">
          <li>Open System Properties → Environment Variables</li>
          <li>Under "User variables", find or create PATH</li>
          <li>
            Add: <code className="px-1 py-0.5 bg-slate-800 rounded">%USERPROFILE%\go\bin</code>
          </li>
          <li>Restart your terminal</li>
        </ol>
      </div>
    )
  }

  // macOS/Linux
  return (
    <div className="space-y-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
      <p className="text-sm text-amber-300 font-medium">
        Go is installed but not in your PATH
      </p>
      <p className="text-xs text-amber-400/80">
        Add this line to your shell config file (~/.zshrc, ~/.bashrc, or ~/.profile):
      </p>
      <CommandBlock command='export PATH=$PATH:$(go env GOPATH)/bin' />
      <p className="text-xs text-amber-400/80">
        Then reload your shell:
      </p>
      <CommandBlock command="source ~/.zshrc  # or ~/.bashrc" />
    </div>
  )
}

/** Main Go install step component */
export function GoInstallStep({
  platform,
  hasHomebrew,
  goDetected,
  goVersion,
  pathIncludesGobin,
  isPolling = true,
  error,
}: GoInstallStepProps) {
  const [hasPlayedVoice, setHasPlayedVoice] = useState(false)
  const showPathError = goDetected && !pathIncludesGobin

  return (
    <div className="space-y-6">
      {/* Detection status */}
      <DetectionStatus
        detected={goDetected}
        version={goVersion}
        isPolling={isPolling && !goDetected}
        pathError={showPathError}
      />

      {/* PATH fix instructions (if needed) */}
      {showPathError && (
        <EnhancedPathFix platform={platform} />
      )}

      {/* Installation instructions (if Go not yet detected) */}
      {!goDetected && (
        <>
          {platform === 'darwin' && (
            <MacOSInstructions hasHomebrew={hasHomebrew} />
          )}
          {platform === 'linux' && <LinuxInstructions />}
          {platform === 'win32' && <WindowsInstructions />}
        </>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-900/30 border border-red-700/50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-sm font-medium">Installation Error</p>
            <p className="text-red-400/80 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Verification command */}
      {!goDetected && (
        <div className="pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-2">
            After installation, verify Go is working:
          </p>
          <CommandBlock command="go version" />
        </div>
      )}
    </div>
  )
}

export default GoInstallStep
