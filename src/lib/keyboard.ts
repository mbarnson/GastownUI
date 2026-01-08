/**
 * Keyboard Shortcuts System
 *
 * Provides a centralized keyboard shortcut registration and handling system.
 * Supports modifier keys, key sequences, and scope-based shortcuts.
 */

import { useEffect, useCallback, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Display name for the shortcut */
  name: string;
  /** Description of what the shortcut does */
  description: string;
  /** Key combination (e.g., 'cmd+k', 'ctrl+shift+p') */
  keys: string;
  /** Callback to execute when shortcut is triggered */
  action: () => void;
  /** Optional scope to limit when shortcut is active */
  scope?: string;
  /** Whether the shortcut is currently enabled */
  enabled?: boolean;
  /** Category for grouping in command palette */
  category?: string;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: KeyboardShortcut[];
}

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detect if running on macOS
 */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform?.toLowerCase().includes('mac') || false;
}

/**
 * Get the modifier key name for the current platform
 */
export function getModifierKey(): 'Cmd' | 'Ctrl' {
  return isMac() ? 'Cmd' : 'Ctrl';
}

/**
 * Format a key combination for display
 */
export function formatShortcut(keys: string): string {
  const mac = isMac();

  return keys
    .split('+')
    .map((key) => {
      const lower = key.toLowerCase();
      switch (lower) {
        case 'cmd':
        case 'meta':
          return mac ? '⌘' : 'Ctrl';
        case 'ctrl':
          return mac ? '⌃' : 'Ctrl';
        case 'alt':
          return mac ? '⌥' : 'Alt';
        case 'shift':
          return mac ? '⇧' : 'Shift';
        case 'enter':
          return '↵';
        case 'escape':
        case 'esc':
          return 'Esc';
        case 'backspace':
          return '⌫';
        case 'delete':
          return '⌦';
        case 'tab':
          return '⇥';
        case 'arrowup':
        case 'up':
          return '↑';
        case 'arrowdown':
        case 'down':
          return '↓';
        case 'arrowleft':
        case 'left':
          return '←';
        case 'arrowright':
        case 'right':
          return '→';
        case 'space':
          return '␣';
        default:
          return key.toUpperCase();
      }
    })
    .join(mac ? '' : '+');
}

// ============================================================================
// Key Matching
// ============================================================================

/**
 * Parse a key combination string into components
 */
function parseKeyCombo(keys: string): {
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
} {
  const parts = keys.toLowerCase().split('+');
  const key = parts[parts.length - 1];

  return {
    ctrl: parts.includes('ctrl'),
    meta: parts.includes('cmd') || parts.includes('meta'),
    alt: parts.includes('alt') || parts.includes('option'),
    shift: parts.includes('shift'),
    key,
  };
}

/**
 * Check if a keyboard event matches a shortcut
 */
function matchesShortcut(event: KeyboardEvent, keys: string): boolean {
  const combo = parseKeyCombo(keys);
  const eventKey = event.key.toLowerCase();

  // Handle special keys
  const keyMatches =
    eventKey === combo.key ||
    (combo.key === 'escape' && eventKey === 'escape') ||
    (combo.key === 'esc' && eventKey === 'escape') ||
    (combo.key === 'enter' && eventKey === 'enter') ||
    (combo.key === 'space' && eventKey === ' ') ||
    (combo.key === 'up' && eventKey === 'arrowup') ||
    (combo.key === 'down' && eventKey === 'arrowdown') ||
    (combo.key === 'left' && eventKey === 'arrowleft') ||
    (combo.key === 'right' && eventKey === 'arrowright');

  if (!keyMatches) return false;

  // Check modifiers - on Mac, cmd maps to metaKey; on Windows/Linux, ctrl maps to ctrlKey
  const mac = isMac();

  if (combo.meta) {
    if (mac && !event.metaKey) return false;
    if (!mac && !event.ctrlKey) return false;
  }

  if (combo.ctrl && !event.ctrlKey) return false;
  if (combo.alt && !event.altKey) return false;
  if (combo.shift && !event.shiftKey) return false;

  // Make sure we're not matching extra modifiers
  if (!combo.meta && !combo.ctrl && (event.metaKey || event.ctrlKey)) return false;
  if (!combo.alt && event.altKey) return false;
  if (!combo.shift && event.shiftKey) return false;

  return true;
}

// ============================================================================
// Shortcut Registry
// ============================================================================

class ShortcutRegistry {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private listeners: Set<() => void> = new Set();
  private currentScope: string = 'global';

  register(shortcut: KeyboardShortcut): () => void {
    this.shortcuts.set(shortcut.id, { ...shortcut, enabled: shortcut.enabled ?? true });
    this.notifyListeners();

    return () => {
      this.shortcuts.delete(shortcut.id);
      this.notifyListeners();
    };
  }

  unregister(id: string): void {
    this.shortcuts.delete(id);
    this.notifyListeners();
  }

  setScope(scope: string): void {
    this.currentScope = scope;
  }

  getScope(): string {
    return this.currentScope;
  }

