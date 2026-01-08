import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useReducer, useEffect, useMemo, useCallback } from 'react'
import {
  ftueReducer,
  createInitialState,
  getDetector,
  WelcomeScene,
  CommandBlock,
  InstallInstructions,
  PathFixInstructions,
  SetupChecklist,
  Logo,
  MicrophoneIndicator,
  getChecklistFromSetup,
  type FTUEState,
} from '../ftue'

export const Route = createFileRoute('/ftue')({
  component: FTUEPage,
  // Disable SSR - FTUE needs client-side APIs
  ssr: false,
})

function FTUEPage() {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(ftueReducer, undefined, createInitialState)
  const detector = useMemo(() => getDetector(), [])

  // Initial detection on mount
  useEffect(() => {
    detector.checkAll().then(setupState => {
      dispatch({ type: 'INITIAL_CHECK', setupState })
    })
  }, [detector])

  // Start polling when in waiting states
  useEffect(() => {
    if (state.step === 'waiting_for_go' || state.step === 'install_go') {
      detector.startPolling('go', (detected, version) => {
        if (detected && version) {
          dispatch({ type: 'GO_DETECTED', version })
        }
      })
    }

    if (state.step === 'waiting_for_beads' || state.step === 'install_beads') {
      detector.startPolling('bd', (detected, version) => {
        if (detected && version) {
          dispatch({ type: 'BD_DETECTED', version })
        }
      })
    }

    if (state.step === 'waiting_for_gastown' || state.step === 'install_gastown') {
      detector.startPolling('gt', (detected, version) => {
        if (detected && version) {
          dispatch({ type: 'GT_DETECTED', version })
        }
      })
    }

    return () => {
      detector.stopPolling()
    }
  }, [state.step, detector])

  // Navigation handlers
  const handleProceed = useCallback(() => {
    dispatch({ type: 'PROCEED' })
  }, [])

  const handleSkip = useCallback(() => {
    dispatch({ type: 'SKIP' })
  }, [])

  const handleToggleVoice = useCallback(() => {
    dispatch({ type: 'TOGGLE_VOICE' })
  }, [])

  const handleGoToDashboard = useCallback(() => {
    navigate({ to: '/' })
  }, [navigate])

  // Render based on current step
  switch (state.step) {
    case 'checking_prerequisites':
      return <LoadingScreen message="Checking your system..." />

    case 'welcome':
      return (
        <WelcomeScene
          state={state}
          onProceed={handleProceed}
          onSkip={handleSkip}
          onToggleVoice={handleToggleVoice}
        />
      )

    case 'install_go':
    case 'waiting_for_go':
      return (
        <InstallStep
          state={state}
          title="Install Go"
          description="Go is the programming language that Gas Town and Beads are written in."
          onToggleVoice={handleToggleVoice}
          onSkip={handleSkip}
        >
          <InstallInstructions
            platform={state.setupState.platform}
            hasHomebrew={state.setupState.hasHomebrew}
          />
          {state.setupState.hasGo && !state.setupState.pathIncludesGobin && (
            <PathFixInstructions />
          )}
        </InstallStep>
      )

    case 'install_beads':
    case 'waiting_for_beads':
      return (
        <InstallStep
          state={state}
          title="Install Beads"
          description="Beads is a Git-backed issue tracker that your agents will use to coordinate work."
          onToggleVoice={handleToggleVoice}
          onSkip={handleSkip}
        >
          <CommandBlock
            command="go install github.com/steveyegge/beads/cmd/bd@latest"
            description="Run this in your terminal:"
          />
          {state.lastError && (
            <div className="mt-4 p-3 bg-amber-900/30 border border-amber-700 rounded-lg text-sm text-amber-300">
              {state.lastError}
            </div>
          )}
        </InstallStep>
      )

    case 'install_gastown':
    case 'waiting_for_gastown':
      return (
        <InstallStep
          state={state}
          title="Install Gas Town"
          description="Gas Town is the multi-agent orchestration system."
          onToggleVoice={handleToggleVoice}
          onSkip={handleSkip}
        >
          <CommandBlock
            command="go install github.com/steveyegge/gastown/cmd/gt@latest"
            description="Run this in your terminal:"
          />
          {state.lastError && (
            <div className="mt-4 p-3 bg-amber-900/30 border border-amber-700 rounded-lg text-sm text-amber-300">
              {state.lastError}
            </div>
          )}
        </InstallStep>
      )

    case 'configure_workspace':
      return (
        <WorkspaceConfigStep
          state={state}
          onConfigure={(path) => dispatch({ type: 'SET_CUSTOM_PATH', path })}
          onToggleVoice={handleToggleVoice}
          onSkip={handleSkip}
        />
      )

    case 'creating_workspace':
      return <LoadingScreen message="Creating your workspace..." />

    case 'complete':
      return (
        <CompletionScreen
          workspacePath={state.setupState.workspacePath || '~/gt'}
          onAddRig={() => dispatch({ type: 'START_ADD_RIG' })}
          onStartMayor={() => dispatch({ type: 'START_MAYOR' })}
          onDashboard={handleGoToDashboard}
        />
      )

    case 'skipped':
      return (
        <SkippedScreen onDashboard={handleGoToDashboard} />
      )

    default:
      return <LoadingScreen message="Loading..." />
  }
}

