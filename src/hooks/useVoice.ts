import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
    transcribe,
    speak,
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