  getAll(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getEnabled(): KeyboardShortcut[] {
    return this.getAll().filter(
      (s) => s.enabled !== false && (!s.scope || s.scope === this.currentScope || s.scope === 'global')
    );
  }

  getByCategory(): ShortcutGroup[] {
    const categories = new Map<string, KeyboardShortcut[]>();

    for (const shortcut of this.getEnabled()) {
      const category = shortcut.category || 'General';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(shortcut);
    }

    return Array.from(categories.entries()).map(([name, shortcuts]) => ({
      name,
      shortcuts,
    }));
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    // Don't handle shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape to work in inputs
      if (event.key !== 'Escape') {
        return false;
      }
    }

    for (const shortcut of this.getEnabled()) {
      if (matchesShortcut(event, shortcut.keys)) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
        return true;
      }
    }

    return false;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// Global registry instance
export const shortcutRegistry = new ShortcutRegistry();

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to register a keyboard shortcut
 */
export function useKeyboardShortcut(
  shortcut: Omit<KeyboardShortcut, 'id'> & { id?: string }
): void {
  useEffect(() => {
    const id = shortcut.id || `shortcut-${shortcut.keys}-${Date.now()}`;
    const unregister = shortcutRegistry.register({ ...shortcut, id });
    return unregister;
  }, [shortcut.keys, shortcut.enabled, shortcut.scope]);
}

/**
 * Hook to register multiple shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Array<Omit<KeyboardShortcut, 'id'> & { id?: string }>
): void {
  useEffect(() => {
    const unregisters = shortcuts.map((shortcut) => {
      const id = shortcut.id || `shortcut-${shortcut.keys}-${Date.now()}`;
      return shortcutRegistry.register({ ...shortcut, id });
    });

    return () => unregisters.forEach((unregister) => unregister());
  }, [shortcuts.map((s) => s.keys).join(',')]);
}

/**
 * Hook to listen for all shortcuts (for command palette)
 */
export function useShortcuts(): KeyboardShortcut[] {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

  useEffect(() => {
    setShortcuts(shortcutRegistry.getEnabled());

    return shortcutRegistry.subscribe(() => {
      setShortcuts(shortcutRegistry.getEnabled());
    });
  }, []);

  return shortcuts;
}

/**
 * Hook to get shortcuts by category
 */
export function useShortcutGroups(): ShortcutGroup[] {
  const [groups, setGroups] = useState<ShortcutGroup[]>([]);

  useEffect(() => {
    setGroups(shortcutRegistry.getByCategory());

    return shortcutRegistry.subscribe(() => {
      setGroups(shortcutRegistry.getByCategory());
    });
  }, []);

  return groups;
}

/**
 * Hook to set up global keyboard event listener
 */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      shortcutRegistry.handleKeyDown(event);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

/**
 * Hook to set the current shortcut scope
 */
export function useShortcutScope(scope: string): void {
  useEffect(() => {
    const previousScope = shortcutRegistry.getScope();
    shortcutRegistry.setScope(scope);
    return () => shortcutRegistry.setScope(previousScope);
  }, [scope]);
}

// ============================================================================
// Default Shortcuts
// ============================================================================

/**
 * Common application shortcuts
 */
export const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, 'action'>[] = [
  {
    id: 'command-palette',
    name: 'Command Palette',
    description: 'Open command palette',
    keys: 'cmd+k',
    category: 'General',
  },
  {
    id: 'search',
    name: 'Search',
    description: 'Focus search input',
    keys: 'cmd+/',
    category: 'General',
  },
  {
    id: 'go-home',
    name: 'Go Home',
    description: 'Navigate to home',
    keys: 'cmd+shift+h',
    category: 'Navigation',
  },
  {
    id: 'go-dashboard',
    name: 'Go to Dashboard',
    description: 'Navigate to dashboard',
    keys: 'cmd+shift+d',
    category: 'Navigation',
  },
  {
    id: 'go-tmux',
    name: 'Go to Tmux',
    description: 'Navigate to tmux sessions',
    keys: 'cmd+t',
    category: 'Navigation',
  },
  {
    id: 'toggle-sidebar',
    name: 'Toggle Sidebar',
    description: 'Show or hide sidebar',
    keys: 'cmd+b',
    category: 'View',
  },
  {
    id: 'refresh',
    name: 'Refresh',
    description: 'Refresh current view',
    keys: 'cmd+r',
    category: 'General',
  },
  {
    id: 'close-modal',
    name: 'Close',
    description: 'Close modal or panel',
    keys: 'escape',
    category: 'General',
  },
  {
    id: 'help',
    name: 'Keyboard Shortcuts',
    description: 'Show keyboard shortcuts',
    keys: 'cmd+?',
    category: 'Help',
  },
];

// ============================================================================
// Keyboard Shortcut Display Component Props
// ============================================================================

/**
 * Props for displaying a keyboard shortcut badge
 */
export interface ShortcutBadgeProps {
  keys: string;
  className?: string;
}

/**
 * Get the display keys for a shortcut badge
 */
export function getShortcutBadgeKeys(keys: string): string[] {
  const mac = isMac();

  return keys.split('+').map((key) => {
    const lower = key.toLowerCase();
    switch (lower) {
      case 'cmd':
      case 'meta':
        return mac ? '⌘' : 'Ctrl';
      case 'ctrl':
        return mac ? '⌃' : 'Ctrl';
      case 'alt':
        return mac ? '⌥' : 'Alt';
      case 'shift':
        return mac ? '⇧' : 'Shift';
      default:
        return key.toUpperCase();
    }
  });
}
