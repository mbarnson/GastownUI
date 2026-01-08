import { useState, useEffect, useRef } from 'react';
import { useVoiceServer, useAudioRecorder, useVoiceInteraction } from '../hooks/useVoice';
import {
  parseActions,
  executeActions,
  extractNonActionText,
  hasActions,
  formatResultsForVoice,
} from '../voice/actions';

interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export function VoiceInterface() {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isHolding, setIsHolding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { status, isStarting, start, error: serverError } = useVoiceServer();
  const {
    isRecording,
    audioBase64,
    duration,
    error: recorderError,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();
  const {
    isProcessing,
    error: interactionError,
    sendVoice,
    transcribe,
  } = useVoiceInteraction();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Process recorded audio when recording stops
  useEffect(() => {
    if (!isRecording && audioBase64 && !isProcessing) {
      handleSendVoice(audioBase64);
    }
  }, [isRecording, audioBase64]);

  const handleSendVoice = async (audio: string) => {
    try {
      // Add user message placeholder
      const userMessage: VoiceMessage = {
        id: crypto.randomUUID(),
        type: 'user',
        text: '(listening...)',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // First transcribe the audio to get user's actual words
      let userText = '(voice input)';
      try {
        userText = await transcribe(audio);
      } catch {
        // Fallback to placeholder if transcription fails
      }

      const response = await sendVoice(audio, 'interleaved');

      // Check for ACTION: intents in model output
      let responseText = response.text;
      if (hasActions(response.text)) {
        // Parse and execute actions
        const actions = parseActions(response.text);
        const results = await executeActions(actions);

        // Extract non-action text for voice response
        const nonActionText = extractNonActionText(response.text);
        const actionFeedback = formatResultsForVoice(results);

        // Combine non-action text with action feedback
        responseText = [nonActionText, actionFeedback].filter(Boolean).join(' ');
      }

      // Update user message with actual transcription and add assistant response
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...userMessage, text: userText },
        {
          id: crypto.randomUUID(),
          type: 'assistant',
          text: responseText,
          timestamp: new Date(),
        },
      ]);

      clearRecording();
    } catch {
      // Error is handled by the hook
      clearRecording();
    }
  };

  // Keyboard handler for spacebar push-to-talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && status?.ready && !isHolding) {
        e.preventDefault();
        setIsHolding(true);
        startRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isHolding) {
        e.preventDefault();
        setIsHolding(false);
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status?.ready, isHolding, startRecording, stopRecording]);

  // Mouse/touch handlers for the record button
  const handleRecordStart = () => {
    if (status?.ready) {
      setIsHolding(true);
      startRecording();
    }
  };

  const handleRecordEnd = () => {
    if (isHolding) {
      setIsHolding(false);
      stopRecording();
    }
  };

  const error = serverError || recorderError || interactionError;

  return (
    <div className="voice-interface">
      <div className="voice-header">
        <h3>Voice Assistant</h3>
        <div className="voice-status">
          {!status?.running ? (
            <button
              className="btn btn-primary"
              onClick={() => start(undefined)}
              disabled={isStarting}
            >
              {isStarting ? 'Starting...' : 'Start Voice'}
            </button>
          ) : !status.ready ? (
            <span className="status loading">Loading model...</span>
          ) : (
            <span className="status ready">Ready</span>
          )}
        </div>
      </div>

      {error && (
        <div className="voice-error">
          {String(error)}
        </div>
      )}

      <div className="voice-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.type}`}
          >
            <div className="message-content">{msg.text}</div>
            <div className="message-time">
              {msg.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="message assistant processing">
            <div className="message-content">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="voice-controls">
        <button
          className={`record-button ${isRecording ? 'recording' : ''} ${
            !status?.ready ? 'disabled' : ''
          }`}
          onMouseDown={handleRecordStart}
          onMouseUp={handleRecordEnd}
          onMouseLeave={handleRecordEnd}
          onTouchStart={handleRecordStart}
          onTouchEnd={handleRecordEnd}
          disabled={!status?.ready || isProcessing}
        >
          <div className="mic-icon">
            {isRecording ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.998.998 0 00-.98-.85c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
              </svg>
            )}
          </div>
          {isRecording && (
            <div className="recording-duration">{duration.toFixed(1)}s</div>
          )}
        </button>

        <div className="voice-hint">
          {status?.ready
            ? isRecording
              ? 'Release to send'
              : 'Hold Space or click to talk'
            : 'Start voice to begin'}
        </div>
      </div>

      <style>{`
        .voice-interface {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #1a1a2e;
          border-radius: 8px;
          overflow: hidden;
        }

        .voice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #16213e;
          border-bottom: 1px solid #0f3460;
        }

        .voice-header h3 {
          margin: 0;
          color: #e94560;
          font-size: 14px;
          font-weight: 600;
        }

        .voice-status .status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .voice-status .status.ready {
          background: #0f3460;
          color: #4ecca3;
        }

        .voice-status .status.loading {
          background: #0f3460;
          color: #f9c846;
        }

        .voice-error {
          padding: 8px 16px;
          background: #e94560;
          color: white;
          font-size: 12px;
        }

        .voice-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message {
          max-width: 80%;
          padding: 8px 12px;
          border-radius: 12px;
        }

        .message.user {
          align-self: flex-end;
          background: #0f3460;
          color: #eee;
        }

        .message.assistant {
          align-self: flex-start;
          background: #e94560;
          color: white;
        }

        .message.processing {
          opacity: 0.7;
        }

        .message-content {
          font-size: 14px;
          line-height: 1.4;
        }

        .message-time {
          font-size: 10px;
          opacity: 0.7;
          margin-top: 4px;
        }

        .voice-controls {
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          background: #16213e;
          border-top: 1px solid #0f3460;
        }

        .record-button {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 3px solid #e94560;
          background: #1a1a2e;
          color: #e94560;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          transition: all 0.2s ease;
        }

        .record-button:hover:not(.disabled) {
          background: #e94560;
          color: white;
        }

        .record-button.recording {
          background: #e94560;
          color: white;
          animation: pulse 1s ease infinite;
        }

        .record-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mic-icon svg {
          width: 24px;
          height: 24px;
        }

        .recording-duration {
          font-size: 10px;
          margin-top: 2px;
        }

        .voice-hint {
          font-size: 12px;
          color: #888;
        }

        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #e94560;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #d63850;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.4);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(233, 69, 96, 0);
          }
        }
      `}</style>
    </div>
  );
}
