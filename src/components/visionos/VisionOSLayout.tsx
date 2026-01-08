import { useState, useCallback, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Mic,
  MicOff,
  Home,
  Layers,
  RotateCcw,
  Maximize,
  Volume2,
} from 'lucide-react'
import SpatialWindow, { SpatialPosition, createSpatialGrid } from './SpatialWindow'

interface VisionOSLayoutProps {
  children?: ReactNode
}

interface WindowConfig {
  id: string
  title: string
  content: ReactNode
  position: SpatialPosition
  accentColor?: string
}

export default function VisionOSLayout({ children }: VisionOSLayoutProps) {
  const [windows, setWindows] = useState<WindowConfig[]>([])
  const [focusedWindow, setFocusedWindow] = useState<string | null>(null)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [perspective, setPerspective] = useState(1200)

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
    setFocusedWindow((prev) => (prev === id ? null : prev))
  }, [])

  const handleFocusWindow = useCallback((id: string) => {
    setFocusedWindow(id)
  }, [])

  const resetLayout = useCallback(() => {
    const positions = createSpatialGrid(windows.length)
    setWindows((prev) =>
      prev.map((w, i) => ({
        ...w,
        position: positions[i] || w.position,
      }))
    )
  }, [windows.length])

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />

        {/* Grid pattern */}
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

      {/* Spatial control bar */}
      <header className="relative z-50 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">
            <Home className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-orange-500 text-xl font-black">GT</span>
            <span className="text-white font-semibold">Spatial</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Perspective control */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 backdrop-blur">
            <Layers className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="600"
              max="2000"
              value={perspective}
              onChange={(e) => setPerspective(parseInt(e.target.value))}
              className="w-24 accent-cyan-500"
            />
          </div>

          {/* Reset layout */}
          <button
            onClick={resetLayout}
            className="p-2 rounded-full bg-slate-800/50 backdrop-blur text-slate-400 hover:text-white transition-colors"
            title="Reset layout"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Voice control */}
          <button
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={`
              p-3 rounded-full transition-all
              ${isVoiceActive
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50 animate-pulse'
                : 'bg-slate-800/50 backdrop-blur text-slate-400 hover:text-white'
              }
            `}
          >
            {isVoiceActive ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* 3D spatial canvas */}
      <main
        className="flex-1 relative"
        style={{
          perspective: `${perspective}px`,
          perspectiveOrigin: '50% 50%',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Render spatial windows */}
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
            >
              {window.content}
            </SpatialWindow>
          ))}

          {/* Default content passed as children */}
          {children}
        </div>
      </main>

      {/* Voice feedback indicator */}
      {isVoiceActive && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/30">
            <Volume2 className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-cyan-400">Listening...</span>
          </div>
        </div>
      )}

      {/* Window management context */}
      <VisionOSContext.Provider
        value={{
          windows,
          setWindows,
          focusedWindow,
          setFocusedWindow,
          addWindow: (config) => {
            const id = `window-${Date.now()}`
            const position: SpatialPosition = {
              x: 100 + Math.random() * 200,
              y: 100 + Math.random() * 100,
              z: (Math.random() - 0.5) * 100,
            }
            setWindows((prev) => [
              ...prev,
              { ...config, id, position: config.position || position },
            ])
            setFocusedWindow(id)
            return id
          },
          removeWindow: handleCloseWindow,
        }}
      >
        {/* Context accessible content would go here */}
      </VisionOSContext.Provider>
    </div>
  )
}

// Context for managing spatial windows from child components
import { createContext, useContext } from 'react'

interface VisionOSContextValue {
  windows: WindowConfig[]
  setWindows: React.Dispatch<React.SetStateAction<WindowConfig[]>>
  focusedWindow: string | null
  setFocusedWindow: React.Dispatch<React.SetStateAction<string | null>>
  addWindow: (config: Omit<WindowConfig, 'id'> & { id?: string }) => string
  removeWindow: (id: string) => void
}

const VisionOSContext = createContext<VisionOSContextValue | null>(null)

export function useVisionOS() {
  const context = useContext(VisionOSContext)
  if (!context) {
    throw new Error('useVisionOS must be used within VisionOSLayout')
  }
  return context
}
