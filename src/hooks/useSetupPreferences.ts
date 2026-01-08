import { useState, useEffect, useCallback } from 'react';

export type FTUEStep = 'loading' | 'go-install' | 'beads-install' | 'complete';

export interface SetupPreferences {
  voiceEnabled: boolean;
  setupSkipped: boolean;
  setupDismissed: boolean; // User dismissed the setup warning banner
  lastStep: FTUEStep | null;
  completedSteps: FTUEStep[];
  startedAt: string | null;
  errors: string[];
}

const STORAGE_KEY = 'gastown_setup_prefs';

const defaultPreferences: SetupPreferences = {
  voiceEnabled: true,
  setupSkipped: false,
  setupDismissed: false,
  lastStep: null,
  completedSteps: [],
  startedAt: null,
  errors: [],
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

  const setLastStep = useCallback((step: FTUEStep | null) => {
    setPreferences({ lastStep: step });
  }, [setPreferences]);

  const markStepComplete = useCallback((step: FTUEStep) => {
    setPreferencesState((prev) => {
      if (prev.completedSteps.includes(step)) return prev;
      const newPrefs = {
        ...prev,
        completedSteps: [...prev.completedSteps, step],
      };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  const startSetup = useCallback(() => {
    setPreferences({
      startedAt: new Date().toISOString(),
      setupSkipped: false,
      setupDismissed: false,
      lastStep: null,
      completedSteps: [],
      errors: [],
    });
  }, [setPreferences]);

  const addError = useCallback((error: string) => {
    setPreferencesState((prev) => {
      const newPrefs = {
        ...prev,
        errors: [...prev.errors, error],
      };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  const dismissBanner = useCallback(() => {
    setPreferences({ setupDismissed: true });
  }, [setPreferences]);

  const resetPreferences = useCallback(() => {
    setPreferencesState(defaultPreferences);
    savePreferences(defaultPreferences);
  }, []);

  // Check if setup was interrupted (started but not completed)
  const isInterrupted = preferences.startedAt !== null &&
    preferences.lastStep !== null &&
    preferences.lastStep !== 'complete' &&
    !preferences.setupSkipped;

  // Check if setup needs to be shown
  const needsSetup = !preferences.setupSkipped &&
    !preferences.completedSteps.includes('complete');

  return {
    preferences,
    isLoaded,
    setPreferences,
    disableVoice,
    enableVoice,
    skipSetup,
    resetSkip,
    setLastStep,
    markStepComplete,
    startSetup,
    addError,
    dismissBanner,
    resetPreferences,
    isInterrupted,
    needsSetup,
  };
}
