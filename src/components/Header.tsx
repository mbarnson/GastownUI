import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Activity,
  Brain,
  ChevronDown,
  ChevronRight,
  Factory,
  Glasses,
  Home,
  Layers,
  Menu,
  Terminal,
  TestTube2,
  Network,
  Smartphone,
  SquareFunction,
  StickyNote,
  Workflow,
  X,
} from 'lucide-react'
import CalmModeToggle from './a11y/CalmModeToggle'
import SimplifyModeToggle from './a11y/SimplifyModeToggle'
import { useConvoys, useTmuxSessions } from '../hooks/useGastown'
import { useSidebarMode } from '../contexts/SidebarModeContext'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [groupedExpanded, setGroupedExpanded] = useState<
    Record<string, boolean>
  >({})
  const { data: convoys } = useConvoys()
  const { data: sessions } = useTmuxSessions()
  const { sidebarMode, setSidebarMode } = useSidebarMode()

  return (
    <>
      <header className="relative w-full overflow-hidden border-b border-black/20 shadow-lg">
        <div className="absolute inset-0 bg-[url('/gastown-banner.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-4 min-h-[96px] sm:min-h-[112px] lg:min-h-[128px] flex flex-wrap items-center gap-4 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-black tracking-tight">
              <Link to="/" className="flex items-center">
                <span className="sr-only">Gas Town</span>
              </Link>
            </h1>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-4 text-sm text-white/90 text-right drop-shadow-[0_2px_6px_rgba(0,0,0,0.65)]">
            <span className="px-2 py-1 bg-black/35 text-white text-xs font-medium rounded">
              Active
            </span>
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
                  ? 'bg-white/20 text-white'
                  : 'hover:bg-white/10'
              }`}
              onClick={() =>
                setSidebarMode(
                  sidebarMode === 'deepQuery' ? 'voice' : 'deepQuery'
                )
              }
              title="Deep Query - AI Analysis"
            >
              <Brain className="w-4 h-4" />
              <span>Query</span>
            </button>
            <button
              className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
                sidebarMode === 'selfTest'
                  ? 'bg-white/20 text-white'
                  : 'hover:bg-white/10'
              }`}
              onClick={() =>
                setSidebarMode(
                  sidebarMode === 'selfTest' ? 'voice' : 'selfTest'
                )
              }
              title="Voice Self-Test"
            >
              <TestTube2 className="w-4 h-4" />
              <span>Self-Test</span>
            </button>
          </div>
        </div>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </Link>

          <Link
            to="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-orange-600 hover:bg-orange-700 transition-colors mb-2',
            }}
          >
            <Factory size={20} />
            <span className="font-medium">Gas Town Dashboard</span>
          </Link>

          <Link
            to="/design"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors mb-2',
            }}
          >
            <Workflow size={20} />
            <span className="font-medium">Design Mode</span>
          </Link>

          <Link
            to="/mobile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Smartphone size={20} />
            <span className="font-medium">Mobile Companion</span>
          </Link>

          <Link
            to="/visionos"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-violet-600 hover:bg-violet-700 transition-colors mb-2',
            }}
          >
            <Glasses size={20} />
            <span className="font-medium">VisionOS Spatial</span>
          </Link>

          <Link
            to="/rig/GastownUI"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-colors mb-2',
            }}
          >
            <Layers size={20} />
            <span className="font-medium">Rig View (GastownUI)</span>
          </Link>

          {/* Demo Links Start */}

          <Link
            to="/demo/start/server-funcs"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <SquareFunction size={20} />
            <span className="font-medium">Start - Server Functions</span>
          </Link>

          <Link
            to="/demo/start/api-request"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Network size={20} />
            <span className="font-medium">Start - API Request</span>
          </Link>

          <div className="flex flex-row justify-between">
            <Link
              to="/demo/start/ssr"
              onClick={() => setIsOpen(false)}
              className="flex-1 flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
              activeProps={{
                className:
                  'flex-1 flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
              }}
            >
              <StickyNote size={20} />
              <span className="font-medium">Start - SSR Demos</span>
            </Link>
            <button
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() =>
                setGroupedExpanded((prev) => ({
                  ...prev,
                  StartSSRDemo: !prev.StartSSRDemo,
                }))
              }
            >
              {groupedExpanded.StartSSRDemo ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>
          </div>
          {groupedExpanded.StartSSRDemo && (
            <div className="flex flex-col ml-4">
              <Link
                to="/demo/start/ssr/spa-mode"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
                activeProps={{
                  className:
                    'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
                }}
              >
                <StickyNote size={20} />
                <span className="font-medium">SPA Mode</span>
              </Link>

              <Link
                to="/demo/start/ssr/full-ssr"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
                activeProps={{
                  className:
                    'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
                }}
              >
                <StickyNote size={20} />
                <span className="font-medium">Full SSR</span>
              </Link>

              <Link
                to="/demo/start/ssr/data-only"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
                activeProps={{
                  className:
                    'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
                }}
              >
                <StickyNote size={20} />
                <span className="font-medium">Data Only</span>
              </Link>
            </div>
          )}

          {/* Demo Links End */}
        </nav>

        {/* Accessibility Settings */}
        <div className="p-4 border-t border-gray-700">
          <CalmModeToggle showLabel={true} />
        </div>
      </aside>
    </>
  )
}
