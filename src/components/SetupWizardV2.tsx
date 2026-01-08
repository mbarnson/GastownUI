import { useState, useEffect } from 'react'
import {
  Check,
  X,
  Download,
  Folder,
  Terminal,
  Mic,
  Loader2,
  Flame,
  ChevronRight,
  FolderOpen,
  ChevronDown,
  Volume2,
  VolumeX,
  MessageSquare,
  Shield,
  Sparkles,
} from 'lucide-react'
import {
  useInstallDependency,
  useCreateWorkspace,
} from '../hooks/useGastown'
import { useStartVisionServer } from '../hooks/useGastown'
import { useFTUEStateMachine } from '../hooks/useFTUEStateMachine'

interface SetupWizardV2Props {
  onComplete?: () => void
  requireConsent?: boolean
}

/**
 * SetupWizardV2 - Upgraded FTUE with state machine
 *
 * Features:
 * - Full state machine for tracking progress
 * - Voice state tracking (prebaked/live/text-only)
 * - Download progress with ETA
 * - Consent flow for microphone and data
 * - Theatrical transitions between phases
 */
export function SetupWizardV2({ onComplete, requireConsent = false }: SetupWizardV2Props) {
  const {
    actions,
    phase,
    voiceState,
    download,
    consent,
    progress,
    stepLabel,
    showTransition,
    error,
  } = useFTUEStateMachine({ requireConsent })

  const installDep = useInstallDependency()
  const createWorkspace = useCreateWorkspace()
  const startVoice = useStartVisionServer()

  const [workspacePath, setWorkspacePath] = useState('~/gt')
  const [activeInstall, setActiveInstall] = useState<string | null>(null)
  const [showDepsDetail, setShowDepsDetail] = useState(false)
  const [theatricalMessage, setTheatricalMessage] = useState<string | null>(null)

  // Theatrical messages for transitions
  const theatricalMessages = [
    "Warming up the chaos engine...",
    "Calibrating snark levels...",
    "Summoning polecats from the void...",
    "Charging the voice crystals...",
    "Aligning the stars of productivity...",
    "Consulting the oracle of code...",
  ]

  // Show theatrical transition
  useEffect(() => {
    if (showTransition) {
      const msg = theatricalMessages[Math.floor(Math.random() * theatricalMessages.length)]
      setTheatricalMessage(msg)
      const timer = setTimeout(() => setTheatricalMessage(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [showTransition])

  // Handle install
  const handleInstall = async (depName: string) => {
    setActiveInstall(depName)
    try {
      await installDep.mutateAsync(depName)
      actions.depsInstalled()
    } catch {
      // Error handled by hook
    } finally {
      setActiveInstall(null)
    }
  }

  // Handle workspace creation
  const handleCreateWorkspace = async () => {
    actions.startWorkspaceCreation()
    try {
      await createWorkspace.mutateAsync(workspacePath)
      actions.workspaceCreated()
    } catch (err) {
      actions.workspaceFailed(String(err))
    }
  }

  // Handle voice setup
  const handleStartVoice = async () => {
    actions.startVoiceServer()
    try {
      await startVoice.mutateAsync()
      // State machine will auto-transition when voiceStatus.ready
    } catch (err) {
      actions.voiceFailed(String(err))
    }
  }

  // Request microphone permission
  const handleRequestMicPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      actions.grantConsent({ microphoneGranted: true })
    } catch {
      actions.declineConsent('microphoneGranted')
    }
  }

  // Render theatrical transition overlay
  if (theatricalMessage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95">
        <div className="text-center animate-pulse">
          <Sparkles className="w-16 h-16 text-orange-400 mx-auto mb-4 animate-spin" />
          <p className="text-xl text-orange-400 font-medium">{theatricalMessage}</p>
        </div>
      </div>
    )
  }

  // Progress bar component
  const ProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between text-sm text-gray-400 mb-2">
        <span>{stepLabel}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )

  // Consent Phase
  if (phase === 'needs_consent') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Gas Town</h1>
          <p className="text-gray-400">Before we begin, please review these permissions</p>
        </div>

        <ProgressBar />

        <div className="space-y-4">
          {/* Terms */}
          <ConsentCard
            title="Terms of Service"
            description="By using Gas Town, you agree to our terms of service and community guidelines."
            icon={<Shield className="w-5 h-5" />}
            accepted={consent.termsAccepted}
            onAccept={() => actions.grantConsent({ termsAccepted: true })}
            required
          />

          {/* Microphone */}
          <ConsentCard
            title="Microphone Access"
            description="Enable voice control with LFM2.5. You can use text mode if you prefer."
            icon={<Mic className="w-5 h-5" />}
            accepted={consent.microphoneGranted}
            onAccept={handleRequestMicPermission}
            onDecline={() => actions.declineConsent('microphoneGranted')}
          />

          {/* Data Collection (optional) */}
          <ConsentCard
            title="Usage Analytics"
            description="Help improve Gas Town by sharing anonymous usage data. Completely optional."
            icon={<Sparkles className="w-5 h-5" />}
            accepted={consent.dataCollectionAccepted}
            onAccept={() => actions.grantConsent({ dataCollectionAccepted: true })}
            onDecline={() => actions.declineConsent('dataCollectionAccepted')}
            optional
          />
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => actions.grantConsent({ termsAccepted: true })}
            disabled={!consent.termsAccepted}
            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            Continue Setup
          </button>
        </div>
      </div>
    )
  }

  // Checking phase
  if (phase === 'checking') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
        <span className="ml-3 text-gray-400">Checking your setup...</span>
      </div>
    )
  }

  // Voice setup phase
  if (phase === 'voice_setup') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500/20 mb-4">
            <Volume2 className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Voice Setup</h1>
          <p className="text-gray-400">Setting up LFM2.5 for voice interactions</p>
        </div>

        <ProgressBar />

        {/* Download Progress */}
        {voiceState === 'downloading' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Download className="w-5 h-5 text-cyan-400 animate-bounce" />
              <span className="text-white font-medium">Downloading {download.currentFile}</span>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all"
                style={{ width: `${download.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>
                {formatBytes(download.bytesDownloaded)} / {formatBytes(download.totalBytes)}
              </span>
              <span>
                {download.etaSeconds !== null
                  ? `~${formatTime(download.etaSeconds)} remaining`
                  : 'Calculating...'}
              </span>
            </div>
            {download.speedBps > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {formatBytes(download.speedBps)}/s
              </div>
            )}
          </div>
        )}

        {/* Starting voice server */}
        {voiceState === 'starting' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
            <p className="text-gray-300">Starting voice engine...</p>
            <p className="text-sm text-gray-500 mt-1">This usually takes 5-10 seconds</p>
          </div>
        )}

        {/* Voice error with fallback options */}
        {voiceState === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <VolumeX className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Voice setup failed</p>
                {error && <p className="text-sm text-gray-400 mt-1">{error}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Not started - show options */}
        {voiceState === 'not_started' && (
          <div className="space-y-4">
            <VoiceOptionCard
              title="Live Voice (Recommended)"
              description="Download LFM2.5 (~500MB) for full voice-to-voice capability"
              icon={<Mic className="w-6 h-6" />}
              recommended
              onClick={handleStartVoice}
              loading={startVoice.isPending}
            />
            <VoiceOptionCard
              title="Pre-baked Voice"
              description="Use pre-recorded responses. Faster setup, limited interactions."
              icon={<Volume2 className="w-6 h-6" />}
              onClick={() => actions.usePrebaked()}
            />
            <VoiceOptionCard
              title="Text Only"
              description="Skip voice entirely. You can enable it later in settings."
              icon={<MessageSquare className="w-6 h-6" />}
              onClick={() => actions.useTextOnly()}
            />
          </div>
        )}

        {/* Retry/Skip buttons for error state */}
        {voiceState === 'error' && (
          <div className="flex justify-center gap-4">
            <button
              onClick={handleStartVoice}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => actions.usePrebaked()}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
            >
              Use Pre-baked
            </button>
            <button
              onClick={() => actions.useTextOnly()}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              Continue with Text
            </button>
          </div>
        )}
      </div>
    )
  }

  // Complete phase
  if (phase === 'complete') {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">Welcome to Gas Town!</h2>
        <p className="text-gray-400 mb-2 max-w-md mx-auto">
          {voiceState === 'live' && "Voice control is ready. Say 'Hey Gas Town' or hold Space to speak."}
          {voiceState === 'prebaked' && "Using pre-recorded voice. Full voice can be enabled in settings."}
          {voiceState === 'text_only' && "Text mode active. Voice can be enabled in settings."}
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
          {voiceState === 'live' && <Mic className="w-4 h-4 text-green-400" />}
          {voiceState === 'prebaked' && <Volume2 className="w-4 h-4 text-cyan-400" />}
          {voiceState === 'text_only' && <MessageSquare className="w-4 h-4 text-gray-400" />}
          <span>
            {voiceState === 'live' && 'Live Voice'}
            {voiceState === 'prebaked' && 'Pre-baked Voice'}
            {voiceState === 'text_only' && 'Text Only'}
          </span>
        </div>
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
        >
          Enter Gas Town
        </button>
      </div>
    )
  }

  // Default: needs_deps, needs_workspace, workspace_creating
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 mb-4">
          <Flame className="w-8 h-8 text-orange-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {phase === 'needs_deps' ? 'Install Dependencies' : 'Create Workspace'}
        </h1>
        <p className="text-gray-400">
          {phase === 'needs_deps'
            ? 'Install the required tools to get started'
            : 'Set up your Gas Town workspace'}
        </p>
      </div>

      <ProgressBar />

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Dependencies (for needs_deps phase or collapsed in workspace phase) */}
      {phase === 'needs_deps' ? (
        <DependencyList
          onInstall={handleInstall}
          activeInstall={activeInstall}
        />
      ) : (
        <div className="mb-6">
          <button
            onClick={() => setShowDepsDetail(!showDepsDetail)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
          >
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              All dependencies installed
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showDepsDetail ? 'rotate-180' : ''}`} />
          </button>
          {showDepsDetail && (
            <DependencyList onInstall={handleInstall} activeInstall={activeInstall} collapsed />
          )}
        </div>
      )}

      {/* Workspace creation (for needs_workspace phase) */}
      {(phase === 'needs_workspace' || phase === 'workspace_creating') && (
        <div className="bg-slate-800/50 border-2 border-orange-500/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 bg-orange-500/10">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-orange-400" />
              Create Workspace
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Workspace Location</label>
              <div className="relative">
                <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={workspacePath}
                  onChange={(e) => setWorkspacePath(e.target.value)}
                  placeholder="~/gt"
                  disabled={phase === 'workspace_creating'}
                  className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 text-lg disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This directory will be created if it doesn't exist.
              </p>
            </div>
            <button
              onClick={handleCreateWorkspace}
              disabled={phase === 'workspace_creating'}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-lg transition-colors"
            >
              {phase === 'workspace_creating' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Flame className="w-5 h-5" />
              )}
              {phase === 'workspace_creating' ? 'Creating...' : `Create at ${workspacePath}`}
            </button>
          </div>
        </div>
      )}

      {/* Refresh */}
      <div className="text-center mt-6">
        <button
          onClick={() => actions.startChecking()}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Refresh Status
        </button>
      </div>
    </div>
  )
}

