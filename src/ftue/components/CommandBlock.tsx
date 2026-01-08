import { useState, useCallback } from 'react'
import { Copy, Check, Terminal } from 'lucide-react'

interface CommandBlockProps {
  command: string
  description?: string
}

/** Copyable command block for installation instructions */
export function CommandBlock({ command, description }: CommandBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access might fail
    }
  }, [command])

  return (
    <div className="w-full max-w-lg">
      {description && (
        <p className="text-sm text-slate-400 mb-2">{description}</p>
      )}
      <div className="relative group">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 rounded-lg border border-slate-700 font-mono text-sm">
          <Terminal className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <code className="flex-1 text-green-400 overflow-x-auto whitespace-nowrap">
            {command}
          </code>
          <button
            onClick={handleCopy}
            className={`
              p-1.5 rounded transition-colors flex-shrink-0
              ${copied
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }
            `}
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Platform-specific installation instructions */
export function InstallInstructions({
  platform,
  hasHomebrew,
}: {
  platform: 'darwin' | 'linux' | 'win32'
  hasHomebrew?: boolean
}) {
  if (platform === 'darwin') {
    return (
      <div className="space-y-4">
        {hasHomebrew ? (
          <CommandBlock
            command="brew install go"
            description="Install Go using Homebrew:"
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Install Go using Homebrew, or download from{' '}
              <a
                href="https://go.dev/dl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                go.dev
              </a>
            </p>
            <CommandBlock
              command="/bin/bash -c &quot;$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)&quot;"
              description="Or install Homebrew first:"
            />
          </div>
        )}
      </div>
    )
  }

  if (platform === 'linux') {
    return (
      <div className="space-y-4">
        <CommandBlock
          command="sudo apt install golang-go"
          description="Install Go on Ubuntu/Debian:"
        />
        <p className="text-xs text-slate-500">
          Or download from{' '}
          <a
            href="https://go.dev/dl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            go.dev
          </a>
        </p>
      </div>
    )
  }

  // Windows
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Download the Windows installer from{' '}
        <a
          href="https://go.dev/dl"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          go.dev/dl
        </a>
      </p>
      <p className="text-xs text-slate-500">
        Make sure to check the box that adds Go to your PATH during installation.
      </p>
    </div>
  )
}

/** PATH fix instructions */
export function PathFixInstructions({ shell = 'zsh' }: { shell?: 'zsh' | 'bash' }) {
  const configFile = shell === 'zsh' ? '~/.zshrc' : '~/.bashrc'

  return (
    <div className="space-y-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
      <p className="text-sm text-amber-300">
        Go is installed but not in your PATH. Add this line to your {configFile}:
      </p>
      <CommandBlock command="export PATH=$PATH:$(go env GOPATH)/bin" />
      <p className="text-xs text-amber-400/80">
        Then run <code className="px-1 py-0.5 bg-slate-800 rounded">source {configFile}</code> or restart your terminal.
      </p>
    </div>
  )
}
