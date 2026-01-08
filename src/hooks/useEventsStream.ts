/**
 * Events Stream Hook
 *
 * Watches Gas Town events in real-time and provides:
 * - Real-time event updates via Tauri events
 * - Verbosity level control (quiet/normal/chatty)
 * - Commentary generation for voice integration
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// ============================================================================
// Types
// ============================================================================

export type Verbosity = 'quiet' | 'normal' | 'chatty';

export interface GasTownEvent {
  ts: string;
  source: string;
  event_type: string;
  actor: string;
  payload: Record<string, unknown>;
  visibility?: string;
}

export interface EnrichedEvent {
  event: GasTownEvent;
  commentary: string | null;
}

export interface UseEventsStreamOptions {
  /** Auto-start watching on mount (default: true) */
  autoStart?: boolean;
  /** Initial verbosity level (default: 'normal') */
  verbosity?: Verbosity;
  /** Max events to keep in buffer (default: 50) */
  maxEvents?: number;
  /** Callback for new events (for voice integration) */
  onEvent?: (event: EnrichedEvent) => void;
}

export interface UseEventsStreamResult {
  /** Recent events buffer */
  events: EnrichedEvent[];
  /** Whether watcher is active */
  isWatching: boolean;
  /** Current verbosity level */
  verbosity: Verbosity;
  /** Start watching events */
  start: () => Promise<void>;
  /** Stop watching events */
  stop: () => Promise<void>;
  /** Set verbosity level */
  setVerbosity: (level: Verbosity) => Promise<void>;
  /** Clear events buffer */
  clearEvents: () => void;
  /** Error state */
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useEventsStream(
  options: UseEventsStreamOptions = {}
): UseEventsStreamResult {
  const {
    autoStart = true,
    verbosity: initialVerbosity = 'normal',
    maxEvents = 50,
    onEvent,
  } = options;

  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  const [verbosity, setVerbosityState] = useState<Verbosity>(initialVerbosity);
  const [error, setError] = useState<string | null>(null);

  // Start watching
  const start = useCallback(async () => {
    try {
      setError(null);
      await invoke('start_events_watcher');
      setIsWatching(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // Stop watching
  const stop = useCallback(async () => {
    try {
      await invoke('stop_events_watcher');
      setIsWatching(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // Set verbosity
  const setVerbosity = useCallback(async (level: Verbosity) => {
    try {
      await invoke('set_events_verbosity', { verbosity: level });
      setVerbosityState(level);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Listen for events
  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setupListener = async () => {
      unlisten = await listen<EnrichedEvent>('gastwon-event', (event) => {
        const enrichedEvent = event.payload;

        setEvents((prev) => {
          const updated = [...prev, enrichedEvent];
          // Keep only last N events
          return updated.slice(-maxEvents);
        });

        // Call onEvent callback if provided
        if (onEvent) {
          onEvent(enrichedEvent);
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [maxEvents, onEvent]);

  // Auto-start and initial setup
  useEffect(() => {
    const init = async () => {
      // Set initial verbosity
      await setVerbosity(initialVerbosity);

      // Load recent events
      try {
        const recent = await invoke<EnrichedEvent[]>('get_recent_events', {
          count: maxEvents,
        });
        setEvents(recent);
      } catch {
        // Ignore - events file might not exist yet
      }

      // Auto-start if enabled
      if (autoStart) {
        await start();
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      stop();
    };
  }, []); // Only run once on mount

  return {
    events,
    isWatching,
    verbosity,
    start,
    stop,
    setVerbosity,
    clearEvents,
    error,
  };
}

// ============================================================================
// Voice Integration Hook
// ============================================================================

export interface UseEventsVoiceOptions {
  /** Whether voice commentary is enabled */
  enabled?: boolean;
  /** Verbosity level */
  verbosity?: Verbosity;
  /** Speak function from voice hook */
  speak?: (text: string) => Promise<unknown>;
  /** Debounce time between voice messages (ms) */
  debounceMs?: number;
}

/**
 * Hook that automatically speaks event commentary
 */
export function useEventsVoice(options: UseEventsVoiceOptions = {}) {
  const {
    enabled = false,
    verbosity = 'normal',
    speak,
    debounceMs = 3000,
  } = options;

  const [lastSpokenAt, setLastSpokenAt] = useState(0);
  const [pendingCommentary, setPendingCommentary] = useState<string | null>(null);

  const handleEvent = useCallback((event: EnrichedEvent) => {
    if (!enabled || !speak || !event.commentary) return;

    const now = Date.now();
    if (now - lastSpokenAt < debounceMs) {
      // Queue for later if within debounce window
      setPendingCommentary(event.commentary);
      return;
    }

    setLastSpokenAt(now);
    speak(event.commentary);
  }, [enabled, speak, lastSpokenAt, debounceMs]);

  // Process pending commentary after debounce
  useEffect(() => {
    if (!pendingCommentary || !enabled || !speak) return;

    const timer = setTimeout(() => {
      const now = Date.now();
      if (now - lastSpokenAt >= debounceMs) {
        setLastSpokenAt(now);
        speak(pendingCommentary);
        setPendingCommentary(null);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [pendingCommentary, enabled, speak, lastSpokenAt, debounceMs]);

  const { events, isWatching, ...rest } = useEventsStream({
    verbosity,
    onEvent: handleEvent,
  });

  return {
    events,
    isWatching,
    ...rest,
  };
}
