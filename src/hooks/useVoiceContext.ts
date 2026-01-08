/**
 * Voice Context Hook
 *
 * Provides Gas Town context for the voice model with:
 * - 2-second refresh interval (non-blocking)
 * - Graceful degradation with cached values on failure
 * - Built-in system prompt generation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  VoiceContext,
  assembleContext,
  buildVoiceSystemPrompt,
  createEmptyContext,
} from '../lib/voiceContext';

const REFRESH_INTERVAL_MS = 2000;
const MAX_STALE_AGE_MS = 30000; // Show warning after 30s of stale data

export interface UseVoiceContextOptions {
  /** Enable automatic context refresh (default: true) */
  enabled?: boolean;
  /** Refresh interval in ms (default: 2000) */
  refreshInterval?: number;
}

export interface UseVoiceContextResult {
  /** Current assembled context */
  context: VoiceContext;
  /** Generated system prompt for voice model */
  systemPrompt: string;
  /** Whether context is loading */
  isLoading: boolean;
  /** Last error (if any) */
  error: string | null;
  /** Manually refresh context */
  refresh: () => Promise<void>;
  /** Whether data is significantly stale (>30s) */
  isSignificantlyStale: boolean;
}

export function useVoiceContext(
  options: UseVoiceContextOptions = {}
): UseVoiceContextResult {
  const {
    enabled = true,
    refreshInterval = REFRESH_INTERVAL_MS,
  } = options;

  const [context, setContext] = useState<VoiceContext>(createEmptyContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref for cached context to avoid stale closure issues
  const cachedContextRef = useRef<VoiceContext>(createEmptyContext());
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    setIsLoading(true);

    try {
      const newContext = await assembleContext();
      cachedContextRef.current = newContext;
      setContext(newContext);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);

      // Graceful degradation: use cached context but mark as stale
      const staleContext = {
        ...cachedContextRef.current,
        isStale: true,
        lastUpdated: cachedContextRef.current.lastUpdated,
      };
      setContext(staleContext);
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);

  // Initial fetch and interval refresh
  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    refresh();

    // Set up interval
    const intervalId = setInterval(refresh, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, refreshInterval, refresh]);

  // Calculate if significantly stale
  const isSignificantlyStale = context.isStale &&
    (Date.now() - context.lastUpdated.getTime()) > MAX_STALE_AGE_MS;

  // Generate system prompt
  const systemPrompt = buildVoiceSystemPrompt(context);

  return {
    context,
    systemPrompt,
    isLoading,
    error,
    refresh,
    isSignificantlyStale,
  };
}

/**
 * Lightweight hook for just the system prompt (for voice interactions)
 */
export function useVoiceSystemPrompt(enabled = true): string {
  const { systemPrompt } = useVoiceContext({ enabled });
  return systemPrompt;
}
