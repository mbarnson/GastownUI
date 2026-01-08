/**
 * Accessibility Utilities
 *
 * WCAG 2.1 AA compliant color system and accessibility helpers.
 * Contrast ratios: 4.5:1 for normal text, 3:1 for large text and UI components.
 */

// ============================================================================
// WCAG AA Compliant Colors
// All colors verified against dark backgrounds (#1a1a2e, #0f172a, #1e293b)
// ============================================================================

/**
 * Status colors - AA compliant on dark backgrounds
 * These replace the original low-contrast colors
 */
export const a11yStatusColors = {
  // Success/Active - bright enough for 4.5:1 on #1a1a2e
  success: '#4ade80', // green-400 equivalent, passes AA
  successText: '#86efac', // green-300 for smaller text

  // Warning - bright yellow
  warning: '#fbbf24', // amber-400, passes AA
  warningText: '#fcd34d', // amber-300 for smaller text

  // Error/Danger - bright red
  error: '#f87171', // red-400, passes AA
  errorText: '#fca5a5', // red-300 for smaller text

  // Info - bright blue
  info: '#60a5fa', // blue-400, passes AA
  infoText: '#93c5fd', // blue-300 for smaller text

  // Neutral - must be bright enough
  neutral: '#cbd5e1', // slate-300, passes AA
  neutralMuted: '#94a3b8', // slate-400, passes AA for large text only
} as const;

/**
 * Semantic colors for status indicators
 */
export const a11ySemanticColors = {
  open: { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  in_progress: { text: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' },
  closed: { text: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)' },
  blocked: { text: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  active: { text: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)' },
  idle: { text: '#cbd5e1', bg: 'rgba(203, 213, 225, 0.15)' },
  stuck: { text: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  processing: { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
} as const;

// ============================================================================
// Tailwind Class Mappings (AA Compliant)
// ============================================================================

/**
 * Maps low-contrast Tailwind classes to AA-compliant alternatives
 */
export const a11yClassMap = {
  // Gray/Slate text - use brighter variants
  'text-gray-400': 'text-slate-300',
  'text-gray-500': 'text-slate-300',
  'text-gray-600': 'text-slate-400',
  'text-slate-400': 'text-slate-300',
  'text-slate-500': 'text-slate-300',

  // Status colors - ensure AA compliance
  'text-yellow-400': 'text-amber-400',
  'text-blue-400': 'text-blue-400',
  'text-green-400': 'text-green-400',
  'text-red-400': 'text-red-400',

  // These are already compliant
  'text-white': 'text-white',
  'text-cyan-400': 'text-cyan-400',
  'text-orange-400': 'text-amber-500',
} as const;

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Standard focus ring classes for interactive elements
 */
export const focusRingClasses =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

/**
 * Focus ring for dark backgrounds
 */
export const focusRingDark =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800';

// ============================================================================
// Screen Reader Utilities
// ============================================================================

/**
 * Visually hidden but screen reader accessible
 */
export const srOnly = 'sr-only';

/**
 * Skip link styles (visible on focus)
 */
export const skipLinkClasses =
  'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-cyan-600 focus:text-white focus:px-4 focus:py-2 focus:rounded';

// ============================================================================
// ARIA Helpers
// ============================================================================

/**
 * Generate ARIA props for expandable sections
 */
export function getExpandableProps(
  id: string,
  isExpanded: boolean
): {
  trigger: {
    'aria-expanded': boolean;
    'aria-controls': string;
  };
  content: {
    id: string;
    role: 'region';
    'aria-labelledby': string;
  };
} {
  const triggerId = `${id}-trigger`;
  const contentId = `${id}-content`;

  return {
    trigger: {
      'aria-expanded': isExpanded,
      'aria-controls': contentId,
    },
    content: {
      id: contentId,
      role: 'region',
      'aria-labelledby': triggerId,
    },
  };
}

/**
 * Generate ARIA props for navigation items
 */
export function getNavItemProps(isActive: boolean) {
  return {
    'aria-current': isActive ? ('page' as const) : undefined,
  };
}

/**
 * Generate ARIA props for live regions
 */
export function getLiveRegionProps(politeness: 'polite' | 'assertive' = 'polite') {
  return {
    'aria-live': politeness,
    'aria-atomic': true,
  };
}

/**
 * Generate ARIA props for status indicators
 */
export function getStatusProps(status: string, label?: string) {
  return {
    role: 'status' as const,
    'aria-label': label || `Status: ${status}`,
  };
}

// ============================================================================
// Component Helpers
// ============================================================================

/**
 * Props for icon-only buttons (requires label)
 */
export function getIconButtonProps(label: string) {
  return {
    'aria-label': label,
    title: label,
  };
}

/**
 * Props for toggle buttons
 */
export function getToggleButtonProps(label: string, isPressed: boolean) {
  return {
    'aria-label': label,
    'aria-pressed': isPressed,
    role: 'button' as const,
  };
}

/**
 * Props for loading states
 */
export function getLoadingProps(isLoading: boolean, loadingText = 'Loading...') {
  if (!isLoading) return {};
  return {
    'aria-busy': true,
    'aria-label': loadingText,
  };
}

// ============================================================================
// Contrast Checking (Development Aid)
// ============================================================================

/**
 * Calculate relative luminance per WCAG 2.1
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(fg: string, bg: string): number {
  const parse = (hex: string) => {
    const c = hex.replace('#', '');
    return [
      parseInt(c.substring(0, 2), 16),
      parseInt(c.substring(2, 4), 16),
      parseInt(c.substring(4, 6), 16),
    ] as const;
  };

  const [fgR, fgG, fgB] = parse(fg);
  const [bgR, bgG, bgB] = parse(bg);

  const l1 = getLuminance(fgR, fgG, fgB);
  const l2 = getLuminance(bgR, bgG, bgB);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA
 */
export function meetsWCAGAA(
  fg: string,
  bg: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(fg, bg);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}
