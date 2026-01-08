import { useState, useEffect, useCallback } from 'react';

export interface SetupPreferences {
  voiceEnabled: boolean;
  setupSkipped: boolean;
  lastStep: string | null;
}

const STORAGE_KEY = 'gastown_setup_prefs';

const defaultPreferences: SetupPreferences = {
  voiceEnabled: true,
  setupSkipped: false,
  lastStep: null,
};

function loadPreferences(): SetupPreferences {
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

function savePreferences(prefs: SetupPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for managing setup preferences with localStorage persistence
 */
export function useSetupPreferences() {
  const [preferences, setPreferencesState] = useState<SetupPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    setPreferencesState(loadPreferences());
    setIsLoaded(true);
  }, []);

  // Save preferences when they change
  const setPreferences = useCallback((updates: Partial<SetupPreferences>) => {
    setPreferencesState((prev) => {
      const newPrefs = { ...prev, ...updates };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  const disableVoice = useCallback(() => {
    setPreferences({ voiceEnabled: false });
  }, [setPreferences]);

  const enableVoice = useCallback(() => {
    setPreferences({ voiceEnabled: true });
  }, [setPreferences]);

  const skipSetup = useCallback(() => {
    setPreferences({ setupSkipped: true });
  }, [setPreferences]);

  const resetSkip = useCallback(() => {
    setPreferences({ setupSkipped: false });
  }, [setPreferences]);

  const setLastStep = useCallback((step: string | null) => {
    setPreferences({ lastStep: step });
  }, [setPreferences]);

  const resetPreferences = useCallback(() => {
    setPreferencesState(defaultPreferences);
    savePreferences(defaultPreferences);
  }, []);

  return {
    preferences,
    isLoaded,
    setPreferences,
    disableVoice,
    enableVoice,
    skipSetup,
    resetSkip,
    setLastStep,
    resetPreferences,
  };
}
