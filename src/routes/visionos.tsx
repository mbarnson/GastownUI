import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Terminal,
  Truck,
  Activity,
  DollarSign,
  Mic,
  Plus,
} from 'lucide-react'
import SpatialWindow, {
  SpatialPosition,
  createSpatialGrid,
} from '../components/visionos/SpatialWindow'
import GlanceableConvoyStatus, {
  ConvoyAggregateGlance,
  mockConvoys,
  type ConvoyGlance,
} from '../components/visionos/GlanceableConvoyStatus'
import SpatialTmuxPanel, {
  mockTmuxSessions,
  type TmuxSession,
} from '../components/visionos/SpatialTmuxPanel'
import VoiceOnlyMode from '../components/mobile/VoiceOnlyMode'

export const Route = createFileRoute('/visionos')({
  component: VisionOSPage,
})

interface SpatialWindowConfig {
  id: string
  title: string
  type: 'convoy' | 'tmux' | 'voice' | 'activity' | 'cost'
  position: SpatialPosition
  accentColor: string
  minimized?: boolean
}

function VisionOSPage() {
  const [perspective, setPerspective] = useState(1200)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [focusedWindow, setFocusedWindow] = useState<string | null>('convoy')
  const [convoys] = useState<ConvoyGlance[]>(mockConvoys)
  const [tmuxSessions] = useState<TmuxSession[]>(mockTmuxSessions)
  const [selectedTmuxSession, setSelectedTmuxSession] = useState<string>('gastownui')
  const [selectedTmuxWindow, setSelectedTmuxWindow] = useState<string>('win-0')

  // Initialize window positions
  const [windows, setWindows] = useState<SpatialWindowConfig[]>(() => {
    const grid = createSpatialGrid(4, {
      startX: 80,
      startY: 80,
      spacingX: 400,
      spacingY: 360,
      columns: 2,
      depthVariance: 50,
    })

    return [
      {
        id: 'convoy',
        title: 'Convoy Status',
        type: 'convoy',
        position: grid[0],
        accentColor: 'cyan',
      },
      {
        id: 'tmux',
        title: 'Terminal Sessions',
        type: 'tmux',
        position: grid[1],
        accentColor: 'green',
      },
      {
        id: 'activity',
        title: 'Activity Feed',
        type: 'activity',
        position: grid[2],
        accentColor: 'purple',
      },
      {
        id: 'cost',
        title: 'Cost Tracker',
        type: 'cost',
        position: grid[3],
        accentColor: 'orange',
      },
    ]
  })

  const handlePositionChange = useCallback(
    (id: string, position: SpatialPosition) => {
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, position } : w))
      )
    },
    []
  )

  const handleCloseWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const handleFocusWindow = useCallback((id: string) => {
    setFocusedWindow(id)
  }, [])

  const resetLayout = useCallback(() => {
    const grid = createSpatialGrid(windows.length, {
      startX: 80,
      startY: 80,
      spacingX: 400,
      spacingY: 360,
      columns: 2,
      depthVariance: 50,
    })
    setWindows((prev) =>
      prev.map((w, i) => ({
        ...w,
        position: grid[i] || w.position,
      }))
    )
  }, [windows.length])

  const renderWindowContent = (window: SpatialWindowConfig) => {
    switch (window.type) {
      case 'convoy':
        return (
          <div className="w-80">
            <ConvoyAggregateGlance convoys={convoys} />
            <div className="mt-4">
              <GlanceableConvoyStatus
                convoys={convoys.filter((c) => c.status === 'running')}
                onConvoySelect={(id) => console.log('Selected convoy:', id)}
              />
            </div>
          </div>
        )

      case 'tmux':
        return (
          <div className="w-96 h-80">
            <SpatialTmuxPanel
              sessions={tmuxSessions}
              selectedSession={selectedTmuxSession}
              selectedWindow={selectedTmuxWindow}
              onSessionSelect={setSelectedTmuxSession}
              onWindowSelect={(_, windowId) => setSelectedTmuxWindow(windowId)}
            />
          </div>
        )

      case 'activity':
        return (
          <div className="w-72 space-y-2">
            {[
              { time: '2m ago', event: 'Convoy phase completed', type: 'success' },
              { time: '5m ago', event: 'Polecat slit committed', type: 'info' },
              { time: '12m ago', event: 'MR ga-s3p submitted', type: 'info' },
              { time: '18m ago', event: 'Build succeeded', type: 'success' },
              { time: '25m ago', event: 'Voice test passed', type: 'success' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    item.type === 'success' ? 'bg-green-400' : 'bg-cyan-400'
                  }`}
                />
                <div className="flex-1">
                  <p className="text-white text-sm">{item.event}</p>
                  <p className="text-slate-500 text-xs">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        )

      case 'cost':
        return (
          <div className="w-64">
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-white">$47.23</div>
              <div className="text-slate-400 text-sm">Today&apos;s spend</div>
            </div>
            <div className="space-y-2">
              <CostBar label="Claude API" value={28.50} max={50} color="cyan" />
              <CostBar label="Compute" value={12.00} max={50} color="purple" />
              <CostBar label="Storage" value={4.73} max={50} color="orange" />
              <CostBar label="Other" value={2.00} max={50} color="slate" />
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/50">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Daily limit</span>
                <span className="text-green-400">$50.00</span>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-6 py-4 bg-slate-900/50 backdrop-blur-lg border-b border-slate-700/30">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
            ← Dashboard
          </a>
          <div className="flex items-center gap-2">
            <span className="text-orange-500 text-xl font-black">GT</span>
            <span className="text-white font-semibold">Spatial</span>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
              VisionOS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Perspective slider */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50">
            <span className="text-slate-500 text-xs">Depth</span>
            <input
              type="range"
              min="600"
              max="2000"
              value={perspective}
              onChange={(e) => setPerspective(parseInt(e.target.value))}
              className="w-20 accent-cyan-500"
            />
          </div>

          {/* Reset button */}
          <button
            onClick={resetLayout}
            className="px-3 py-1.5 rounded-full bg-slate-800/50 text-slate-400 hover:text-white text-sm transition-colors"
          >
            Reset
          </button>

          {/* Voice toggle */}
          <button
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={`
              p-2.5 rounded-full transition-all
              ${isVoiceActive
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                : 'bg-slate-800/50 text-slate-400 hover:text-white'
              }
            `}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Glanceable status bar */}
      <div className="relative z-40 flex items-center justify-center gap-6 py-3 bg-slate-800/30 backdrop-blur">
        <GlanceableConvoyStatus
          convoys={convoys}
          onConvoySelect={(id) => console.log('Focus convoy:', id)}
          compact
        />
      </div>

      {/* 3D spatial canvas */}
      <main
        className="flex-1 relative overflow-hidden"
        style={{
          perspective: `${perspective}px`,
          perspectiveOrigin: '50% 40%',
        }}
      >
        <div
          className="absolute inset-0 p-8"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {windows.map((window) => (
            <SpatialWindow
              key={window.id}
              id={window.id}
              title={window.title}
              position={window.position}
              onPositionChange={handlePositionChange}
              onClose={handleCloseWindow}
              onFocus={handleFocusWindow}
              focused={focusedWindow === window.id}
              accentColor={window.accentColor}
              minimized={window.minimized}
            >
              {renderWindowContent(window)}
            </SpatialWindow>
          ))}
        </div>
      </main>

      {/* Voice modal overlay */}
      {isVoiceActive && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-md h-[500px] rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
            <VoiceOnlyMode
              onCommand={(cmd) => {
                console.log('Voice command:', cmd)
                // Could close voice mode after command
              }}
            />
          </div>
          <button
            onClick={() => setIsVoiceActive(false)}
            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white"
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  )
}

function CostBar({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color: string
}) {
  const percentage = (value / max) * 100
  const colors: Record<string, string> = {
    cyan: 'bg-cyan-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    slate: 'bg-slate-500',
  }

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">${value.toFixed(2)}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color]} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
