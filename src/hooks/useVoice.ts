import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Types matching Rust structs
export interface VoiceServerStatus {
  running: boolean;
  ready: boolean;
  url: string;
}

export interface VoiceResponse {
  text: string;
  audio_base64: string | null;
  audio_sample_rate: number;
}

export interface VoiceStreamEvent {
  streamId: string;
  event: 'text' | 'audio' | 'done' | 'error';
  text?: string;
  audioBase64?: string;
  audioSampleRate?: number;
  message?: string;
}

export interface VoiceServerConfig {
  model_dir?: string;
  quantization?: string;
  port?: number;
}

// Query key constants
const VOICE_STATUS_KEY = ['voice', 'status'];

/**
 * Hook for managing voice server lifecycle
 */
export function useVoiceServer() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: VOICE_STATUS_KEY,
    queryFn: () => invoke<VoiceServerStatus>('get_voice_server_status'),
    refetchInterval: 5000,
  });

  const startMutation = useMutation({
    mutationFn: (config?: VoiceServerConfig) =>
      invoke<VoiceServerStatus>('start_voice_server', { config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VOICE_STATUS_KEY });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => invoke('stop_voice_server'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VOICE_STATUS_KEY });
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    start: startMutation.mutate,
    stop: stopMutation.mutate,
    error: startMutation.error || stopMutation.error,
  };
}

export function useAutoStartVoice(autoStart = true) {
  const { status, isLoading, isStarting, start, error } = useVoiceServer();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Starting voice server...');
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!autoStart) {
      return;
    }
    if (status?.running || isStarting || hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;
    start();
  }, [autoStart, status?.running, isStarting, start]);

  useEffect(() => {
    if (status?.ready) {
      setLoadingProgress(100);
      setLoadingMessage('Ready');
      return;
    }
    if (status?.running) {
      setLoadingProgress(70);
      setLoadingMessage('Loading voice model...');
      return;
    }
    if (isStarting || isLoading) {
      setLoadingProgress(30);
      setLoadingMessage('Starting voice server...');
      return;
    }
    setLoadingProgress(0);
    setLoadingMessage('Voice server stopped');
  }, [status?.ready, status?.running, isStarting, isLoading]);

  return {
    status,
    isStarting,
    loadingProgress,
    loadingMessage,
    error,
  };
}

/**
 * Hook for audio recording using Web Audio API
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create MediaRecorder with WAV-compatible settings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

        // Convert to WAV using AudioContext
        const wavBlob = await convertToWav(webmBlob);
        setAudioBlob(wavBlob);

        // Convert to base64
        const base64 = await blobToBase64(wavBlob);
        setAudioBase64(base64);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Update duration every 100ms
      durationIntervalRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setAudioBase64(null);
    setDuration(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isRecording,
    audioBlob,
    audioBase64,
    duration,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  };
}

// Types for persona support
export type AgentPersona =
  | 'default'
  | 'mayor'
  | 'witness'
  | 'refinery'
  | 'deacon'
  | 'polecat'
  | 'crew';

export interface VoiceInputOptions {
  mode?: string;
  persona?: AgentPersona;
  polecatName?: string;
}

export interface VoiceStreamOptions extends VoiceInputOptions {
  resetContext?: boolean;
  systemPrompt?: string;
  onTextChunk?: (text: string) => void;
  onAudioChunk?: (audioBase64: string, sampleRate: number) => void;
  onError?: (message: string) => void;
  onDone?: (fullText: string) => void;
}

/**
 * Hook for voice interactions (sending voice, getting responses)
 */
