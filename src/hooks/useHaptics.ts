import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

/**
 * Haptic feedback types based on iOS UIFeedbackGenerator
 * Maps to standard haptic patterns across platforms
 */
export type HapticType =
  | 'success'      // Task completed successfully
  | 'warning'      // Attention needed
  | 'error'        // Error occurred
  | 'light'        // Subtle feedback
  | 'medium'       // Standard feedback
  | 'heavy'        // Strong feedback
  | 'selection';   // Selection changed

export interface HapticPreferences {
  enabled: boolean;
  intensity: 'light' | 'medium' | 'heavy';
}

const STORAGE_KEY = 'gastown_haptic_prefs';

const defaultPreferences: HapticPreferences = {
  enabled: true,
  intensity: 'medium',
};

function loadPreferences(): HapticPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultPreferences;
}

function savePreferences(prefs: HapticPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if haptics are supported on the current platform
 */
async function checkHapticsSupport(): Promise<boolean> {
  try {
    // Check if we're on iOS/iPadOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Check for Vibration API (Android, some browsers)
    const hasVibration = 'vibrate' in navigator;

    // Check for Tauri haptics support
    try {
      await invoke('check_haptics_support');
      return true;
    } catch {
      // Tauri command not available, fall back to web APIs
    }

    return isIOS || hasVibration;
  } catch {
    return false;
  }
}

/**
 * Trigger haptic feedback using the best available method
 */
async function triggerHaptic(type: HapticType, intensity: string): Promise<void> {
  // Try Tauri native first
  try {
    await invoke('trigger_haptic', { hapticType: type, intensity });
    return;
  } catch {
    // Tauri not available, try web APIs
  }

  // Fall back to Vibration API
  if ('vibrate' in navigator) {
    const patterns: Record<HapticType, number | number[]> = {
      success: [10, 50, 10],
      warning: [30, 50, 30],
      error: [50, 30, 50, 30, 50],
      light: 10,
      medium: 25,
      heavy: 50,
      selection: 5,
    };

    const intensityMultiplier = intensity === 'light' ? 0.5 : intensity === 'heavy' ? 1.5 : 1;
    const pattern = patterns[type];

    if (Array.isArray(pattern)) {
      navigator.vibrate(pattern.map(p => Math.round(p * intensityMultiplier)));
    } else {
      navigator.vibrate(Math.round(pattern * intensityMultiplier));
    }
  }
}

/**
 * Hook for haptic feedback with preferences
 */
export function useHaptics() {
  const [preferences, setPreferencesState] = useState<HapticPreferences>(defaultPreferences);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences and check support on mount
  useEffect(() => {
    setPreferencesState(loadPreferences());
    checkHapticsSupport().then(setIsSupported);
    setIsLoaded(true);
  }, []);

  const setPreferences = useCallback((updates: Partial<HapticPreferences>) => {
    setPreferencesState((prev) => {
      const newPrefs = { ...prev, ...updates };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setPreferences({ enabled });
  }, [setPreferences]);

  const setIntensity = useCallback((intensity: HapticPreferences['intensity']) => {
    setPreferences({ intensity });
  }, [setPreferences]);

  /**
   * Trigger haptic feedback
   */
  const haptic = useCallback(async (type: HapticType = 'medium') => {
    if (!preferences.enabled || !isSupported) return;

    try {
      await triggerHaptic(type, preferences.intensity);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [preferences.enabled, preferences.intensity, isSupported]);

  // Convenience methods for common actions
  const success = useCallback(() => haptic('success'), [haptic]);
  const warning = useCallback(() => haptic('warning'), [haptic]);
  const error = useCallback(() => haptic('error'), [haptic]);
  const selection = useCallback(() => haptic('selection'), [haptic]);

  return {
    preferences,
    isSupported,
    isLoaded,
    setPreferences,
    setEnabled,
    setIntensity,
    haptic,
    success,
    warning,
    error,
    selection,
  };
}

/**
 * Hook for triggering haptics on specific events
 */
export function useHapticOnEvent<T extends HTMLElement = HTMLElement>(
  type: HapticType = 'selection'
) {
  const { haptic, isSupported } = useHaptics();

  const onTouchStart = useCallback(() => {
    if (isSupported) {
      haptic(type);
    }
  }, [haptic, type, isSupported]);

  return { onTouchStart };
}
