import { useState } from 'react'
import {
  Check,
  X,
  Download,
  Folder,
  Terminal,
  Mic,
  Loader2,
  ExternalLink,
  Flame,
  ChevronRight,
  Edit3,
  FolderOpen,
  Zap,
  ChevronDown,
} from 'lucide-react'
import {
  useSetupStatus,
  useInstallDependency,
  useCreateWorkspace,
  type DependencyInfo,
} from '../hooks/useGastown'

interface SetupWizardProps {
  onComplete?: () => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const { data: status, isLoading, refetch } = useSetupStatus()
  const installDep = useInstallDependency()
  const createWorkspace = useCreateWorkspace()
  const [voiceResponse, setVoiceResponse] = useState<string | null>(null)
  const [activeInstall, setActiveInstall] = useState<string | null>(null)
  const [workspacePath, setWorkspacePath] = useState<string>('~/gt')
  const [showPathInput, setShowPathInput] = useState(false)
  const [showDepsInQuickSetup, setShowDepsInQuickSetup] = useState(false)

  // Detect Quick Setup eligibility: all deps installed but no workspace
  const isQuickSetupEligible = status && status.missing_count === 0 && !status.workspace_exists

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
        <span className="ml-3 text-gray-400">Checking your setup...</span>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="text-center py-8 text-gray-400">
        Unable to check setup status
      </div>
    )
  }

  // If everything is ready, show success
  if (status.ready) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">
          Welcome to Gas Town!
        </h2>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          All dependencies are installed and your workspace is ready.
          Time to start slinging some work.
        </p>
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
        >
          Enter Gas Town
        </button>
      </div>
    )
  }

  // Quick Setup: All tools installed, just need workspace
  if (isQuickSetupEligible) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Quick Setup Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
            <Zap className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Quick Setup
          </h1>
          <p className="text-gray-400">
            All tools installed! Just create a workspace to get started.
          </p>
        </div>

        {/* Voice Guidance */}
        {(voiceResponse || status.voice_guidance) && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Mic className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Voice Assistant</div>
                <p className="text-gray-300">
                  {voiceResponse || status.voice_guidance}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Workspace Creation - Prominent */}
        <div className="bg-slate-800/50 border-2 border-orange-500/50 rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-slate-700 bg-orange-500/10">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-orange-400" />
              Create Workspace
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Path Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Workspace Location
                </label>
                <div className="relative">
                  <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={workspacePath}
                    onChange={handlePathChange}
                    placeholder="~/gt"
                    className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-lg"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This directory will be created if it doesn't exist. Use ~ for home directory.
                </p>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateWorkspace}
                disabled={activeInstall !== null}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-lg transition-colors"
              >
                {activeInstall === 'workspace' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Flame className="w-5 h-5" />
                )}
                Create Workspace at {workspacePath}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Dependencies Status */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowDepsInQuickSetup(!showDepsInQuickSetup)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
          >
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              All {status.dependencies.length} dependencies installed
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                showDepsInQuickSetup ? 'rotate-180' : ''
              }`}
            />
          </button>
          {showDepsInQuickSetup && (
            <div className="border-t border-slate-700 divide-y divide-slate-700">
              {status.dependencies.map((dep) => (
                <div key={dep.name} className="px-4 py-2 flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-white">{dep.name}</span>
                  <span className="text-gray-500">{dep.version}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setVoiceResponse(null)
              refetch()
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Refresh Status
          </button>
        </div>
      </div>
    )
  }

  const handleInstall = async (depName: string) => {
    setActiveInstall(depName)
    try {
      const result = await installDep.mutateAsync(depName)
      setVoiceResponse(result.voice_response)

      // If it suggests opening a URL, do it
      if (result.next_step?.startsWith('http')) {
        window.open(result.next_step, '_blank')
      }

      // Refresh status after a short delay
      setTimeout(() => refetch(), 1000)
    } catch (error) {
      setVoiceResponse(`Installation failed: ${error}`)
    } finally {
      setActiveInstall(null)
    }
  }

  const handleCreateWorkspace = async () => {
    setActiveInstall('workspace')
    try {
      // Expand ~ to home directory path (backend handles this)
      const path = workspacePath.startsWith('~/')
        ? workspacePath
        : workspacePath || undefined
      const result = await createWorkspace.mutateAsync(path)
      setVoiceResponse(result.voice_response)
      setShowPathInput(false)
      setTimeout(() => refetch(), 1000)
    } catch (error) {
      setVoiceResponse(`Workspace creation failed: ${error}`)
    } finally {
      setActiveInstall(null)
    }
  }

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkspacePath(e.target.value)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 mb-4">
          <Flame className="w-8 h-8 text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Gas Town Setup
        </h1>
        <p className="text-gray-400">
          Let's get you ready to command the chaos
        </p>
      </div>

      {/* Voice Guidance */}
      {(voiceResponse || status.voice_guidance) && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Mic className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Voice Assistant</div>
              <p className="text-gray-300">
                {voiceResponse || status.voice_guidance}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dependencies List */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Dependencies
            <span className="text-sm font-normal text-gray-500">
              ({status.dependencies.filter((d) => d.installed).length}/{status.dependencies.length} installed)
            </span>
          </h2>
        </div>
        <div className="divide-y divide-slate-700">
          {status.dependencies.map((dep) => (
            <DependencyRow
              key={dep.name}
              dep={dep}
              isInstalling={activeInstall === dep.name.toLowerCase()}
              onInstall={() => handleInstall(dep.name.toLowerCase().split(' ')[0])}
            />
          ))}
        </div>
      </div>

      {/* Workspace Status */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Workspace
          </h2>
        </div>
        <div className="p-4">
          {status.workspace_exists ? (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-white font-medium">Workspace Ready</div>
                <div className="text-sm text-gray-400">
                  {status.workspace_path}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <FolderOpen className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">No Workspace</div>
                    <div className="text-sm text-gray-400">
                      Create a Gas Town workspace to get started
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowPathInput(!showPathInput)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Change path"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              {/* Path Selection */}
              {showPathInput && (
                <div className="bg-slate-900/50 rounded-lg p-3 space-y-3">
                  <label className="block text-sm text-gray-400">
                    Workspace Location
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={workspacePath}
                        onChange={handlePathChange}
                        placeholder="~/gt"
                        className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    This directory will be created if it doesn't exist. Use ~ for home directory.
                  </p>
                </div>
              )}

              {/* Create Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleCreateWorkspace}
                  disabled={status.missing_count > 0 || activeInstall !== null}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {activeInstall === 'workspace' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  Create at {workspacePath}
                </button>
              </div>

              {/* Missing Dependencies Warning */}
              {status.missing_count > 0 && (
                <p className="text-sm text-yellow-400">
                  Install all dependencies before creating workspace
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="text-center mt-6">
        <button
          onClick={() => {
            setVoiceResponse(null)
            refetch()
          }}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Refresh Status
        </button>
      </div>
    </div>
  )
}

interface DependencyRowProps {
  dep: DependencyInfo
  isInstalling: boolean
  onInstall: () => void
}

function DependencyRow({ dep, isInstalling, onInstall }: DependencyRowProps) {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${
            dep.installed ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}
        >
          {dep.installed ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <X className="w-4 h-4 text-red-400" />
          )}
        </div>
        <div>
          <div className="text-white font-medium">{dep.name}</div>
          {dep.installed ? (
            <div className="text-sm text-gray-500">
              {dep.version || 'Installed'} {dep.path && `• ${dep.path}`}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              {dep.install_instructions}
            </div>
          )}
        </div>
      </div>

      {!dep.installed && (
        <div className="flex items-center gap-2">
          {dep.install_url && (
            <a
              href={dep.install_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Open download page"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onInstall}
            disabled={isInstalling}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isInstalling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Install
          </button>
        </div>
      )}
    </div>
  )
}

export default SetupWizard
