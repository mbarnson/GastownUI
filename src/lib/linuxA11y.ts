/**
 * Linux Accessibility Support (Orca Screen Reader)
 *
 * Provides Linux Orca screen reader compatibility and GTK/Qt theme support.
 * Orca uses AT-SPI2 (Assistive Technology Service Provider Interface).
 *
 * Key Orca features:
 * - Flat review mode (reads screen content linearly)
 * - Structural navigation (headings, landmarks, forms)
 * - Where Am I (describes current element)
 * - Learn mode (explores without actions)
 */

import { useEffect, useState, useCallback } from 'react';

// ============================================================================
// Linux Desktop Environment Detection
// ============================================================================

/**
 * Detect if running in a Linux environment
 * Checks navigator.platform and userAgent
 */
export function isLinuxEnvironment(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform?.toLowerCase() || '';
  const userAgent = navigator.userAgent?.toLowerCase() || '';
  return platform.includes('linux') || userAgent.includes('linux');
}

/**
 * Detect the likely desktop environment
 */
export function detectDesktopEnvironment(): 'gnome' | 'kde' | 'xfce' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent?.toLowerCase() || '';

  // GTK-based browsers often indicate GNOME
  if (userAgent.includes('gnome') || userAgent.includes('gtk')) {
    return 'gnome';
  }

  // Qt-based browsers may indicate KDE
  if (userAgent.includes('kde') || userAgent.includes('plasma')) {
    return 'kde';
  }

  // XFCE detection
  if (userAgent.includes('xfce')) {
    return 'xfce';
  }

  return 'unknown';
}

/**
 * Hook to detect Linux environment
 */
export function useLinuxEnvironment(): {
  isLinux: boolean;
  desktop: 'gnome' | 'kde' | 'xfce' | 'unknown';
} {
  const [isLinux, setIsLinux] = useState(false);
  const [desktop, setDesktop] = useState<'gnome' | 'kde' | 'xfce' | 'unknown'>('unknown');

  useEffect(() => {
    setIsLinux(isLinuxEnvironment());
    setDesktop(detectDesktopEnvironment());
  }, []);

  return { isLinux, desktop };
}

// ============================================================================
// Orca-Specific ARIA Patterns
// ============================================================================

/**
 * Orca structural navigation landmarks
 * Orca uses these for quick navigation (Orca+H for headings, etc.)
 */
export const ORCA_LANDMARKS = {
  // Main content - Orca+M to jump
  main: 'main',
  // Navigation - Orca uses list of landmarks
  navigation: 'navigation',
  // Search - Orca+S to jump to search
  search: 'search',
  // Complementary content (sidebars)
  complementary: 'complementary',
  // Form regions - Orca+F to jump between forms
  form: 'form',
  // Banner (header)
  banner: 'banner',
  // Content info (footer)
  contentinfo: 'contentinfo',
  // Generic region (requires aria-label)
  region: 'region',
} as const;

/**
 * Create Orca-friendly landmark props
 * Orca reads the aria-label when entering a landmark
 */
export function getOrcaLandmarkProps(
  role: keyof typeof ORCA_LANDMARKS,
  label: string
): { role: string; 'aria-label': string } {
  return {
    role: ORCA_LANDMARKS[role],
    'aria-label': label,
  };
}

/**
 * Create heading props for Orca heading navigation
 * Orca+H cycles through headings, Orca+Shift+H goes backwards
 */
export function getOrcaHeadingProps(
  level: 1 | 2 | 3 | 4 | 5 | 6
): { role: 'heading'; 'aria-level': number } {
  return {
    role: 'heading',
    'aria-level': level,
  };
}

// ============================================================================
// Orca Live Regions
// ============================================================================

/**
 * Props for live regions that Orca announces
 * Orca respects aria-live and announces changes automatically
 */
export function getOrcaLiveRegionProps(
  priority: 'polite' | 'assertive' = 'polite',
  atomic: boolean = true
): {
  'aria-live': 'polite' | 'assertive';
  'aria-atomic': string;
  'aria-relevant'?: string;
} {
  return {
    'aria-live': priority,
    'aria-atomic': String(atomic),
    // Orca respects aria-relevant for filtering what's announced
    'aria-relevant': 'additions text',
  };
}

/**
 * Props for status regions (non-urgent updates)
 * Orca announces these when the user is idle
 */
export function getOrcaStatusProps(): {
  role: 'status';
  'aria-live': 'polite';
  'aria-atomic': 'true';
} {
  return {
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  };
}