export function useVoiceInteraction() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<VoiceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendVoice = useCallback(async (
    audioBase64: string,
    options?: VoiceInputOptions
  ) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await invoke<VoiceResponse>('send_voice_input', {
        audioBase64,
        mode: options?.mode,
        persona: options?.persona,
        polecatName: options?.polecatName,
      });
      setLastResponse(response);

      // Play audio response if available
      if (response.audio_base64) {
        await playAudio(response.audio_base64, response.audio_sample_rate);
      }

      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const streamVoice = useCallback(async (
    audioBase64: string,
    options?: VoiceStreamOptions
  ) => {
    setIsProcessing(true);
    setError(null);

    const streamId = crypto.randomUUID();
    let fullText = '';
    let lastSampleRate = 24000;
    let unlisten: (() => void) | null = null;

    try {
      unlisten = await listen<VoiceStreamEvent>('voice_stream', (event) => {
        const payload = event.payload;
        if (payload.streamId !== streamId) {
          return;
        }

        if (payload.event === 'text' && payload.text) {
          fullText += payload.text;
          options?.onTextChunk?.(payload.text);
        }

        if (payload.event === 'audio' && payload.audioBase64) {
          const sampleRate = payload.audioSampleRate ?? 24000;
          lastSampleRate = sampleRate;
          options?.onAudioChunk?.(payload.audioBase64, sampleRate);
        }

        if (payload.event === 'error') {
          const message = payload.message || 'Voice stream error';
          setError(message);
          options?.onError?.(message);
        }

        if (payload.event === 'done') {
          options?.onDone?.(fullText);
        }
      });

      await invoke('stream_voice_input', {
        audioBase64,
        mode: options?.mode,
        persona: options?.persona,
        polecatName: options?.polecatName,
        resetContext: options?.resetContext,
        systemPrompt: options?.systemPrompt,
        streamId,
      });

      const response = {
        text: fullText,
        audio_base64: null,
        audio_sample_rate: lastSampleRate,
      };
      setLastResponse(response);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      if (unlisten) {
        unlisten();
      }
      setIsProcessing(false);
    }
  }, []);

  const transcribe = useCallback(async (audioBase64: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const text = await invoke<string>('transcribe_audio', { audioBase64 });
      return text;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await invoke<VoiceResponse>('send_text_to_speech', { text });
      setLastResponse(response);

      if (response.audio_base64) {
        await playAudio(response.audio_base64, response.audio_sample_rate);
      }

      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    lastResponse,
    error,
    sendVoice,
    streamVoice,
    transcribe,
    speak,
  };
}

/**
 * Hook for auto-starting voice server with loading progress
 */
export function useAutoStartVoice(autoStart: boolean = true) {
  const { status, isStarting, start, error } = useVoiceServer();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');

  useEffect(() => {
    if (autoStart && !status?.running && !isStarting) {
      setLoadingMessage('Starting voice server...');
      setLoadingProgress(10);
      start();
    }
  }, [autoStart, status?.running, isStarting, start]);

  useEffect(() => {
    if (isStarting) {
      setLoadingProgress(50);
      setLoadingMessage('Loading models...');
    } else if (status?.ready) {
      setLoadingProgress(100);
      setLoadingMessage('Ready');
    }
  }, [isStarting, status?.ready]);

  return {
    status,
    isStarting,
    loadingProgress,
    loadingMessage,
    error,
  };
}

/**
 * Hook for Voice Activity Detection (VAD) recording
 */
export function useVADRecorder() {
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start listening');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsListening(false);
    setIsRecording(false);
  }, []);

  const clearRecording = useCallback(() => {
    setAudioBase64(null);
    chunksRef.current = [];
  }, []);

  return {
    isListening,
    isRecording,
    audioBase64,
    error,
    startListening,
    stopListening,
    clearRecording,
  };
}

// Utility: Convert audio blob to WAV format
async function convertToWav(blob: Blob): Promise<Blob> {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Get audio data
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = 16000;

  // Create WAV file
  const wavBuffer = encodeWav(channelData, sampleRate);
  audioContext.close();

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

// Encode PCM data as WAV
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, 1, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write samples as 16-bit PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Play audio from base64
async function playAudio(base64: string, sampleRate: number): Promise<void> {
  const audioContext = new AudioContext({ sampleRate });

  // Decode base64 to array buffer
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert float32 PCM to AudioBuffer
  const float32Array = new Float32Array(bytes.buffer);
  const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
  audioBuffer.copyToChannel(float32Array, 0);

  // Play
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();

  return new Promise((resolve) => {
    source.onended = () => {
      audioContext.close();
      resolve();
    };
  });
}
