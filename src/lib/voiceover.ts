/**
 * VoiceOver Support Utilities
 *
 * Provides screen reader announcements, focus management, and
 * VoiceOver-specific accessibility features.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// ============================================================================
// Live Region Announcer
// ============================================================================

/**
 * Global live region element for announcements
 */
let announcer: HTMLElement | null = null;
let politeAnnouncer: HTMLElement | null = null;

/**
 * Initialize the announcement system (call once at app startup)
 */
export function initAnnouncer(): void {
  if (typeof document === 'undefined') return;

  // Assertive announcer for important updates
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.setAttribute('role', 'alert');
    announcer.setAttribute('aria-live', 'assertive');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText =
      'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
    document.body.appendChild(announcer);
  }

  // Polite announcer for non-critical updates
  if (!politeAnnouncer) {
    politeAnnouncer = document.createElement('div');
    politeAnnouncer.setAttribute('role', 'status');
    politeAnnouncer.setAttribute('aria-live', 'polite');
    politeAnnouncer.setAttribute('aria-atomic', 'true');
    politeAnnouncer.className = 'sr-only';
    politeAnnouncer.style.cssText =
      'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
    document.body.appendChild(politeAnnouncer);
  }
}

/**
 * Announce a message to screen readers
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const target = priority === 'assertive' ? announcer : politeAnnouncer;

  if (!target) {
    initAnnouncer();
    return announce(message, priority);
  }

  // Clear and re-announce to ensure VoiceOver picks it up
  target.textContent = '';
  requestAnimationFrame(() => {
    target.textContent = message;
  });
}

/**
 * Announce convoy progress changes
 */
export function announceConvoyProgress(
  convoyName: string,
  progress: number,
  previousProgress?: number
): void {
  if (progress === 100) {
    announce(`Convoy ${convoyName} completed!`, 'assertive');
  } else if (previousProgress !== undefined && progress - previousProgress >= 10) {
    announce(`Convoy ${convoyName} is now ${progress}% complete`, 'polite');
  }
}

/**
 * Announce status changes
 */
export function announceStatusChange(
  entityType: 'polecat' | 'rig' | 'convoy' | 'bead',
  entityName: string,
  newStatus: string
): void {
  const message = `${entityType} ${entityName} is now ${newStatus}`;
  announce(message, 'polite');
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to initialize the announcer on mount
 */
export function useAnnouncerInit(): void {
  useEffect(() => {
    initAnnouncer();
  }, []);
}

/**
 * Hook to announce a value when it changes
 */
export function useAnnounceOnChange<T>(
  value: T,
  getMessage: (value: T, prev: T | undefined) => string | null,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const prevRef = useRef<T>();

  useEffect(() => {
    const message = getMessage(value, prevRef.current);
    if (message) {
      announce(message, priority);
    }
    prevRef.current = value;
  }, [value, getMessage, priority]);
}

/**
 * Hook to announce convoy progress changes
 */
export function useConvoyProgressAnnouncer(
  convoys: Array<{ id: string; name: string; progress: number }> | undefined
): void {
  const prevProgressRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!convoys) return;

    for (const convoy of convoys) {
      const prev = prevProgressRef.current.get(convoy.id);

      if (prev !== undefined && convoy.progress !== prev) {
        announceConvoyProgress(convoy.name, convoy.progress, prev);
      }

      prevProgressRef.current.set(convoy.id, convoy.progress);
    }
  }, [convoys]);
}

/**
 * Hook for managing focus within a component
 */
export function useFocusManagement() {
  const containerRef = useRef<HTMLElement>(null);

  const focusFirst = useCallback(() => {
    if (!containerRef.current) return;

    const focusable = containerRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();
  }, []);

  const focusLast = useCallback(() => {
    if (!containerRef.current) return;

    const focusables = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusables[focusables.length - 1]?.focus();
  }, []);

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (!containerRef.current || event.key !== 'Tab') return;

    const focusables = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  return {
    containerRef,
    focusFirst,
    focusLast,
    trapFocus,
  };
}

// ============================================================================
// VoiceOver Rotor Actions
// ============================================================================

/**
 * Props for elements with custom rotor actions
 */
export interface RotorActionProps {
  'data-rotor-action'?: string;
  'data-rotor-label'?: string;
}

/**
 * Create props for a custom rotor action
 * VoiceOver users can access these via the Actions rotor
 */
export function createRotorAction(
  action: string,
  label: string
): RotorActionProps {
  return {
    'data-rotor-action': action,
    'data-rotor-label': label,
  };
}

// ============================================================================
// Accessible Descriptions
// ============================================================================

/**
 * Generate a comprehensive description for a convoy
 */
export function getConvoyDescription(convoy: {
  name: string;
  progress: number;
  status: string;
  beads: string[];
  active_polecats: number;
  eta?: string;
}): string {
  const parts = [
    `Convoy ${convoy.name}`,
    `${convoy.progress}% complete`,
    `Status: ${convoy.status}`,
    `${convoy.beads.length} beads`,
    `${convoy.active_polecats} active polecats`,
  ];

  if (convoy.eta) {
    parts.push(`Estimated completion: ${convoy.eta}`);
  }

  return parts.join('. ');
}

/**
 * Generate a description for a rig
 */
export function getRigDescription(rig: {
  name: string;
  polecats: Array<{ status: string }>;
  beads_count: { open: number; in_progress: number; closed: number; blocked: number };
}): string {
  const activePolecats = rig.polecats.filter((p) => p.status === 'active').length;
  return [
    `Rig ${rig.name}`,
    `${rig.polecats.length} polecats, ${activePolecats} active`,
    `${rig.beads_count.in_progress} beads in progress`,
    `${rig.beads_count.closed} closed`,
    rig.beads_count.blocked > 0 ? `${rig.beads_count.blocked} blocked` : null,
  ]
    .filter(Boolean)
    .join('. ');
}

/**
 * Generate a description for an activity item
 */
export function getActivityDescription(item: {
  type: string;
  message: string;
  timestamp: string;
  actor?: string;
}): string {
  const time = new Date(item.timestamp).toLocaleTimeString();
  return `${time}: ${item.message}${item.actor ? `, by ${item.actor}` : ''}`;
}

// ============================================================================
// Focus Order Utilities
// ============================================================================

/**
 * Landmark roles for skip navigation
 */
export const LANDMARK_ROLES = {
  main: 'main',
  navigation: 'navigation',
  search: 'search',
  complementary: 'complementary',
  contentinfo: 'contentinfo',
  banner: 'banner',
  region: 'region',
} as const;

/**
 * Generate landmark props
 */
export function getLandmarkProps(
  role: keyof typeof LANDMARK_ROLES,
  label: string
): { role: string; 'aria-label': string } {
  return {
    role: LANDMARK_ROLES[role],
    'aria-label': label,
  };
}

// ============================================================================
// Status Change Tracking
// ============================================================================

/**
 * Hook to track and announce status changes
 */
export function useStatusAnnouncer<T extends { id: string; status: string }>(
  items: T[] | undefined,
  getEntityName: (item: T) => string,
  entityType: 'polecat' | 'rig' | 'convoy' | 'bead'
): void {
  const prevStatusRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!items) return;

    for (const item of items) {
      const prev = prevStatusRef.current.get(item.id);

      if (prev !== undefined && item.status !== prev) {
        announceStatusChange(entityType, getEntityName(item), item.status);
      }

      prevStatusRef.current.set(item.id, item.status);
    }
  }, [items, getEntityName, entityType]);
}