/**
 * Props for alert regions (urgent updates)
 * Orca announces these immediately, interrupting current speech
 */
export function getOrcaAlertProps(): {
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

/**
 * Props for log regions (activity feeds, chat)
 * Orca announces new items but allows review of history
 */
export function getOrcaLogProps(): {
  role: 'log';
  'aria-live': 'polite';
  'aria-relevant': 'additions';
} {
  return {
    role: 'log',
    'aria-live': 'polite',
    'aria-relevant': 'additions',
  };
}

// ============================================================================
// Orca Form Navigation
// ============================================================================

/**
 * Props for form controls that work well with Orca
 * Orca+Tab moves between form fields
 */
export function getOrcaFormControlProps(
  type: 'textbox' | 'checkbox' | 'radio' | 'combobox' | 'listbox' | 'slider' | 'spinbutton',
  label: string,
  required: boolean = false,
  invalid: boolean = false
): {
  role: string;
  'aria-label': string;
  'aria-required'?: 'true';
  'aria-invalid'?: 'true';
} {
  return {
    role: type,
    'aria-label': label,
    ...(required ? { 'aria-required': 'true' as const } : {}),
    ...(invalid ? { 'aria-invalid': 'true' as const } : {}),
  };
}

/**
 * Props for form groups (fieldsets)
 * Orca reads the group label when entering
 */
export function getOrcaFormGroupProps(
  legend: string
): {
  role: 'group';
  'aria-label': string;
} {
  return {
    role: 'group',
    'aria-label': legend,
  };
}

// ============================================================================
// Orca Table Navigation
// ============================================================================

/**
 * Props for tables that work with Orca's table navigation
 * Orca uses Orca+T to enter table mode, arrow keys to navigate
 */
export function getOrcaTableProps(
  label: string,
  rowCount?: number,
  colCount?: number
): {
  role: 'table';
  'aria-label': string;
  'aria-rowcount'?: number;
  'aria-colcount'?: number;
} {
  return {
    role: 'table',
    'aria-label': label,
    ...(rowCount !== undefined ? { 'aria-rowcount': rowCount } : {}),
    ...(colCount !== undefined ? { 'aria-colcount': colCount } : {}),
  };
}

/**
 * Props for table rows
 */
export function getOrcaTableRowProps(
  rowIndex: number
): {
  role: 'row';
  'aria-rowindex': number;
} {
  return {
    role: 'row',
    'aria-rowindex': rowIndex,
  };
}

/**
 * Props for table cells (Orca reads row/column headers automatically)
 */
export function getOrcaTableCellProps(
  colIndex: number
): {
  role: 'cell';
  'aria-colindex': number;
} {
  return {
    role: 'cell',
    'aria-colindex': colIndex,
  };
}

/**
 * Props for sortable column headers
 */
export function getOrcaSortableHeaderProps(
  sortDirection: 'ascending' | 'descending' | 'none' | undefined
): {
  role: 'columnheader';
  'aria-sort'?: 'ascending' | 'descending' | 'none';
} {
  return {
    role: 'columnheader',
    ...(sortDirection ? { 'aria-sort': sortDirection } : {}),
  };
}

// ============================================================================
// Orca Progress and Meters
// ============================================================================

/**
 * Props for progress indicators
 * Orca reads progress as "X percent complete"
 */
export function getOrcaProgressProps(
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
    'aria-valuetext': `${percentage} percent complete`,
  };
}

/**
 * Props for meter elements (gauges, ratings)
 * Orca reads the current value in context
 */
export function getOrcaMeterProps(
  value: number,
  min: number,
  max: number,
  label: string,
  optimal?: { low: number; high: number }
): {
  role: 'meter';
  'aria-valuenow': number;
  'aria-valuemin': number;
  'aria-valuemax': number;
  'aria-label': string;
} {
  return {
    role: 'meter',
    'aria-valuenow': value,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-label': label,
  };
}

// ============================================================================
// Orca Flat Review Support
// ============================================================================

/**
 * Mark decorative elements that Orca should skip in flat review
 */
export const orcaDecorativeProps = {
  role: 'presentation' as const,
  'aria-hidden': 'true' as const,
};

/**
 * Create description that Orca reads for "Where Am I" (Orca+KP_Enter)
 */
export function getOrcaDescribedByProps(
  descriptionId: string
): { 'aria-describedby': string } {
  return {
    'aria-describedby': descriptionId,
  };
}

// ============================================================================
// GTK/Qt Theme Compatibility
// ============================================================================

