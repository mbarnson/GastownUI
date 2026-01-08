import { useState, useEffect } from 'react';
import { Terminal, X, Maximize2, ExternalLink } from 'lucide-react';
import { useTmuxSessions, TmuxSession } from '../hooks/useGastown';
import { XtermTerminal } from './XtermTerminal';

interface TmuxPanelProps {
  ttydPort?: number;
  ttydHost?: string;
}

// Check if we're running in Tauri (desktop) or browser-only mode
function isTauriMode(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export function TmuxPanel({ ttydPort = 7681, ttydHost = 'localhost' }: TmuxPanelProps) {
  const { data: sessions, isLoading, error } = useTmuxSessions();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ttydStatus, setTtydStatus] = useState<'unknown' | 'running' | 'stopped'>('unknown');

  // Check ttyd availability on mount
  useEffect(() => {
    const checkTtyd = async () => {
      try {
        // Try to connect to ttyd's HTTP endpoint
        await fetch(`http://${ttydHost}:${ttydPort}/`, {
          method: 'HEAD',
          mode: 'no-cors',
        });
        // With no-cors, we can't see the status, but a successful fetch means it's reachable
        setTtydStatus('running');
      } catch {
        setTtydStatus('stopped');
      }
    };

    checkTtyd();
    const interval = setInterval(checkTtyd, 10000);
    return () => clearInterval(interval);
  }, [ttydHost, ttydPort]);

  const handleSessionClick = (session: TmuxSession) => {
    if (isTauriMode()) {
      // In Tauri mode, we could open native terminal or still use xterm
      // For now, use xterm for consistency
      setSelectedSession(session.name);
    } else {
      // Browser mode - use xterm.js + ttyd
      if (ttydStatus === 'stopped') {
        setTerminalError(
          `ttyd is not running. Start it with:\nttyd --writable --port ${ttydPort} tmux attach-session -t ${session.name}`
        );
      } else {
        setSelectedSession(session.name);
      }
    }
  };

  const handleCloseTerminal = () => {
    setSelectedSession(null);
    setTerminalError(null);
    setIsFullscreen(false);
  };

  // Show terminal view when a session is selected
  if (selectedSession) {
    return (
      <div className={`tmux-panel ${isFullscreen ? 'fullscreen' : ''}`}>
        <XtermTerminal
          sessionName={selectedSession}
          ttydPort={ttydPort}
          ttydHost={ttydHost}
          onClose={handleCloseTerminal}
          onError={setTerminalError}
        />
        <div className="terminal-controls">
          <button
            className="control-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            className="control-btn close"
            onClick={handleCloseTerminal}
            title="Close terminal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <style>{`
          .tmux-panel {
            position: relative;
            height: 100%;
          }

          .tmux-panel.fullscreen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1000;
            background: #1a1a2e;
          }

          .terminal-controls {
            position: absolute;
            top: 8px;
            right: 48px;
            display: flex;
            gap: 4px;
            z-index: 10;
          }

          .control-btn {
            padding: 4px 8px;
            background: rgba(15, 52, 96, 0.8);
            border: none;
            border-radius: 4px;
            color: #888;
            cursor: pointer;
            transition: all 0.2s;
          }

          .control-btn:hover {
            background: #0f3460;
            color: #fff;
          }

          .control-btn.close:hover {
            color: #e94560;
          }
        `}</style>
      </div>
    );
  }

  // Show session list
  return (
    <div className="tmux-panel-list">
      <div className="panel-header">
        <div className="header-left">
          <Terminal className="w-5 h-5 text-amber-400" />
          <h3>Tmux Sessions</h3>
        </div>
        <div className="ttyd-status">
          <span className={`status-dot ${ttydStatus}`} />
          <span className="status-label">
            {ttydStatus === 'running' ? 'ttyd ready' : ttydStatus === 'stopped' ? 'ttyd offline' : 'checking...'}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading sessions...</div>
      ) : error ? (
        <div className="error">
          <p>Failed to load sessions</p>
          <p className="hint">{String(error)}</p>
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="session-list">
          {sessions.map((session) => (
            <button
              key={session.name}
              className="session-item"
              onClick={() => handleSessionClick(session)}
            >
              <div className="session-info">
                <span className={`attached-dot ${session.attached ? 'active' : ''}`} />
                <span className="session-name">{session.name}</span>
              </div>
              <div className="session-meta">
                <span className="window-count">
                  {session.windows} window{session.windows !== 1 ? 's' : ''}
                </span>
                <ExternalLink className="w-4 h-4 open-icon" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>No active tmux sessions</p>
          <p className="hint">Create a session with: tmux new -s gastown</p>
        </div>
      )}

      {terminalError && (
        <div className="terminal-error">
          <button className="dismiss-btn" onClick={() => setTerminalError(null)}>×</button>
          <pre>{terminalError}</pre>
        </div>
      )}

      {!isTauriMode() && ttydStatus === 'stopped' && (
        <div className="ttyd-hint">
          <p><strong>Browser Mode:</strong> ttyd required for terminal access</p>
          <code>ttyd --writable --port {ttydPort} tmux attach-session -t SESSION</code>
        </div>
      )}

      <style>{`
        .tmux-panel-list {
          background: rgba(30, 41, 59, 0.5);
          border-radius: 12px;
          border: 1px solid rgb(51, 65, 85);
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid rgb(51, 65, 85);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .panel-header h3 {
          margin: 0;
          color: #fff;
          font-size: 16px;
          font-weight: 600;
        }

        .ttyd-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.running {
          background: #4ecca3;
        }

        .status-dot.stopped {
          background: #888;
        }

        .status-dot.unknown {
          background: #f9c846;
          animation: pulse 1s infinite;
        }

        .status-label {
          font-size: 11px;
          color: #888;
        }

        .loading, .error, .empty {
          padding: 24px;
          text-align: center;
          color: #888;
        }

        .error p:first-child {
          color: #e94560;
        }

        .hint {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .session-list {
          padding: 8px;
        }

        .session-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 12px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgb(51, 65, 85);
          border-radius: 8px;
          margin-bottom: 6px;
          cursor: pointer;
          transition: all 0.2s;
          color: inherit;
          text-align: left;
        }

        .session-item:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: #4ecca3;
        }

        .session-item:last-child {
          margin-bottom: 0;
        }

        .session-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .attached-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #666;
        }

        .attached-dot.active {
          background: #4ecca3;
        }

        .session-name {
          color: #fff;
          font-weight: 500;
          font-size: 14px;
        }

        .session-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .window-count {
          color: #888;
          font-size: 12px;
        }

        .open-icon {
          color: #666;
          transition: color 0.2s;
        }

        .session-item:hover .open-icon {
          color: #4ecca3;
        }

        .terminal-error {
          position: relative;
          margin: 8px;
          padding: 12px;
          background: rgba(233, 69, 96, 0.1);
          border: 1px solid #e94560;
          border-radius: 8px;
        }

        .terminal-error pre {
          color: #e94560;
          font-size: 11px;
          white-space: pre-wrap;
          margin: 0;
        }

        .dismiss-btn {
          position: absolute;
          top: 4px;
          right: 8px;
          background: none;
          border: none;
          color: #e94560;
          font-size: 18px;
          cursor: pointer;
        }

        .ttyd-hint {
          margin: 8px;
          padding: 12px;
          background: rgba(249, 200, 70, 0.1);
          border: 1px solid rgba(249, 200, 70, 0.3);
          border-radius: 8px;
        }

        .ttyd-hint p {
          color: #f9c846;
          font-size: 12px;
          margin: 0 0 8px 0;
        }

        .ttyd-hint code {
          display: block;
          padding: 8px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          font-size: 11px;
          color: #4ecca3;
          overflow-x: auto;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
