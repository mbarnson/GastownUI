import { useState, useEffect, useRef } from 'react';
import {
  useAutoStartVoice,
  useAudioRecorder,
  useVoiceInteraction,
} from '../hooks/useVoice';
import { useVoiceContext } from '../hooks/useVoiceContext';
import { useVoiceModelStatus } from '../hooks/useVoiceModel';
import { VoiceModelSetup } from './VoiceModelSetup';

type VoiceMode = 'ptt' | 'live';

interface VoiceMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface VoiceInterfaceProps {
  autoStart?: boolean;
  defaultMode?: VoiceMode;
}

class AudioStreamPlayer {
  private context: AudioContext | null = null;
  private nextStartTime = 0;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  enqueue(base64Chunk: string, sampleRate: number) {
    if (!base64Chunk) {
      return;
    }
    if (!this.context || this.context.sampleRate !== sampleRate) {
      this.reset(sampleRate);
    }
    if (!this.context) {
      return;
    }
    const samples = decodeAudioChunk(base64Chunk);
    if (samples.length === 0) {
      return;
    }
    const buffer = this.context.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    const startAt = Math.max(this.context.currentTime, this.nextStartTime);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;
  }

  reset(sampleRate: number) {
    this.stop();
    this.context = new AudioContext({ sampleRate });
    this.nextStartTime = this.context.currentTime;
  }

  stop() {
    if (!this.context) {
      return;
    }
    const context = this.context;
    const delay = Math.max(0, this.nextStartTime - context.currentTime);
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
    }
    this.closeTimer = setTimeout(() => {
      context.close();
    }, (delay + 0.05) * 1000);
    this.context = null;
    this.nextStartTime = 0;
  }
}

function decodeAudioChunk(base64Chunk: string): Float32Array {
  const binaryString = atob(base64Chunk);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Float32Array(bytes.buffer);
}

// Extracted styles constant for reuse in multiple return paths
const voiceInterfaceStyles = `
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
  .voice-title {
    display: flex;
    align-items: center;
    gap: 8px;
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
  .voice-status .status.loading {
    background: #0f3460;
    color: #f9c846;
  }
  .voice-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
`;