// ============== Sub-components ==============

interface ConsentCardProps {
  title: string
  description: string
  icon: React.ReactNode
  accepted: boolean | null
  onAccept: () => void
  onDecline?: () => void
  required?: boolean
  optional?: boolean
}

function ConsentCard({
  title,
  description,
  icon,
  accepted,
  onAccept,
  onDecline,
  required,
  optional,
}: ConsentCardProps) {
  return (
    <div className={`bg-slate-800/50 border rounded-xl p-4 ${
      accepted === true ? 'border-green-500/50' :
      accepted === false ? 'border-gray-600' :
      'border-slate-700'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          accepted === true ? 'bg-green-500/20 text-green-400' :
          accepted === false ? 'bg-gray-500/20 text-gray-400' :
          'bg-purple-500/20 text-purple-400'
        }`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{title}</span>
            {required && <span className="text-xs text-red-400">Required</span>}
            {optional && <span className="text-xs text-gray-500">Optional</span>}
          </div>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
        <div className="flex gap-2">
          {accepted !== true && (
            <button
              onClick={onAccept}
              className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium rounded-lg transition-colors"
            >
              Accept
            </button>
          )}
          {onDecline && accepted !== false && accepted !== true && (
            <button
              onClick={onDecline}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-400 text-sm font-medium rounded-lg transition-colors"
            >
              Decline
            </button>
          )}
          {accepted === true && (
            <div className="flex items-center gap-1 text-green-400">
              <Check className="w-4 h-4" />
              <span className="text-sm">Accepted</span>
            </div>
          )}
          {accepted === false && (
            <div className="flex items-center gap-1 text-gray-500">
              <X className="w-4 h-4" />
              <span className="text-sm">Declined</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface VoiceOptionCardProps {
  title: string
  description: string
  icon: React.ReactNode
  recommended?: boolean
  onClick: () => void
  loading?: boolean
}

function VoiceOptionCard({
  title,
  description,
  icon,
  recommended,
  onClick,
  loading,
}: VoiceOptionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        recommended
          ? 'bg-cyan-500/10 border-cyan-500/50 hover:border-cyan-400'
          : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${recommended ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-gray-400'}`}>
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{title}</span>
            {recommended && <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">Recommended</span>}
          </div>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-500 ml-auto flex-shrink-0" />
      </div>
    </button>
  )
}

interface DependencyListProps {
  onInstall: (name: string) => void
  activeInstall: string | null
  collapsed?: boolean
}

function DependencyList({ onInstall: _onInstall, activeInstall: _activeInstall, collapsed }: DependencyListProps) {
  // This would use the actual dependency data from useSetupStatus
  // For now, showing structure
  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden ${collapsed ? 'mt-2' : ''}`}>
      {!collapsed && (
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Dependencies
          </h2>
        </div>
      )}
      <div className="divide-y divide-slate-700 text-sm text-gray-400 p-2">
        <p className="p-2">Dependency list loaded from useSetupStatus hook</p>
      </div>
    </div>
  )
}

// ============== Utilities ==============

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
}

export default SetupWizardV2