/**
 * CSS classes for GTK theme compatibility
 * GTK uses specific color names that can be referenced
 */
export const gtkThemeClasses = {
  // GTK accent colors (GNOME 42+)
  accent: 'accent-[--gtk-accent-color]',
  accentBg: 'bg-[--gtk-accent-bg-color]',

  // GTK semantic colors
  success: 'text-[--gtk-success-color]',
  warning: 'text-[--gtk-warning-color]',
  error: 'text-[--gtk-error-color]',

  // GTK focus ring
  focusRing: 'focus:outline-[--gtk-focus-color] focus:outline-2 focus:outline-offset-2',
} as const;

/**
 * CSS custom properties for GTK theme integration
 * These reference GTK's CSS variables when available
 */
export const gtkThemeCSSVars = `
  /* GTK Theme Integration */
  :root {
    /* Fallback values for non-GTK environments */
    --gtk-accent-color: #3584e4;
    --gtk-accent-bg-color: #3584e4;
    --gtk-success-color: #33d17a;
    --gtk-warning-color: #f6d32d;
    --gtk-error-color: #e01b24;
    --gtk-focus-color: #3584e4;
  }

  /* GNOME/Adwaita dark mode */
  @media (prefers-color-scheme: dark) {
    :root {
      --gtk-accent-color: #78aeed;
      --gtk-accent-bg-color: #3584e4;
      --gtk-success-color: #8ff0a4;
      --gtk-warning-color: #f8e45c;
      --gtk-error-color: #ff7b63;
      --gtk-focus-color: #78aeed;
    }
  }
`;

/**
 * CSS for KDE/Qt theme compatibility
 */
export const qtThemeCSSVars = `
  /* KDE/Qt Theme Integration */
  :root {
    /* Breeze color scheme fallbacks */
    --qt-accent-color: #3daee9;
    --qt-link-color: #2980b9;
    --qt-success-color: #27ae60;
    --qt-warning-color: #f39c12;
    --qt-error-color: #da4453;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --qt-accent-color: #3daee9;
      --qt-link-color: #2980b9;
      --qt-success-color: #27ae60;
      --qt-warning-color: #fdbc4b;
      --qt-error-color: #da4453;
    }
  }
`;

// ============================================================================
// Orca Keyboard Shortcuts Reference
// ============================================================================

/**
 * Common Orca keyboard shortcuts (for documentation)
 * These are handled by Orca, not the application
 */
export const ORCA_SHORTCUTS = {
  // Navigation
  nextHeading: 'Orca+H',
  previousHeading: 'Orca+Shift+H',
  nextLandmark: 'Orca+M',
  previousLandmark: 'Orca+Shift+M',
  nextLink: 'Orca+L',
  previousLink: 'Orca+Shift+L',
  nextFormField: 'Orca+Tab',
  previousFormField: 'Orca+Shift+Tab',
  nextTable: 'Orca+T',
  previousTable: 'Orca+Shift+T',

  // Table navigation (in table mode)
  tableUp: 'Orca+Up',
  tableDown: 'Orca+Down',
  tableLeft: 'Orca+Left',
  tableRight: 'Orca+Right',

  // Information
  whereAmI: 'Orca+KP_Enter',
  titleBar: 'Orca+KP_Enter (double)',
  statusBar: 'Orca+KP_Enter (triple)',

  // Flat review
  flatReviewStart: 'Orca+KP_7',
  flatReviewEnd: 'Orca+KP_1',
  flatReviewCurrent: 'Orca+KP_5',
} as const;

// ============================================================================
// Screen Reader Detection (Best Effort)
// ============================================================================

/**
 * Attempt to detect if a screen reader might be active
 * This is heuristic and not 100% reliable
 */
export function useScreenReaderDetection(): {
  likelyActive: boolean;
  hints: string[];
} {
  const [likelyActive, setLikelyActive] = useState(false);
  const [hints, setHints] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectedHints: string[] = [];

    // Check for reduced motion (often enabled with screen readers)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      detectedHints.push('prefers-reduced-motion');
    }

    // Check for high contrast
    if (window.matchMedia('(forced-colors: active)').matches) {
      detectedHints.push('high-contrast-mode');
    }

    // Check for focus-visible support usage
    if (document.querySelector(':focus-visible')) {
      detectedHints.push('keyboard-navigation');
    }

    setHints(detectedHints);
    setLikelyActive(detectedHints.length >= 2);
  }, []);

  return { likelyActive, hints };
}
