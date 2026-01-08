/**
 * Windows Accessibility Support
 *
 * Provides Windows Narrator compatibility and High Contrast mode support.
 * Complements VoiceOver utilities for cross-platform screen reader support.
 */

import { useEffect, useState, useCallback } from 'react';

// ============================================================================
// High Contrast Mode Detection
// ============================================================================

/**
 * Check if Windows High Contrast mode is active
 * Uses the forced-colors media query (modern approach)
 */
export function isHighContrastActive(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(forced-colors: active)').matches;
}

/**
 * Get the current high contrast color scheme
 * Returns 'light', 'dark', or null if not in high contrast mode
 */
export function getHighContrastScheme(): 'light' | 'dark' | null {
  if (typeof window === 'undefined') return null;

  if (!isHighContrastActive()) return null;

  // Check prefers-color-scheme within forced-colors context
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Hook to detect High Contrast mode changes
 */
export function useHighContrast(): {
  isHighContrast: boolean;
  scheme: 'light' | 'dark' | null;
} {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [scheme, setScheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHighContrast = () => {
      setIsHighContrast(isHighContrastActive());
      setScheme(getHighContrastScheme());
    };

    // Initial check
    updateHighContrast();

    // Listen for changes
    const mediaQuery = window.matchMedia('(forced-colors: active)');
    const handler = () => updateHighContrast();

    // Use addEventListener for modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  return { isHighContrast, scheme };
}

// ============================================================================
// High Contrast CSS Classes
// ============================================================================

/**
 * CSS classes for High Contrast mode compatibility
 * These use system colors that Windows High Contrast respects
 */
export const highContrastClasses = {
  // Text that adapts to high contrast
  text: 'forced-colors:text-[CanvasText]',
  textMuted: 'forced-colors:text-[GrayText]',
  textLink: 'forced-colors:text-[LinkText]',
  textHighlight: 'forced-colors:text-[HighlightText]',

  // Backgrounds
  bg: 'forced-colors:bg-[Canvas]',
  bgHighlight: 'forced-colors:bg-[Highlight]',
  bgButton: 'forced-colors:bg-[ButtonFace]',

  // Borders - critical for visibility in high contrast
  border: 'forced-colors:border-[CanvasText]',
  borderButton: 'forced-colors:border-[ButtonText]',
  borderHighlight: 'forced-colors:border-[Highlight]',

  // Focus indicators - must be highly visible
  focusRing: 'forced-colors:outline-[Highlight] forced-colors:outline-2 forced-colors:outline-offset-2',

  // Buttons
  button: 'forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText] forced-colors:border-[ButtonText]',
  buttonHover: 'forced-colors:hover:bg-[Highlight] forced-colors:hover:text-[HighlightText]',

  // Interactive elements
  interactive: 'forced-colors:border forced-colors:border-[CanvasText]',
} as const;

/**
 * Generate high contrast compatible class string
 */
export function withHighContrast(baseClasses: string, hcClasses: string): string {
  return `${baseClasses} ${hcClasses}`;
}

// ============================================================================
// Windows Narrator Specific Utilities
// ============================================================================

/**
 * Create props for Windows Narrator landmark navigation
 * Narrator uses these for Scan Mode (Caps Lock + Space)
 */
export function getNarratorLandmarkProps(
  role: 'main' | 'navigation' | 'search' | 'complementary' | 'banner' | 'contentinfo' | 'region',
  label: string
): { role: string; 'aria-label': string } {
  return {
    role,
    'aria-label': label,
  };
}

/**
 * Create heading props for Narrator heading navigation
 * Narrator uses H key to jump between headings
 */
export function getNarratorHeadingProps(
  level: 1 | 2 | 3 | 4 | 5 | 6,
  id?: string
): { 'aria-level': number; role: 'heading'; id?: string } {
  return {
    role: 'heading',
    'aria-level': level,
    ...(id ? { id } : {}),
  };
}

/**
 * Props for making custom controls work well with Narrator
 * Narrator reads these during Scan Mode
 */
export interface NarratorControlProps {
  role: string;
  'aria-label': string;
  'aria-describedby'?: string;
  tabIndex: number;
}

export function getNarratorControlProps(
  role: 'button' | 'link' | 'checkbox' | 'radio' | 'slider' | 'switch',
  label: string,
  describedBy?: string
): NarratorControlProps {
  return {
    role,
    'aria-label': label,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    tabIndex: 0,
  };
}

// ============================================================================
// Progress Announcements for Narrator
// ============================================================================

/**
 * Create props for progress indicators that Narrator reads correctly
 */
export function getNarratorProgressProps(
  value: number,
  min: number = 0,
  max: number = 100,
  label: string
): {
  role: 'progressbar';
  'aria-valuenow': number;
  'aria-valuemin': number;
  'aria-valuemax': number;
  'aria-label': string;
  'aria-valuetext': string;
} {
  const percentage = Math.round(((value - min) / (max - min)) * 100);
  return {
    role: 'progressbar',
    'aria-valuenow': value,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-label': label,
    'aria-valuetext': `${percentage}% complete`,
  };
}

// ============================================================================
// Status and Alert Regions for Narrator
// ============================================================================

/**
 * Props for status regions that Narrator announces
 */
export function getNarratorStatusProps(
  atomic: boolean = true
): {
  role: 'status';
  'aria-live': 'polite';
  'aria-atomic': string;
} {
  return {
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': String(atomic),
  };
}

/**
 * Props for alert regions that Narrator announces immediately
 */
export function getNarratorAlertProps(): {
  role: 'alert';
  'aria-live': 'assertive';
  'aria-atomic': 'true';
} {
  return {
    role: 'alert',
    'aria-live': 'assertive',
    'aria-atomic': 'true',
  };
}

// ============================================================================
// Table Navigation for Narrator
// ============================================================================

/**
 * Props for tables that work well with Narrator's table navigation
 * Narrator uses Ctrl+Alt+Arrow keys for table navigation
 */
export function getNarratorTableProps(
  label: string,
  description?: string
): {
  role: 'table';
  'aria-label': string;
  'aria-describedby'?: string;
} {
  return {
    role: 'table',
    'aria-label': label,
    ...(description ? { 'aria-describedby': description } : {}),
  };
}

export function getNarratorTableCellProps(
  rowIndex: number,
  colIndex: number
): {
  role: 'cell';
  'aria-rowindex': number;
  'aria-colindex': number;
} {
  return {
    role: 'cell',
    'aria-rowindex': rowIndex,
    'aria-colindex': colIndex,
  };
}

// ============================================================================
// Windows-Specific Focus Management
// ============================================================================

/**
 * Hook to ensure focus is visible in High Contrast mode
 */
export function useHighContrastFocus() {
  const { isHighContrast } = useHighContrast();

  const getFocusClasses = useCallback(() => {
    if (isHighContrast) {
      // In high contrast, use system colors for focus
      return 'focus:outline-2 focus:outline-offset-2 forced-colors:focus:outline-[Highlight]';
    }
    // Standard focus ring for non-high-contrast
    return 'focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900';
  }, [isHighContrast]);

  return { isHighContrast, getFocusClasses };
}

// ============================================================================
// Reduced Motion Support (Windows accessibility setting)
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook to detect reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  return reducedMotion;
}

/**
 * Get animation duration based on reduced motion preference
 */
export function getAnimationDuration(normalDuration: number): number {
  return prefersReducedMotion() ? 0 : normalDuration;
}

// ============================================================================
// CSS Custom Properties for High Contrast
// ============================================================================

/**
 * CSS custom properties that respect Windows High Contrast
 * Use these in your CSS/Tailwind config
 */
export const highContrastCSSVars = `
  /* High Contrast Mode CSS Variables */
  @media (forced-colors: active) {
    :root {
      --color-text: CanvasText;
      --color-text-muted: GrayText;
      --color-text-link: LinkText;
      --color-text-highlight: HighlightText;
      --color-bg: Canvas;
      --color-bg-highlight: Highlight;
      --color-bg-button: ButtonFace;
      --color-border: CanvasText;
      --color-border-button: ButtonText;
      --color-focus: Highlight;
    }

    /* Ensure all interactive elements have visible borders */
    button, [role="button"], a, [role="link"],
    input, select, textarea {
      border: 1px solid ButtonText !important;
    }

    /* Focus indicators must be highly visible */
    :focus {
      outline: 2px solid Highlight !important;
      outline-offset: 2px !important;
    }

    /* Ensure icons are visible */
    svg {
      forced-color-adjust: auto;
    }

    /* Progress bars need visible borders */
    [role="progressbar"] {
      border: 1px solid CanvasText;
    }

    /* Status indicators need text, not just color */
    .status-indicator::after {
      content: attr(data-status);
    }
  }
`;
