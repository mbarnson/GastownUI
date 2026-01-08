import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { AttachAddon } from '@xterm/addon-attach';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface XtermTerminalProps {
  sessionName: string;
  ttydPort?: number;
  ttydHost?: string;
  onClose?: () => void;
  onError?: (error: string) => void;
}

export function XtermTerminal({
  sessionName,
  ttydPort = 7681,
  ttydHost = 'localhost',
  onClose,
  onError,
}: XtermTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", "Menlo", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: '#1a1a2e',
        foreground: '#eee',
        cursor: '#f9c846',
        cursorAccent: '#1a1a2e',
        selectionBackground: '#4ecca3',
        black: '#0f3460',
        red: '#e94560',
        green: '#4ecca3',
        yellow: '#f9c846',
        blue: '#0077b6',
        magenta: '#9d4edd',
        cyan: '#00b4d8',
        white: '#eee',
        brightBlack: '#16213e',
        brightRed: '#ff6b6b',
        brightGreen: '#69f0ae',
        brightYellow: '#fff176',
        brightBlue: '#42a5f5',
        brightMagenta: '#ba68c8',
        brightCyan: '#4dd0e1',
        brightWhite: '#fff',
      },
    });

    // Create fit addon
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    fitAddon.current = fit;

    // Open terminal in container
    terminal.open(terminalRef.current);
    fit.fit();

    terminalInstance.current = terminal;

    // Connect to ttyd WebSocket
    // ttyd uses ws://host:port/ws for the terminal connection
    const wsUrl = `ws://${ttydHost}:${ttydPort}/ws`;

    terminal.writeln(`\x1b[33mConnecting to ${sessionName}...\x1b[0m`);
    terminal.writeln(`\x1b[90mttyd: ${wsUrl}\x1b[0m`);
    terminal.writeln('');

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        terminal.writeln('\x1b[32mConnected!\x1b[0m\n');

        // Attach WebSocket to terminal
        const attachAddon = new AttachAddon(ws);
        terminal.loadAddon(attachAddon);

        // Focus terminal
        terminal.focus();
      };

      ws.onclose = (event) => {
        setStatus('disconnected');
        terminal.writeln('\n\x1b[33mConnection closed.\x1b[0m');
        if (event.code !== 1000) {
          terminal.writeln(`\x1b[90mCode: ${event.code}, Reason: ${event.reason || 'Unknown'}\x1b[0m`);
        }
      };

      ws.onerror = () => {
        setStatus('error');
        const msg = `Failed to connect to ttyd at ${wsUrl}`;
        setErrorMessage(msg);
        terminal.writeln(`\n\x1b[31mError: ${msg}\x1b[0m`);
        terminal.writeln('\n\x1b[90mMake sure ttyd is running:\x1b[0m');
        terminal.writeln(`\x1b[36m  ttyd --writable --port ${ttydPort} tmux attach-session -t ${sessionName}\x1b[0m`);
        onError?.(msg);
      };
    } catch (err) {
      const msg = `WebSocket error: ${err}`;
      setStatus('error');
      setErrorMessage(msg);
      terminal.writeln(`\x1b[31m${msg}\x1b[0m`);
      onError?.(msg);
    }

    // Handle window resize
    const handleResize = () => {
      fit.fit();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      wsRef.current?.close();
      terminal.dispose();
    };
  }, [sessionName, ttydPort, ttydHost, onError]);

  // Resize terminal when container size changes
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      fitAddon.current?.fit();
    });

    if (terminalRef.current) {
      observer.observe(terminalRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="xterm-terminal-container">
      <div className="terminal-header">
        <div className="terminal-status">
          <span className={`status-dot ${status}`} />
          <span className="session-name">{sessionName}</span>
          <span className="status-text">{status}</span>
        </div>
        {onClose && (
          <button className="close-btn" onClick={onClose} title="Close terminal">
            ×
          </button>
        )}
      </div>
      <div ref={terminalRef} className="terminal-content" />
      {errorMessage && (
        <div className="terminal-error">
          <p>{errorMessage}</p>
          <p className="hint">
            Start ttyd with: <code>ttyd --writable --port {ttydPort} tmux attach-session -t {sessionName}</code>
          </p>
        </div>
      )}
      <style>{`
        .xterm-terminal-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1a1a2e;
          border-radius: 8px;
          overflow: hidden;
        }

        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #16213e;
          border-bottom: 1px solid #0f3460;
        }

        .terminal-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.connecting {
          background: #f9c846;
          animation: pulse 1s infinite;
        }

        .status-dot.connected {
          background: #4ecca3;
        }

        .status-dot.disconnected {
          background: #888;
        }

        .status-dot.error {
          background: #e94560;
        }

        .session-name {
          color: #fff;
          font-weight: 600;
          font-size: 13px;
        }

        .status-text {
          color: #888;
          font-size: 11px;
        }

        .close-btn {
          background: none;
          border: none;
          color: #888;
          font-size: 20px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }

        .close-btn:hover {
          color: #e94560;
        }

        .terminal-content {
          flex: 1;
          padding: 8px;
          overflow: hidden;
        }

        .terminal-content .xterm {
          height: 100%;
        }

        .terminal-error {
          padding: 12px;
          background: rgba(233, 69, 96, 0.1);
          border-top: 1px solid #e94560;
        }

        .terminal-error p {
          color: #e94560;
          font-size: 12px;
          margin: 0 0 8px 0;
        }

        .terminal-error .hint {
          color: #888;
        }

        .terminal-error code {
          background: #0f3460;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          color: #4ecca3;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
