/**
 * Voice Commands Hook
 *
 * Provides voice command processing with navigation integration.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  parseVoiceCommand,
  executeVoiceCommand,
  VoiceCommand,
  CommandResponse,
} from '../lib/voiceCommands';

export interface UseVoiceCommandsResult {
  /** Process voice input and execute command */
  process: (input: string) => Promise<CommandResponse>;
  /** Parse voice input without executing */
  parse: (input: string) => VoiceCommand;
  /** Last processed command */
  lastCommand: VoiceCommand | null;
  /** Last command response */
  lastResponse: CommandResponse | null;
  /** Whether a command is being processed */
  isProcessing: boolean;
  /** Command history */
  history: Array<{ command: VoiceCommand; response: CommandResponse }>;
  /** Clear history */
  clearHistory: () => void;
}

export function useVoiceCommands(): UseVoiceCommandsResult {
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [lastResponse, setLastResponse] = useState<CommandResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<
    Array<{ command: VoiceCommand; response: CommandResponse }>
  >([]);

  // Try to get navigate, but don't fail if router isn't available
  let navigate: ReturnType<typeof useNavigate> | null = null;
  try {
    navigate = useNavigate();
  } catch {
    // Router not available, navigation will be skipped
  }

  const parse = useCallback((input: string): VoiceCommand => {
    return parseVoiceCommand(input);
  }, []);

  const process = useCallback(
    async (input: string): Promise<CommandResponse> => {
      setIsProcessing(true);

      try {
        const command = parseVoiceCommand(input);
        setLastCommand(command);

        const response = await executeVoiceCommand(command);
        setLastResponse(response);

        // Add to history
        setHistory((prev) => [...prev.slice(-19), { command, response }]);

        // Handle navigation if present
        if (response.navigate && navigate) {
          navigate({ to: response.navigate });
        }

        return response;
      } finally {
        setIsProcessing(false);
      }
    },
    [navigate]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setLastCommand(null);
    setLastResponse(null);
  }, []);

  return {
    process,
    parse,
    lastCommand,
    lastResponse,
    isProcessing,
    history,
    clearHistory,
  };
}

/** Re-export for standalone usage */
export { processVoiceCommand } from '../lib/voiceCommands';
