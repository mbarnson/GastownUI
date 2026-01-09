import { useState, useRef, useEffect } from 'react';
import { useDeepQuery, useInstructStatus, DeepQueryResponse } from '../hooks/useDeepQuery';

interface QueryHistoryItem {
  id: string;
  query: string;
  response: DeepQueryResponse;
  timestamp: Date;
}

export function DeepQueryPanel() {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const historyEndRef = useRef<HTMLDivElement>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);

  const { data: status } = useInstructStatus();
  const { queryAsync, isLoading, error, reset } = useDeepQuery();

  useEffect(() => {
    const container = historyContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const currentQuery = query;
    setQuery('');
    reset();

    try {
      const response = await queryAsync(currentQuery);
      setHistory((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          query: currentQuery,
          response,
          timestamp: new Date(),
        },
      ]);
    } catch {
      // Error is handled by the hook
    }
  };

  const exampleQueries = [
    'Why is the convoy stuck?',
    'Which polecats have been idle longest?',
    'What work is ready to start?',
    "What's blocking the most issues?",
  ];

  return (
    <div className="deep-query-panel">
      <div className="panel-header">
        <h3>Deep Query</h3>
        <div className="status-badge">
          {status?.available || status?.llama_cli_available ? (
            <span className="status ready">Local AI Ready</span>
          ) : (
            <span className="status fallback">Using Voice Server</span>
          )}
        </div>
      </div>

      {error && (
        <div className="query-error">
          {String(error)}
        </div>
      )}

      <div className="query-history" ref={historyContainerRef}>
        {history.length === 0 && !isLoading && (
          <div className="empty-state">
            <p>Ask questions about Gas Town state</p>
            <div className="example-queries">
              {exampleQueries.map((q, i) => (
                <button
                  key={i}
                  className="example-btn"
                  onClick={() => setQuery(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((item) => (
          <div key={item.id} className="query-item">
            <div className="query-bubble user">
              <span className="query-text">{item.query}</span>
            </div>
            <div className="query-bubble assistant">
              <span className="answer-text">{item.response.answer}</span>
              <div className="query-meta">
                <span className="context-badge">
                  {item.response.context_used.length} sources
                </span>
                <span className="latency">{item.response.latency_ms}ms</span>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="query-item">
            <div className="query-bubble user">
              <span className="query-text">{query || 'Querying...'}</span>
            </div>
            <div className="query-bubble assistant loading">
              <div className="loading-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="loading-text">Analyzing Gas Town state...</span>
            </div>
          </div>
        )}

        <div ref={historyEndRef} />
      </div>

      <form className="query-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about Gas Town state..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !query.trim()}>
          {isLoading ? '...' : 'Ask'}
        </button>
      </form>

      <style>{`
        .deep-query-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur));
          -webkit-backdrop-filter: blur(var(--glass-blur));
          border: 1px solid var(--glass-border);
          border-radius: var(--panel-radius);
          box-shadow: var(--glass-shadow);
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3) var(--space-4);
          background: var(--glass-bg-strong);
          border-bottom: 1px solid var(--glass-border);
        }

        .panel-header h3 {
          margin: 0;
          color: var(--accent-teal);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .status-badge .status {
          font-size: 0.6875rem;
          padding: 3px var(--space-2);
          border-radius: var(--radius-sm);
        }

        .status.ready {
          background: var(--accent-teal-muted);
          color: var(--accent-teal);
        }

        .status.fallback {
          background: var(--accent-amber-muted);
          color: var(--accent-amber);
        }

        .query-error {
          padding: var(--space-2) var(--space-4);
          background: var(--color-error);
          color: white;
          font-size: 0.75rem;
        }

        .query-history {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--app-text-muted);
          text-align: center;
        }

        .empty-state p {
          margin: 0 0 var(--space-4) 0;
          font-size: 0.875rem;
        }

        .example-queries {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          justify-content: center;
        }

        .example-btn {
          padding: var(--space-1) var(--space-3);
          background: var(--app-surface-30);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-full);
          color: var(--app-text-muted);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .example-btn:hover {
          background: var(--app-surface-50);
          color: var(--app-text);
          border-color: var(--accent-teal);
          box-shadow: var(--shadow-glow-success);
        }

        .query-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .query-bubble {
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-lg);
          max-width: 85%;
        }

        .query-bubble.user {
          align-self: flex-end;
          background: var(--color-primary);
          color: white;
        }

        .query-bubble.assistant {
          align-self: flex-start;
          background: var(--glass-bg-strong);
          border: 1px solid var(--glass-border);
          color: var(--app-text);
        }

        .query-bubble.loading {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .query-text {
          font-size: 0.8125rem;
        }

        .answer-text {
          font-size: 0.8125rem;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .query-meta {
          display: flex;
          gap: var(--space-2);
          margin-top: var(--space-2);
          font-size: 0.625rem;
          color: var(--app-text-muted);
        }

        .context-badge {
          background: var(--accent-teal-muted);
          color: var(--accent-teal);
          padding: 2px var(--space-1);
          border-radius: var(--radius-sm);
        }

        .loading-dots {
          display: flex;
          gap: var(--space-1);
        }

        .loading-dots span {
          width: 6px;
          height: 6px;
          background: var(--accent-teal);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
        .loading-dots span:nth-child(3) { animation-delay: 0; }

        .loading-text {
          font-size: 0.75rem;
          color: var(--app-text-muted);
        }

        .query-form {
          display: flex;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--glass-bg-strong);
          border-top: 1px solid var(--glass-border);
        }

        .query-form input {
          flex: 1;
          padding: var(--space-2) var(--space-3);
          background: var(--app-surface-30);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          color: var(--app-text);
          font-size: 0.8125rem;
          transition: all var(--transition-fast);
        }

        .query-form input:focus {
          outline: none;
          border-color: var(--accent-teal);
          box-shadow: 0 0 0 3px var(--accent-teal-muted);
        }

        .query-form input::placeholder {
          color: var(--app-text-subtle);
        }

        .query-form button {
          padding: var(--space-2) var(--space-5);
          background: var(--accent-teal);
          border: none;
          border-radius: var(--radius-md);
          color: #000;
          font-weight: 600;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .query-form button:hover:not(:disabled) {
          box-shadow: var(--shadow-glow-success);
        }

        .query-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
