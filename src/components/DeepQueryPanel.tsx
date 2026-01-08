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
          background: #1a1a2e;
          border-radius: 8px;
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #16213e;
          border-bottom: 1px solid #0f3460;
        }

        .panel-header h3 {
          margin: 0;
          color: #4ecca3;
          font-size: 14px;
          font-weight: 600;
        }

        .status-badge .status {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .status.ready {
          background: rgba(78, 204, 163, 0.2);
          color: #4ecca3;
        }

        .status.fallback {
          background: rgba(249, 200, 70, 0.2);
          color: #f9c846;
        }

        .query-error {
          padding: 8px 16px;
          background: #e94560;
          color: white;
          font-size: 12px;
        }

        .query-history {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #888;
          text-align: center;
        }

        .empty-state p {
          margin: 0 0 16px 0;
          font-size: 14px;
        }

        .example-queries {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .example-btn {
          padding: 6px 12px;
          background: #0f3460;
          border: 1px solid #1a4480;
          border-radius: 16px;
          color: #aaa;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .example-btn:hover {
          background: #1a4480;
          color: #fff;
          border-color: #4ecca3;
        }

        .query-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .query-bubble {
          padding: 10px 14px;
          border-radius: 12px;
          max-width: 85%;
        }

        .query-bubble.user {
          align-self: flex-end;
          background: #0f3460;
          color: #eee;
        }

        .query-bubble.assistant {
          align-self: flex-start;
          background: #16213e;
          border: 1px solid #0f3460;
          color: #eee;
        }

        .query-bubble.loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .query-text {
          font-size: 13px;
        }

        .answer-text {
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .query-meta {
          display: flex;
          gap: 8px;
          margin-top: 8px;
          font-size: 10px;
          color: #888;
        }

        .context-badge {
          background: rgba(78, 204, 163, 0.1);
          color: #4ecca3;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .loading-dots {
          display: flex;
          gap: 4px;
        }

        .loading-dots span {
          width: 6px;
          height: 6px;
          background: #4ecca3;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
        .loading-dots span:nth-child(3) { animation-delay: 0; }

        .loading-text {
          font-size: 12px;
          color: #888;
        }

        .query-form {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          background: #16213e;
          border-top: 1px solid #0f3460;
        }

        .query-form input {
          flex: 1;
          padding: 10px 14px;
          background: #0f3460;
          border: 1px solid #1a4480;
          border-radius: 6px;
          color: white;
          font-size: 13px;
        }

        .query-form input:focus {
          outline: none;
          border-color: #4ecca3;
        }

        .query-form input::placeholder {
          color: #666;
        }

        .query-form button {
          padding: 10px 20px;
          background: #4ecca3;
          border: none;
          border-radius: 6px;
          color: #000;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .query-form button:hover:not(:disabled) {
          background: #3db892;
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
