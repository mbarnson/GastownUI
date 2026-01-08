import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Color blind mode types
 * - normal: Default color vision
 * - deuteranopia: Red-green (green-weak), most common
 * - protanopia: Red-green (red-weak)
 * - tritanopia: Blue-yellow (rare)
 * - high-contrast: Maximum contrast for low vision
 */
export type ColorBlindMode = 'normal' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'high-contrast';

export interface ColorBlindPreferences {
  mode: ColorBlindMode;
  usePatterns: boolean; // Use patterns in addition to colors
  useShapes: boolean;   // Use shapes for status indicators
}

const STORAGE_KEY = 'gastown_color_blind_prefs';

const defaultPreferences: ColorBlindPreferences = {
  mode: 'normal',
  usePatterns: false,
  useShapes: true, // Default to using shapes for better accessibility
};

/**
 * Color palettes optimized for different color blind types
 * Based on research from Color Universal Design (CUD)
 */
export const colorPalettes: Record<ColorBlindMode, {
  success: string;
  warning: string;
  error: string;
  info: string;
  primary: string;
  secondary: string;
  muted: string;
}> = {
  normal: {
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    error: '#ef4444',   // red-500
    info: '#3b82f6',    // blue-500
    primary: '#f43f5e', // rose-500
    secondary: '#8b5cf6', // violet-500
    muted: '#6b7280',   // gray-500
  },
  deuteranopia: {
    // Avoid red-green confusion
    success: '#0ea5e9', // sky-500 (blue instead of green)
    warning: '#f59e0b', // amber-500 (OK - distinguishable)
    error: '#ec4899',   // pink-500 (pink instead of red)
    info: '#3b82f6',    // blue-500
    primary: '#f97316', // orange-500
    secondary: '#8b5cf6', // violet-500
    muted: '#6b7280',
  },
  protanopia: {
    // Similar to deuteranopia but red is darker
    success: '#0ea5e9', // sky-500
    warning: '#fbbf24', // amber-400 (brighter)
    error: '#f472b6',   // pink-400 (lighter pink)
    info: '#60a5fa',    // blue-400
    primary: '#fb923c', // orange-400
    secondary: '#a78bfa', // violet-400
    muted: '#9ca3af',
  },
  tritanopia: {
    // Avoid blue-yellow confusion
    success: '#10b981', // emerald-500 (green OK)
    warning: '#f97316', // orange-500 (orange instead of yellow)
    error: '#ef4444',   // red-500
    info: '#ec4899',    // pink-500 (pink instead of blue)
    primary: '#f43f5e', // rose-500
    secondary: '#14b8a6', // teal-500
    muted: '#6b7280',
  },
  'high-contrast': {
    success: '#00ff00', // Pure green
    warning: '#ffff00', // Pure yellow
    error: '#ff0000',   // Pure red
    info: '#00ffff',    // Cyan
    primary: '#ff00ff', // Magenta
    secondary: '#ffffff', // White
    muted: '#808080',   // Gray
  },
};

/**
 * Status indicator shapes for non-color differentiation
 */
export const statusShapes = {
  success: '✓',    // Checkmark
  warning: '⚠',    // Warning triangle
  error: '✕',      // X mark
  info: 'ℹ',       // Info
  pending: '○',    // Empty circle
  inProgress: '●', // Filled circle
  blocked: '⊘',    // No entry
  completed: '✓',  // Checkmark
};

/**
 * SVG pattern definitions for progress bars and charts
 */
export const patternDefinitions = `
  <defs>
    <pattern id="pattern-success" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="currentColor" opacity="0.3"/>
      <path d="M0 0L8 8M8 0L0 8" stroke="currentColor" stroke-width="1"/>
    </pattern>
    <pattern id="pattern-warning" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="currentColor" opacity="0.3"/>
      <circle cx="4" cy="4" r="2" fill="currentColor"/>
    </pattern>
    <pattern id="pattern-error" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="currentColor" opacity="0.3"/>
      <rect x="2" y="2" width="4" height="4" fill="currentColor"/>
    </pattern>
    <pattern id="pattern-info" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="currentColor" opacity="0.3"/>
      <path d="M0 4H8" stroke="currentColor" stroke-width="2"/>
    </pattern>
  </defs>
`;

function loadPreferences(): ColorBlindPreferences {
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

function savePreferences(prefs: ColorBlindPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for managing color blind mode preferences
 */
export function useColorBlindMode() {
  const [preferences, setPreferencesState] = useState<ColorBlindPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    setPreferencesState(loadPreferences());
    setIsLoaded(true);
  }, []);

  // Apply CSS variables when mode changes
  useEffect(() => {
    if (!isLoaded) return;

    const palette = colorPalettes[preferences.mode];
    const root = document.documentElement;

    root.style.setProperty('--color-success', palette.success);
    root.style.setProperty('--color-warning', palette.warning);
    root.style.setProperty('--color-error', palette.error);
    root.style.setProperty('--color-info', palette.info);
    root.style.setProperty('--color-primary', palette.primary);
    root.style.setProperty('--color-secondary', palette.secondary);
    root.style.setProperty('--color-muted', palette.muted);

    // Add class for high contrast mode
    if (preferences.mode === 'high-contrast') {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Add class for pattern mode
    if (preferences.usePatterns) {
      root.classList.add('use-patterns');
    } else {
      root.classList.remove('use-patterns');
    }
  }, [preferences, isLoaded]);

  const setPreferences = useCallback((updates: Partial<ColorBlindPreferences>) => {
    setPreferencesState((prev) => {
      const newPrefs = { ...prev, ...updates };
      savePreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  const setMode = useCallback((mode: ColorBlindMode) => {
    setPreferences({ mode });
  }, [setPreferences]);

  const togglePatterns = useCallback(() => {
    setPreferences({ usePatterns: !preferences.usePatterns });
  }, [preferences.usePatterns, setPreferences]);

  const toggleShapes = useCallback(() => {
    setPreferences({ useShapes: !preferences.useShapes });
  }, [preferences.useShapes, setPreferences]);

  const resetPreferences = useCallback(() => {
    setPreferencesState(defaultPreferences);
    savePreferences(defaultPreferences);
  }, []);

  // Get colors for current mode
  const colors = useMemo(() => colorPalettes[preferences.mode], [preferences.mode]);

  return {
    preferences,
    isLoaded,
    colors,
    setPreferences,
    setMode,
    togglePatterns,
    toggleShapes,
    resetPreferences,
  };
}

/**
 * Get the appropriate status indicator (shape + color) based on preferences
 */
export function getStatusIndicator(
  status: keyof typeof statusShapes,
  preferences: ColorBlindPreferences
): { shape: string; color: string } {
  const palette = colorPalettes[preferences.mode];

  const colorMap: Record<string, string> = {
    success: palette.success,
    warning: palette.warning,
    error: palette.error,
    info: palette.info,
    pending: palette.muted,
    inProgress: palette.warning,
    blocked: palette.error,
    completed: palette.success,
  };

  return {
    shape: preferences.useShapes ? statusShapes[status] : '',
    color: colorMap[status] || palette.muted,
  };
}
