import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { VoiceInterface } from '../components/VoiceInterface'
import { SelfTestPanel } from '../components/SelfTestPanel'
import TmuxPanel from '../components/TmuxPanel'
import { DeepQueryPanel } from '../components/DeepQueryPanel'
import { SetupBanner } from '../components/SetupBanner'
import { Skeleton, SkeletonText } from '../components/animations'
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
      <main id="main-content" className="max-w-7xl mx-auto px-6 py-8">
        {/* Setup Banner - shown when setup was skipped or interrupted */}
        <SetupBanner className="mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Convoys */}
            <section className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-6 animate-slide-up">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-rose-500" />
                Convoys in Flight
              </h2>
              {convoysLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center justify-between mb-3">
                        <Skeleton width="60%" height="1.25rem" />
                        <Skeleton width="4rem" height="0.75rem" />
                      </div>
                      <Skeleton width="100%" height="0.5rem" rounded="full" />
                      <div className="flex items-center justify-between mt-3">
                        <Skeleton width="5rem" height="0.75rem" />
                        <Skeleton width="4rem" height="0.75rem" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : convoys && convoys.length > 0 ? (
                <div className="space-y-3">
                  {convoys.map((convoy) => (
                    <div
                      key={convoy.id}
                      className="bg-slate-900/50 rounded-lg p-4 border border-slate-600 card-hover"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{convoy.name}</span>
                        <span className="text-xs text-gray-400">{convoy.id}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-500 h-2 rounded-full"
                          style={{
                            width: `${convoy.progress}%`,
                            transition: 'width var(--duration-slow) var(--ease-out)',
                          }}
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
            <section className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-400" />
                Active Workflows
              </h2>
              {molecules && molecules.length > 0 ? (
                <div className="space-y-4">
                  {molecules.map((mol) => (
                    <div key={mol.id} className="p-4 bg-slate-700/50 rounded-lg card-hover">
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
            <section className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
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

          {/* Voice Interface / Self-Test / Deep Query sidebar */}
          <div className="lg:col-span-1">
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

      {/* Emergency Stop */}
      <div className="fixed bottom-6 right-6">
        <button
          className={`p-4 text-white rounded-full shadow-lg btn-interactive ${
            stopAll.isPending
              ? 'bg-red-800 cursor-wait shadow-red-800/30'
              : 'bg-red-600 hover:bg-red-700 shadow-red-600/30 hover:shadow-red-600/50'
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
          <AlertTriangle className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
