import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { VoiceInterface } from '../components/VoiceInterface'
import { SelfTestPanel } from '../components/SelfTestPanel'
import TmuxPanel from '../components/TmuxPanel'
import { DeepQueryPanel } from '../components/DeepQueryPanel'
import { SetupBanner } from '../components/SetupBanner'
import { useConvoys, useBeads, useStopAll } from '../hooks/useGastown'
import { useActiveMolecules } from '../hooks/useMolecule'
import { useSetupStatus, isSetupComplete } from '../hooks/useSetup'
import { useSetupPreferences } from '../hooks/useSetupPreferences'
import { useSidebarMode } from '../contexts/SidebarModeContext'
import {
  Truck,
  Circle,
  AlertTriangle,
  GitBranch,
  MessageCircle,
  X,
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: Dashboard })

function Dashboard() {
  const navigate = useNavigate()
  const { sidebarMode } = useSidebarMode()
  const { data: convoys, isLoading: convoysLoading } = useConvoys()
  const { data: readyBeads } = useBeads(undefined, 'open')
  const { data: molecules } = useActiveMolecules()
  const { data: setupStatus, isLoading: setupLoading } = useSetupStatus()
  const { preferences: setupPrefs, isLoaded: prefsLoaded } = useSetupPreferences()
  const stopAll = useStopAll()

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Redirect to setup if dependencies are missing (unless setup was skipped)
  useEffect(() => {
    if (
      !setupLoading &&
      prefsLoaded &&
      setupStatus &&
      !isSetupComplete(setupStatus) &&
      !setupPrefs.setupSkipped
    ) {
      navigate({ to: '/setup' })
    }
  }, [setupStatus, setupLoading, setupPrefs.setupSkipped, prefsLoaded, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Setup Banner - shown when setup was skipped or interrupted */}
        <SetupBanner className="mb-4 sm:mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Convoys */}
            <section className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-rose-500" />
                Convoys in Flight
              </h2>
              {convoysLoading ? (
                <div className="text-gray-400">Loading...</div>
              ) : convoys && convoys.length > 0 ? (
                <div className="space-y-3">
                  {convoys.map((convoy) => (
                    <div
                      key={convoy.id}
                      className="bg-slate-900/50 rounded-lg p-4 border border-slate-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{convoy.name}</span>
                        <span className="text-xs text-gray-400">{convoy.id}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-rose-500 h-2 rounded-full transition-all"
                          style={{ width: `${convoy.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                        <span>{convoy.status}</span>
                        {(convoy.polecats?.length ?? 0) > 0 && (
                          <span>{convoy.polecats?.length ?? 0} polecats</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  No convoys rolling. Time to sling some work!
                </div>
              )}
            </section>

            {/* Active Molecules (Workflows) */}
            <section className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-400" />
                Active Workflows
              </h2>
              {molecules && molecules.length > 0 ? (
                <div className="space-y-4">
                  {molecules.map((mol) => (
                    <div key={mol.id} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{mol.name}</span>
                        <span className="text-sm text-gray-400">{mol.progress}%</span>
                      </div>
                      {mol.description && (
                        <p className="text-sm text-gray-400 mt-1">{mol.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  No active workflows.
                </p>
              )}
            </section>

            {/* Ready Work */}
            <section className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Circle className="w-5 h-5 text-cyan-400" />
                Ready Work
              </h2>
              {readyBeads && readyBeads.length > 0 ? (
                <div className="space-y-2">
                  {readyBeads.slice(0, 5).map((bead) => (
                    <div
                      key={bead.id}
                      className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
                    >
                      <div>
                        <span className="text-white text-sm">{bead.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-gray-400">
                            {bead.type}
                          </span>
                          <span className="text-xs text-gray-500">P{bead.priority}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{bead.id}</span>
                    </div>
                  ))}
                  {readyBeads.length > 5 && (
                    <div className="text-center text-xs text-gray-400 pt-2">
                      +{readyBeads.length - 5} more items
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-4">
                  No ready work. The calm before the storm.
                </div>
              )}
            </section>

            {/* Tmux Sessions - Click to open terminal */}
            <TmuxPanel />
          </div>

          {/* Voice Interface / Self-Test / Deep Query sidebar - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {sidebarMode === 'selfTest' ? (
                <SelfTestPanel />
              ) : sidebarMode === 'deepQuery' ? (
                <div className="h-[calc(100vh-8rem)]">
                  <DeepQueryPanel />
                </div>
              ) : (
                <div className="h-[calc(100vh-8rem)]">
                  <VoiceInterface />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay lg:hidden ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile sidebar panel */}
      <aside
        className={`sidebar-panel lg:hidden safe-area-top safe-area-bottom ${isSidebarOpen ? 'open' : ''}`}
        aria-label="Voice interface panel"
        aria-hidden={!isSidebarOpen}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <h2 className="text-lg font-semibold text-white">
            {sidebarMode === 'selfTest'
              ? 'Self Test'
              : sidebarMode === 'deepQuery'
                ? 'Deep Query'
                : 'Voice Interface'}
          </h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="touch-target p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 h-[calc(100%-64px)] overflow-y-auto">
          {sidebarMode === 'selfTest' ? (
            <SelfTestPanel />
          ) : sidebarMode === 'deepQuery' ? (
            <DeepQueryPanel />
          ) : (
            <VoiceInterface />
          )}
        </div>
      </aside>

      {/* Mobile sidebar toggle button */}
      <button
        className="sidebar-toggle lg:hidden text-slate-600 hover:text-slate-800"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open voice interface"
        aria-expanded={isSidebarOpen}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Emergency Stop - positioned above sidebar toggle on mobile */}
      <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-30">
        <button
          className={`touch-target-lg p-3 sm:p-4 text-white rounded-full shadow-lg transition-all hover:scale-105 ${
            stopAll.isPending
              ? 'bg-red-800 cursor-wait shadow-red-800/30'
              : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
          }`}
          title="Emergency Stop All"
          aria-label="Emergency Stop All Gas Town agents"
          disabled={stopAll.isPending}
          onClick={() => {
            if (window.confirm('This will stop ALL Gas Town agents. Convoys will be interrupted. Continue?')) {
              stopAll.mutate(undefined, {
                onSuccess: (result) => {
                  if (result.exit_code === 0) {
                    alert('Emergency stop complete. All agents stopped.')
                  } else {
                    alert(`Emergency stop failed: ${result.stderr || 'Unknown error'}`)
                  }
                },
                onError: (error) => {
                  alert(`Emergency stop failed: ${error instanceof Error ? error.message : String(error)}`)
                },
              })
            }
          }}
        >
          <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
