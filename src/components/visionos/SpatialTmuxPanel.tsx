import { useState } from 'react'
import {
  Terminal,
  Maximize2,
  LayoutGrid,
  Plus,
  ChevronRight,
  Circle,
} from 'lucide-react'

export interface TmuxPane {
  id: string
  title: string
  command?: string
  output: string[]
  active: boolean
}

export interface TmuxWindow {
  id: string
  name: string
  panes: TmuxPane[]
  active: boolean
}

export interface TmuxSession {
  id: string
  name: string
  windows: TmuxWindow[]
  attached: boolean
}

interface SpatialTmuxPanelProps {
  sessions: TmuxSession[]
  onSessionSelect?: (sessionId: string) => void
  onWindowSelect?: (sessionId: string, windowId: string) => void
  onPaneSelect?: (sessionId: string, windowId: string, paneId: string) => void
  onNewSession?: () => void
  selectedSession?: string
  selectedWindow?: string
}

export default function SpatialTmuxPanel({
  sessions,
  onSessionSelect,
  onWindowSelect,
  onPaneSelect,
  onNewSession,
  selectedSession,
  selectedWindow,
}: SpatialTmuxPanelProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(sessions.filter((s) => s.attached).map((s) => s.id))
  )

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  const currentSession = sessions.find((s) => s.id === selectedSession)
  const currentWindow = currentSession?.windows.find((w) => w.id === selectedWindow)

  return (
    <div className="h-full flex flex-col">
      {/* Session list */}
      <div className="flex-shrink-0 border-b border-slate-700/50">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-slate-400 text-xs uppercase tracking-wider">
            Sessions
          </span>
          {onNewSession && (
            <button
              onClick={onNewSession}
              className="p-1 text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-1 px-2 pb-2 max-h-48 overflow-y-auto">
          {sessions.map((session) => (
            <div key={session.id}>
              <button
                onClick={() => {
                  toggleSession(session.id)
                  onSessionSelect?.(session.id)
                }}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 rounded-lg
                  transition-colors text-left
                  ${selectedSession === session.id
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'hover:bg-slate-700/50 text-slate-300'
                  }
                `}
              >
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    expandedSessions.has(session.id) ? 'rotate-90' : ''
                  }`}
                />
                <Terminal className="w-4 h-4" />
                <span className="flex-1 truncate text-sm">{session.name}</span>
                {session.attached && (
                  <Circle className="w-2 h-2 fill-green-400 text-green-400" />
                )}
              </button>

              {/* Windows */}
              {expandedSessions.has(session.id) && (
                <div className="ml-6 mt-1 space-y-1">
                  {session.windows.map((window, idx) => (
                    <button
                      key={window.id}
                      onClick={() => onWindowSelect?.(session.id, window.id)}
                      className={`
                        w-full flex items-center gap-2 px-2 py-1 rounded
                        transition-colors text-left text-sm
                        ${selectedWindow === window.id
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }
                      `}
                    >
                      <LayoutGrid className="w-3 h-3" />
                      <span className="flex-1 truncate">
                        {idx}: {window.name}
                      </span>
                      {window.active && (
                        <span className="text-xs text-cyan-400">*</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Terminal preview */}
      <div className="flex-1 overflow-hidden">
        {currentWindow ? (
          <div className="h-full flex flex-col">
            {/* Window header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
              <span className="text-white text-sm font-medium">
                {currentSession?.name}:{currentWindow.name}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-xs">
                  {currentWindow.panes.length} pane
                  {currentWindow.panes.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Pane grid */}
            <div
              className="flex-1 grid gap-1 p-2"
              style={{
                gridTemplateColumns: `repeat(${Math.min(currentWindow.panes.length, 2)}, 1fr)`,
              }}
            >
              {currentWindow.panes.map((pane) => (
                <PanePreview
                  key={pane.id}
                  pane={pane}
                  onClick={() =>
                    onPaneSelect?.(currentSession!.id, currentWindow.id, pane.id)
                  }
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Terminal className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">Select a window</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PanePreview({
  pane,
  onClick,
}: {
  pane: TmuxPane
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative rounded-lg overflow-hidden
        bg-slate-950 border transition-all
        ${pane.active
          ? 'border-cyan-500/50 ring-1 ring-cyan-500/20'
          : 'border-slate-700/50 hover:border-slate-600'
        }
      `}
    >
      {/* Mini terminal output */}
      <div className="p-2 font-mono text-[8px] leading-tight text-slate-400 text-left">
        {pane.output.slice(-8).map((line, i) => (
          <div key={i} className="truncate">
            {line || '\u00A0'}
          </div>
        ))}
      </div>

      {/* Pane title overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-2">
        <div className="flex items-center gap-1">
          {pane.active && (
            <Circle className="w-2 h-2 fill-cyan-400 text-cyan-400" />
          )}
          <span className="text-xs text-slate-300 truncate">
            {pane.title || pane.command || 'bash'}
          </span>
        </div>
      </div>

      {/* Expand icon */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Maximize2 className="w-3 h-3 text-slate-500" />
      </div>
    </button>
  )
}

// Mock data for development
export const mockTmuxSessions: TmuxSession[] = [
  {
    id: 'gastownui',
    name: 'gastownui',
    attached: true,
    windows: [
      {
        id: 'win-0',
        name: 'dev',
        active: true,
        panes: [
          {
            id: 'pane-0',
            title: 'npm run dev',
            command: 'npm run dev',
            active: true,
            output: [
              '> dev',
              '> vite dev --port 3000',
              '',
              '  VITE v7.3.1  ready in 525 ms',
              '',
              '  ➜  Local:   http://localhost:3000/',
              '  ➜  Network: use --host to expose',
              '',
            ],
          },
        ],
      },
      {
        id: 'win-1',
        name: 'build',
        active: false,
        panes: [
          {
            id: 'pane-1',
            title: 'bash',
            active: true,
            output: [
              '~/gt/GastownUI/polecats/slit$ npm run build',
              '> build',
              '> vinxi build',
              '',
              'vite v7.3.1 building...',
              '✓ built in 1.63s',
              '',
              '~/gt/GastownUI/polecats/slit$ _',
            ],
          },
        ],
      },
      {
        id: 'win-2',
        name: 'git',
        active: false,
        panes: [
          {
            id: 'pane-2',
            title: 'git status',
            active: true,
            output: [
              'On branch polecat/slit-mk4ny3d5',
              'nothing to commit, working tree clean',
              '',
              '~/gt/GastownUI/polecats/slit$ _',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'mayor',
    name: 'mayor',
    attached: false,
    windows: [
      {
        id: 'win-m0',
        name: 'main',
        active: true,
        panes: [
          {
            id: 'pane-m0',
            title: 'bash',
            active: true,
            output: [
              '~/gt$ gt status',
              'Gas Town Status: ACTIVE',
              '',
              'Rigs: 1 active',
              '  GastownUI: 5 polecats',
              '',
              '~/gt$ _',
            ],
          },
        ],
      },
    ],
  },
]