export function VoiceInterface({ autoStart = true, defaultMode = 'ptt' }: VoiceInterfaceProps) {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isHolding, setIsHolding] = useState(false);
  const [mode, setMode] = useState<VoiceMode>(defaultMode);
  const [showModelSetup, setShowModelSetup] = useState(false);
  const [modelSetupDismissed, setModelSetupDismissed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const audioStreamRef = useRef<AudioStreamPlayer | null>(null);

  // Check if voice model is installed
  const { data: modelStatus, isLoading: modelStatusLoading } = useVoiceModelStatus();
  const modelInstalled = modelStatus?.installed ?? false;

  // Auto-start voice server only if model is installed
  const {
    status,
    isStarting,
    loadingProgress,
    loadingMessage,
    error: serverError,
  } = useAutoStartVoice(autoStart && modelInstalled);

  // Gas Town context for voice model (refreshes every 2s)
  const {
    context,
    systemPrompt,
    isSignificantlyStale,
  } = useVoiceContext({ enabled: status?.ready });

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
    streamVoice,
  } = useVoiceInteraction();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      audioStreamRef.current?.stop();
    };
  }, []);

  // Process recorded audio when recording stops
  useEffect(() => {
    if (!isRecording && audioBase64 && !isProcessing) {
      handleSendVoice(audioBase64);
    }
  }, [isRecording, audioBase64, isProcessing]);

  const handleSendVoice = async (audio: string) => {
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const userMessage: VoiceMessage = {
      id: userId,
      type: 'user',
      text: '(listening...)',
      timestamp: new Date(),
    };
    const assistantMessage: VoiceMessage = {
      id: assistantId,
      type: 'assistant',
      text: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    audioStreamRef.current?.stop();
    audioStreamRef.current = new AudioStreamPlayer();
    let assistantText = '';

    try {
      await streamVoice(audio, {
        mode: 'interleaved',
        systemPrompt,
        onTextChunk: (chunk) => {
          assistantText += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, text: assistantText } : msg
            )
          );
        },
        onAudioChunk: (chunk, sampleRate) => {
          audioStreamRef.current?.enqueue(chunk, sampleRate);
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === userId ? { ...msg, text: '(voice input)' } : msg
            )
          );
          audioStreamRef.current?.stop();
        },
        onError: () => {
          audioStreamRef.current?.stop();
        },
      });
    } catch {
      audioStreamRef.current?.stop();
    } finally {
      clearRecording();
    }
  };

  // Keyboard handler for spacebar push-to-talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'ptt') {
        return;
      }
      if (e.code === 'Space' && !e.repeat && status?.ready && !isHolding) {
        e.preventDefault();
        setIsHolding(true);
        startRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (mode !== 'ptt') {
        return;
      }
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
  }, [mode, status?.ready, isHolding, startRecording, stopRecording]);

  // Mouse/touch handlers for the record button
  const handleRecordStart = () => {
    if (mode === 'ptt' && status?.ready) {
      setIsHolding(true);
      startRecording();
    }
  };

  const handleRecordEnd = () => {
    if (mode === 'ptt' && isHolding) {
      setIsHolding(false);
      stopRecording();
    }
  };

  const handleLiveToggle = () => {
    if (!status?.ready || isProcessing) {
      return;
    }
    if (isRecording) {
      stopRecording();
    } else {
      clearRecording();
      startRecording();
    }
  };

  useEffect(() => {
    if (mode !== 'ptt') {
      setIsHolding(false);
    }
    if (isRecording) {
      stopRecording();
    }
  }, [mode, isRecording, stopRecording]);

  const error = serverError || recorderError || interactionError;

  // Show model setup if model is not installed
  if (showModelSetup || (!modelInstalled && !modelStatusLoading && !modelSetupDismissed)) {
    return (
      <VoiceModelSetup
        compact
        onComplete={() => {
          setShowModelSetup(false);
          setModelSetupDismissed(false);
        }}
        onDismiss={() => {
          setShowModelSetup(false);
          setModelSetupDismissed(true);
        }}
      />
    );
  }

  // Show loading state while checking model status
  if (modelStatusLoading) {
    return (
      <div className="voice-interface">
        <div className="voice-header">
          <div className="voice-title">
            <h3>Voice Assistant</h3>
          </div>
          <div className="voice-status">
            <span className="status loading">Checking model...</span>
          </div>
        </div>
        <div className="voice-messages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Checking voice model status...</p>
        </div>
        <style>{voiceInterfaceStyles}</style>
      </div>
    );
  }

  // Show prompt to enable voice if model not installed
  if (!modelInstalled && modelSetupDismissed) {
    return (
      <div className="voice-interface">
        <div className="voice-header">
          <div className="voice-title">
            <h3>Voice Assistant</h3>
          </div>
        </div>
        <div className="voice-messages" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
            Voice model not installed. Download the model to enable voice features.
          </p>
          <button
            onClick={() => setShowModelSetup(true)}
            style={{
              padding: '8px 16px',
              background: '#e94560',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Setup Voice
          </button>
        </div>
        <style>{voiceInterfaceStyles}</style>
      </div>
    );
  }

  return (
    <div className="voice-interface">
      <div className="voice-header">
        <div className="voice-title">
          <h3>Voice Assistant</h3>
          {status?.ready && (
            <div
              className={`context-health-dot ${context.townHealth} ${isSignificantlyStale ? 'stale' : ''}`}
              title={`Town: ${context.townHealth}${isSignificantlyStale ? ' (stale)' : ''}`}
            />
          )}
        </div>
        <div className="voice-status">
          {!status?.running ? (
            <div className="loading-indicator">
              <span className="status loading">{loadingMessage || 'Starting...'}</span>
            </div>
          ) : !status.ready ? (
            <div className="loading-indicator">
              <span className="status loading">{loadingMessage}</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mode-toggle" role="radiogroup" aria-label="Voice input mode">
              <button
                className={`mode-btn ${mode === 'ptt' ? 'active' : ''}`}
                onClick={() => setMode('ptt')}
                role="radio"
                aria-checked={mode === 'ptt'}
                aria-label="Push-to-Talk mode: Hold Space or button to record"
              >
                PTT
              </button>
              <button
                className={`mode-btn ${mode === 'live' ? 'active' : ''}`}
                onClick={() => setMode('live')}
                role="radio"
                aria-checked={mode === 'live'}
                aria-label="Live mode: continuous listening with model turn handling"
              >
                Live
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="voice-error">
          {String(error)}
        </div>
      )}

      <div
        className="voice-messages"
        role="log"
        aria-live="polite"
        aria-label="Voice conversation"
        ref={messagesContainerRef}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.type}`}
            role="article"
            aria-label={`${msg.type === 'user' ? 'You' : 'Assistant'} at ${msg.timestamp.toLocaleTimeString()}`}
          >
            <div className="message-content">{msg.text}</div>
            <time className="message-time" dateTime={msg.timestamp.toISOString()}>
              {msg.timestamp.toLocaleTimeString()}
            </time>
          </div>
        ))}
        {isProcessing && (
          <div className="message assistant processing" role="status" aria-live="polite">
            <div className="message-content">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="voice-controls" role="region" aria-label="Voice recording controls">
        {mode === 'ptt' ? (
          <>
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
              aria-label={isRecording ? 'Release to send voice message' : 'Hold to record voice message'}
              aria-pressed={isRecording}
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
                : 'Loading voice engine...'}
            </div>
          </>
        ) : (
          <>
            <button
              className={`vad-indicator ${isRecording ? 'listening recording' : ''}`}
              onClick={handleLiveToggle}
              disabled={!status?.ready || isProcessing}
              aria-label={isRecording ? 'Stop listening' : 'Start listening'}
              aria-pressed={isRecording}
            >
              <div className="vad-rings">
                <div className="ring ring-1" />
                <div className="ring ring-2" />
                <div className="ring ring-3" />
              </div>
              <div className="mic-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15a.998.998 0 00-.98-.85c-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                </svg>
              </div>
            </button>
            <div className="voice-hint">
              {!status?.ready
                ? 'Loading voice engine...'
                : isRecording
                  ? 'Listening... click to stop'
                  : isProcessing
                    ? 'Processing...'
                    : 'Click to start listening'}
            </div>
          </>
        )}
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

        .voice-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .voice-header h3 {
          margin: 0;
          color: #e94560;
          font-size: 14px;
          font-weight: 600;
        }

        .context-health-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4ecca3;
          transition: background-color 0.3s;
        }

        .context-health-dot.green {
          background: #4ecca3;
        }

        .context-health-dot.yellow {
          background: #f9c846;
        }

        .context-health-dot.red {
          background: #e94560;
          animation: health-pulse 1s ease-in-out infinite;
        }

        .context-health-dot.stale {
          opacity: 0.5;
        }

        @keyframes health-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
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

        .loading-indicator {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .progress-bar {
          width: 100px;
          height: 4px;
          background: #0f3460;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #f9c846, #4ecca3);
          border-radius: 2px;
          transition: width 0.1s ease;
        }

        .mode-toggle {
          display: flex;
          gap: 4px;
          background: #0f3460;
          border-radius: 4px;
          padding: 2px;
        }

        .mode-btn {
          padding: 4px 10px;
          border: none;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          background: transparent;
          color: #94a3b8; /* slate-400 - AA compliant */
          transition: all 0.2s;
        }

        .mode-btn:hover {
          color: #ccc;
        }

        .mode-btn.active {
          background: #e94560;
          color: white;
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
          color: #94a3b8; /* slate-400 - AA compliant */
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

        .vad-indicator {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
        }

        .vad-indicator:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .vad-rings {
          position: absolute;
          inset: 0;
        }

        .ring {
          position: absolute;
          inset: 0;
          border: 2px solid #0f3460;
          border-radius: 50%;
          opacity: 0.3;
        }

        .vad-indicator.listening .ring {
          border-color: #4ecca3;
          animation: vad-pulse 2s ease-in-out infinite;
        }

        .vad-indicator.recording .ring {
          border-color: #e94560;
          animation: vad-pulse 1s ease-in-out infinite;
        }

        .ring-1 { animation-delay: 0s; }
        .ring-2 { animation-delay: 0.3s; }
        .ring-3 { animation-delay: 0.6s; }

        @keyframes vad-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.6;
          }
        }

        .vad-indicator .mic-icon {
          position: relative;
          z-index: 1;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #1a1a2e;
          border: 2px solid #0f3460;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8; /* slate-400 - AA compliant */
          transition: all 0.3s;
        }

        .vad-indicator.listening .mic-icon {
          border-color: #4ecca3;
          color: #4ecca3;
        }

        .vad-indicator.recording .mic-icon {
          border-color: #e94560;
          background: #e94560;
          color: white;
        }

        .vad-indicator .mic-icon svg {
          width: 20px;
          height: 20px;
        }
      `}</style>
    </div>
  );
}
