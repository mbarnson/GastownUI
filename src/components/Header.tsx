import { Link } from '@tanstack/react-router'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Factory,
  Flame,
  Home,
  Menu,
  Network,
  SquareFunction,
  StickyNote,
  Terminal,
  X,
} from 'lucide-react'
import { useRigs } from '../hooks/useGastown'
import { focusRingClasses, skipLinkClasses } from '../lib/a11y'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [groupedExpanded, setGroupedExpanded] = useState<
    Record<string, boolean>
  >({})
  // Only fetch rigs on client side (Tauri APIs not available during SSR)
  const { data: rigs = [] } = useRigs()

  return (
    <>
      {/* Skip to main content link for keyboard users */}
      <a href="#main-content" className={skipLinkClasses}>
        Skip to main content
      </a>

      <header className="p-4 flex items-center bg-gray-800 text-white shadow-lg" role="banner">
        <button
          onClick={() => setIsOpen(true)}
          className={`p-2 hover:bg-gray-700 rounded-lg transition-colors ${focusRingClasses}`}
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
          aria-controls="main-navigation"
        >
          <Menu size={24} aria-hidden="true" />
        </button>
        <h1 className="ml-4 text-xl font-semibold">
          <Link to="/" className={focusRingClasses}>
            <img
              src="/tanstack-word-logo-white.svg"
              alt="GastownUI - Home"
              className="h-10"
            />
          </Link>
        </h1>
      </header>

      <aside
        id="main-navigation"
        aria-label="Main navigation"
        aria-hidden={!isOpen}
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className={`p-2 hover:bg-gray-800 rounded-lg transition-colors ${focusRingClasses}`}
            aria-label="Close navigation menu"
          >
            <X size={24} aria-hidden="true" />
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
            to="/tmux"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Terminal size={20} />
            <span className="font-medium">Tmux Sessions</span>
          </Link>

          {/* Gas Town Section */}
          <div className="mt-4 mb-2 px-3">
            <div className="flex items-center gap-2 text-orange-400 text-sm font-semibold uppercase tracking-wider">
              <Flame size={14} />
              Gas Town
            </div>
          </div>

          <div className="flex flex-row justify-between">
            <div className="flex-1 flex items-center gap-3 p-3 text-slate-200">
              <Factory size={20} className="text-amber-500" aria-hidden="true" />
              <span className="font-medium">Rigs</span>
            </div>
            <button
              className={`p-2 hover:bg-gray-800 rounded-lg transition-colors ${focusRingClasses}`}
              onClick={() =>
                setGroupedExpanded((prev) => ({
                  ...prev,
                  Rigs: !prev.Rigs,
                }))
              }
              aria-expanded={groupedExpanded.Rigs}
              aria-label={groupedExpanded.Rigs ? 'Collapse rigs section' : 'Expand rigs section'}
            >
              {groupedExpanded.Rigs ? (
                <ChevronDown size={20} aria-hidden="true" />
              ) : (
                <ChevronRight size={20} aria-hidden="true" />
              )}
            </button>
          </div>
          {groupedExpanded.Rigs && (
            <div className="flex flex-col ml-4" role="list" aria-label="Available rigs">
              {rigs.length === 0 ? (
                <div className="p-3 text-slate-400 text-sm">No rigs found</div>
              ) : (
                rigs.map((rig) => (
                  <Link
                    key={rig}
                    to="/rig/$rigId"
                    params={{ rigId: rig }}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-1"
                    activeProps={{
                      className:
                        'flex items-center gap-3 p-3 rounded-lg bg-orange-600 hover:bg-orange-700 transition-colors mb-1',
                    }}
                  >
                    <Factory size={16} />
                    <span className="font-medium">{rig}</span>
                  </Link>
                ))
              )}
            </div>
          )}

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
              className={`p-2 hover:bg-gray-800 rounded-lg transition-colors ${focusRingClasses}`}
              onClick={() =>
                setGroupedExpanded((prev) => ({
                  ...prev,
                  StartSSRDemo: !prev.StartSSRDemo,
                }))
              }
              aria-expanded={groupedExpanded.StartSSRDemo}
              aria-label={groupedExpanded.StartSSRDemo ? 'Collapse SSR demos' : 'Expand SSR demos'}
            >
              {groupedExpanded.StartSSRDemo ? (
                <ChevronDown size={20} aria-hidden="true" />
              ) : (
                <ChevronRight size={20} aria-hidden="true" />
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
      </aside>
    </>
  )
}
