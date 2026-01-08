import { useState } from 'react';
import { useSelfTestStatus, useTestCases, useSelfTest, TestResult } from '../hooks/useSelfTest';

export function SelfTestPanel() {
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const { data: status, isLoading: statusLoading } = useSelfTestStatus();
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
          color: #f9c846;
          font-size: 14px;
          font-weight: 600;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .recording-dot {
          width: 10px;
          height: 10px;
          background: #e94560;
          border-radius: 50%;
          animation: pulse 1s ease infinite;
        }

        .pass-rate {
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .pass-rate.good { background: #4ecca3; color: #000; }
        .pass-rate.warn { background: #f9c846; color: #000; }
        .pass-rate.bad { background: #e94560; color: #fff; }

        .error-message {
          padding: 8px 16px;
          background: #e94560;
          color: white;
          font-size: 12px;
        }

        .test-selection {
          padding: 16px;
        }

        .test-selection h4 {
          margin: 0 0 12px 0;
          color: #eee;
          font-size: 12px;
          text-transform: uppercase;
        }

        .test-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .test-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px;
          background: #0f3460;
          border-radius: 4px;
          cursor: pointer;
        }

        .test-item:hover {
          background: #1a4480;
        }

        .test-item input {
          margin-top: 2px;
        }

        .test-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .test-command {
          color: #fff;
          font-size: 13px;
        }

        .test-action {
          color: #888;
          font-size: 11px;
        }

        .start-btn {
          width: 100%;
          padding: 10px;
          background: #4ecca3;
          color: #000;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
        }

        .start-btn:hover:not(:disabled) {
          background: #3db892;
        }

        .start-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .running-state {
          padding: 16px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          color: #eee;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #0f3460;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #4ecca3;
          transition: width 0.3s ease;
        }

        .current-test {
          margin-top: 8px;
          color: #888;
          font-size: 12px;
        }

        .stop-btn {
          width: 100%;
          margin-top: 12px;
          padding: 8px;
          background: #e94560;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .test-results {
          padding: 16px;
          border-top: 1px solid #0f3460;
        }

        .test-results h4 {
          margin: 0 0 12px 0;
          color: #eee;
          font-size: 12px;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .result-item {
          padding: 8px;
          border-radius: 4px;
          border-left: 3px solid;
        }

        .result-item.passed {
          background: rgba(78, 204, 163, 0.1);
          border-color: #4ecca3;
        }

        .result-item.failed {
          background: rgba(233, 69, 96, 0.1);
          border-color: #e94560;
        }

        .result-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .result-icon {
          font-size: 14px;
        }

        .result-item.passed .result-icon { color: #4ecca3; }
        .result-item.failed .result-icon { color: #e94560; }

        .result-command {
          flex: 1;
          color: #eee;
          font-size: 12px;
        }

        .result-duration {
          color: #888;
          font-size: 10px;
        }

        .result-details {
          margin-top: 4px;
          padding-left: 22px;
        }

        .verifier-output {
          color: #aaa;
          font-size: 11px;
          font-style: italic;
        }

        .summary {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #0f3460;
          font-size: 12px;
          color: #888;
        }

        .summary .pass { color: #4ecca3; }
        .summary .fail { color: #e94560; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
