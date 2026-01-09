import { useState } from 'react';
import { useSelfTestStatus, useTestCases, useSelfTest, TestResult } from '../hooks/useSelfTest';

export function SelfTestPanel() {
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const { data: status } = useSelfTestStatus();
  const { data: testCases } = useTestCases();
  const { start, stop, isStarting, isStopping, error } = useSelfTest();

  const isRunning = status?.status === 'running';
  const passRate = status && status.total_tests > 0
    ? Math.round((status.passed_tests / status.total_tests) * 100)
    : 0;

  const toggleTest = (id: string) => {
    setSelectedTests(prev =>
      prev.includes(id)
        ? prev.filter(t => t !== id)
        : [...prev, id]
    );
  };

  const handleStart = () => {
    const testsToRun = selectedTests.length > 0 ? selectedTests : undefined;
    start(testsToRun);
  };

  return (
    <div className="self-test-panel">
      <div className="panel-header">
        <h3>Voice Self-Test Mode</h3>
        <div className="status-indicator">
          {isRunning && <span className="recording-dot" />}
          {status?.status === 'completed' && (
            <span className={`pass-rate ${passRate >= 80 ? 'good' : passRate >= 50 ? 'warn' : 'bad'}`}>
              {passRate}% Pass
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">{String(error)}</div>
      )}

      {/* Test Selection */}
      {!isRunning && status?.status !== 'running' && (
        <div className="test-selection">
          <h4>Test Cases</h4>
          <div className="test-list">
            {testCases?.map(test => (
              <label key={test.id} className="test-item">
                <input
                  type="checkbox"
                  checked={selectedTests.includes(test.id)}
                  onChange={() => toggleTest(test.id)}
                />
                <div className="test-info">
                  <span className="test-command">"{test.command}"</span>
                  <span className="test-action">{test.expected_action}</span>
                </div>
              </label>
            ))}
          </div>
          <button
            className="btn btn-primary start-btn"
            onClick={handleStart}
            disabled={isStarting}
          >
            {isStarting ? 'Starting...' : `Run ${selectedTests.length > 0 ? selectedTests.length : 'All'} Tests`}
          </button>
        </div>
      )}

      {/* Running State */}
      {isRunning && (
        <div className="running-state">
          <div className="progress-header">
            <span>Running tests...</span>
            <span>{status.passed_tests + status.failed_tests}/{status.total_tests}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((status.passed_tests + status.failed_tests) / status.total_tests) * 100}%`
              }}
            />
          </div>
          {status.current_test && (
            <div className="current-test">
              Testing: {status.current_test}
            </div>
          )}
          <button
            className="btn btn-danger stop-btn"
            onClick={() => stop()}
            disabled={isStopping}
          >
            Stop Tests
          </button>
        </div>
      )}

      {/* Results */}
      {status?.results && status.results.length > 0 && (
        <div className="test-results">
          <h4>Results ({status.passed_tests}/{status.total_tests} passed)</h4>
          <div className="results-list">
            {status.results.map((result: TestResult) => (
              <div
                key={result.test_id}
                className={`result-item ${result.passed ? 'passed' : 'failed'}`}
              >
                <div className="result-header">
                  <span className="result-icon">{result.passed ? '✓' : '✗'}</span>
                  <span className="result-command">"{result.command}"</span>
                  <span className="result-duration">{result.duration_ms}ms</span>
                </div>
                <div className="result-details">
                  <div className="verifier-output">{result.verifier_output}</div>
                </div>
              </div>
            ))}
          </div>
          {status.status === 'completed' && (
            <div className="summary">
              <span>Duration: {(status.duration_ms / 1000).toFixed(1)}s</span>
              <span className={passRate >= 80 ? 'pass' : 'fail'}>
                {status.passed_tests} passed, {status.failed_tests} failed
              </span>
            </div>
          )}
        </div>
      )}

      <style>{`
        .self-test-panel {
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
          color: var(--accent-amber);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .recording-dot {
          width: 10px;
          height: 10px;
          background: var(--color-error);
          border-radius: 50%;
          animation: pulse 1s ease infinite;
          box-shadow: 0 0 10px var(--color-error);
        }

        .pass-rate {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px var(--space-2);
          border-radius: var(--radius-sm);
        }

        .pass-rate.good { background: var(--color-success); color: #000; }
        .pass-rate.warn { background: var(--color-warning); color: #000; }
        .pass-rate.bad { background: var(--color-error); color: #fff; }

        .error-message {
          padding: var(--space-2) var(--space-4);
          background: var(--color-error);
          color: white;
          font-size: 0.75rem;
        }

        .test-selection {
          padding: var(--space-4);
        }

        .test-selection h4 {
          margin: 0 0 var(--space-3) 0;
          color: var(--app-text);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .test-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
        }

        .test-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-2);
          padding: var(--space-2);
          background: var(--app-surface-30);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .test-item:hover {
          background: var(--app-surface-50);
          border-color: var(--accent-amber);
        }

        .test-item input {
          margin-top: 2px;
          accent-color: var(--accent-amber);
        }

        .test-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .test-command {
          color: var(--app-text);
          font-size: 0.8125rem;
        }

        .test-action {
          color: var(--app-text-muted);
          font-size: 0.6875rem;
        }

        .start-btn {
          width: 100%;
          padding: var(--space-2);
          background: var(--accent-teal);
          color: #000;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .start-btn:hover:not(:disabled) {
          box-shadow: var(--shadow-glow-success);
        }

        .start-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .running-state {
          padding: var(--space-4);
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          color: var(--app-text);
          font-size: 0.8125rem;
          margin-bottom: var(--space-2);
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: var(--app-surface-30);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--accent-teal);
          border-radius: var(--radius-full);
          transition: width var(--transition-slow);
        }

        .current-test {
          margin-top: var(--space-2);
          color: var(--app-text-muted);
          font-size: 0.75rem;
        }

        .stop-btn {
          width: 100%;
          margin-top: var(--space-3);
          padding: var(--space-2);
          background: var(--color-error);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .stop-btn:hover {
          box-shadow: var(--shadow-glow-accent);
        }

        .test-results {
          padding: var(--space-4);
          border-top: 1px solid var(--glass-border);
        }

        .test-results h4 {
          margin: 0 0 var(--space-3) 0;
          color: var(--app-text);
          font-size: 0.75rem;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          max-height: 300px;
          overflow-y: auto;
        }

        .result-item {
          padding: var(--space-2);
          border-radius: var(--radius-md);
          border-left: 3px solid;
        }

        .result-item.passed {
          background: var(--color-success-muted);
          border-color: var(--color-success);
        }

        .result-item.failed {
          background: var(--color-error-muted);
          border-color: var(--color-error);
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .result-icon {
          font-size: 0.875rem;
        }

        .result-item.passed .result-icon { color: var(--color-success); }
        .result-item.failed .result-icon { color: var(--color-error); }

        .result-command {
          flex: 1;
          color: var(--app-text);
          font-size: 0.75rem;
        }

        .result-duration {
          color: var(--app-text-muted);
          font-size: 0.625rem;
        }

        .result-details {
          margin-top: var(--space-1);
          padding-left: 22px;
        }

        .verifier-output {
          color: var(--app-text-subtle);
          font-size: 0.6875rem;
          font-style: italic;
        }

        .summary {
          display: flex;
          justify-content: space-between;
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--glass-border);
          font-size: 0.75rem;
          color: var(--app-text-muted);
        }

        .summary .pass { color: var(--color-success); }
        .summary .fail { color: var(--color-error); }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