/** Loading screen */
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-400">{message}</p>
      </div>
    </div>
  )
}

/** Generic install step layout */
function InstallStep({
  state,
  title,
  description,
  children,
  onToggleVoice,
  onSkip,
}: {
  state: FTUEState
  title: string
  description: string
  children: React.ReactNode
  onToggleVoice: () => void
  onSkip: () => void
}) {
  const checklist = getChecklistFromSetup(state.setupState)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
        <Logo size="md" />

        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">{title}</h2>
          <p className="text-slate-400">{description}</p>
        </div>

        <div className="w-full max-w-lg">
          {children}
        </div>

        <SetupChecklist items={checklist} />

        <MicrophoneIndicator enabled={state.voiceEnabled} onToggle={onToggleVoice} />
      </main>

      <footer className="px-6 py-4 flex justify-center">
        <button
          onClick={onSkip}
          className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
        >
          Skip setup for now
        </button>
      </footer>
    </div>
  )
}

/** Workspace configuration step */
function WorkspaceConfigStep({
  state,
  onConfigure,
  onToggleVoice,
  onSkip,
}: {
  state: FTUEState
  onConfigure: (path: string) => void
  onToggleVoice: () => void
  onSkip: () => void
}) {
  const checklist = getChecklistFromSetup(state.setupState)
  const defaultPath = '~/gt'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
        <Logo size="md" />

        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Create Workspace</h2>
          <p className="text-slate-400">
            Your Gas Town workspace is where all your projects and agents will live.
          </p>
        </div>

        <div className="w-full max-w-md bg-slate-800 rounded-xl p-6 border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Workspace Location
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              defaultValue={defaultPath}
              className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            This will create: mayor/, .beads/, logs/
          </p>

          <button
            onClick={() => onConfigure(defaultPath)}
            className="mt-4 w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            Create Workspace
          </button>
        </div>

        <SetupChecklist items={checklist} currentItemId="workspace" />

        <MicrophoneIndicator enabled={state.voiceEnabled} onToggle={onToggleVoice} />
      </main>

      <footer className="px-6 py-4 flex justify-center">
        <button
          onClick={onSkip}
          className="text-sm text-slate-500 hover:text-slate-400 transition-colors"
        >
          Skip setup for now
        </button>
      </footer>
    </div>
  )
}

/** Completion screen */
function CompletionScreen({
  workspacePath,
  onAddRig,
  onStartMayor,
  onDashboard,
}: {
  workspacePath: string
  onAddRig: () => void
  onStartMayor: () => void
  onDashboard: () => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Setup Complete!</h1>
        <p className="text-slate-400">
          Your Gas Town workspace is ready at <code className="text-blue-400">{workspacePath}</code>
        </p>
      </div>

      <div className="w-full max-w-md bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-3">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">What's next?</h2>

        <button
          onClick={onAddRig}
          className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <div className="font-medium text-slate-200 group-hover:text-white">Add a project</div>
              <div className="text-sm text-slate-400">Add a Git repo as your first rig</div>
            </div>
          </div>
        </button>

        <button
          onClick={onStartMayor}
          className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">👔</span>
            <div>
              <div className="font-medium text-slate-200 group-hover:text-white">Start the Mayor</div>
              <div className="text-sm text-slate-400">Fire up your coordination agent</div>
            </div>
          </div>
        </button>

        <button
          onClick={onDashboard}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-center transition-colors"
        >
          <span className="font-medium text-white">Go to Dashboard</span>
        </button>
      </div>

      <p className="mt-8 text-sm text-slate-500">
        Pro tip: You can always access Gas Town from your terminal with <code className="text-slate-400">gt</code> commands.
      </p>
    </div>
  )
}

/** Skipped setup screen */
function SkippedScreen({ onDashboard }: { onDashboard: () => void }) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 py-12">
      <Logo size="md" />

      <div className="mt-8 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg max-w-md text-center">
        <p className="text-amber-300 text-sm">
          Gas Town is not fully configured. Some features may not work until you complete setup.
        </p>
      </div>

      <button
        onClick={onDashboard}
        className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
      >
        Continue to Dashboard
      </button>
    </div>
  )
}
