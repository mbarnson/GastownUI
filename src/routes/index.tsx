import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { VoiceInterface } from '../components/VoiceInterface'
import { SelfTestPanel } from '../components/SelfTestPanel'
import { TmuxPanel } from '../components/TmuxPanel'
import { DeepQueryPanel } from '../components/DeepQueryPanel'
import { useConvoys, useTmuxSessions, useBeads } from '../hooks/useGastown'
import {
  Truck,
  Terminal,
  Circle,
  Activity,
  AlertTriangle,
  TestTube2,
  Brain,
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: Dashboard })

type SidebarMode = 'voice' | 'selfTest' | 'deepQuery'

function Dashboard() {
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('voice')
  const { data: convoys, isLoading: convoysLoading } = useConvoys()
  const { data: sessions } = useTmuxSessions()
  const { data: readyBeads } = useBeads(undefined, 'open')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-white">
              <span className="text-gray-400">GAS</span>{' '}
              <span className="text-rose-500">TOWN</span>
            </h1>
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded">
              Active
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>{convoys?.length || 0} Convoys</span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              <span>{sessions?.length || 0} Sessions</span>
            </div>
            <button
              className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
                sidebarMode === 'deepQuery'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'hover:bg-slate-700'
              }`}
              onClick={() => setSidebarMode(sidebarMode === 'deepQuery' ? 'voice' : 'deepQuery')}
              title="Deep Query - AI Analysis"
            >
              <Brain className="w-4 h-4" />
              <span>Query</span>
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
                sidebarMode === 'selfTest'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'hover:bg-slate-700'
              }`}
              onClick={() => setSidebarMode(sidebarMode === 'selfTest' ? 'voice' : 'selfTest')}
              title="Voice Self-Test"
            >
              <TestTube2 className="w-4 h-4" />
              <span>Self-Test</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
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
                        {convoy.polecats.length > 0 && (
                          <span>{convoy.polecats.length} polecats</span>
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
      </div>

      {/* Emergency Stop */}
      <div className="fixed bottom-6 right-6">
        <button
          className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg shadow-red-600/30 transition-all hover:scale-105"
          title="Emergency Stop All"
          onClick={() => {
            if (window.confirm('Stop ALL Gas Town agents? This cannot be undone.')) {
              // TODO: Implement emergency stop
              alert('Emergency stop not yet implemented')
            }
          }}
        >
          <AlertTriangle className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
