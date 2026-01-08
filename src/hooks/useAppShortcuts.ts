/**
 * Application Keyboard Shortcuts
 *
 * Sets up all default keyboard shortcuts for the application.
 * Integrates with TanStack Router for navigation shortcuts.
 */

import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import {
  useKeyboardShortcuts,
  useGlobalShortcuts,
  type KeyboardShortcut,
} from '../lib/keyboard';

interface UseAppShortcutsOptions {
  /** Callback to toggle sidebar */
  onToggleSidebar?: () => void;
  /** Callback to open command palette */
  onOpenCommandPalette?: () => void;
  /** Callback to focus search */
  onFocusSearch?: () => void;
  /** Callback to refresh current view */
  onRefresh?: () => void;
}

/**
 * Hook to set up all application keyboard shortcuts
 */
export function useAppShortcuts(options: UseAppShortcutsOptions = {}) {
  const navigate = useNavigate();

  const {
    onToggleSidebar,
    onOpenCommandPalette,
    onFocusSearch,
    onRefresh,
  } = options;

  // Navigation shortcuts
  const goHome = useCallback(() => {
    navigate({ to: '/' });
  }, [navigate]);

  const goDashboard = useCallback(() => {
    navigate({ to: '/dashboard' });
  }, [navigate]);

  const goTmux = useCallback(() => {
    navigate({ to: '/tmux' });
  }, [navigate]);

  // Build shortcuts array
  const shortcuts: Omit<KeyboardShortcut, 'id'>[] = [
    // Navigation
    {
      name: 'Go Home',
      description: 'Navigate to home page',
      keys: 'cmd+shift+h',
      action: goHome,
      category: 'Navigation',
    },
    {
      name: 'Go to Dashboard',
      description: 'Navigate to Gas Town dashboard',
      keys: 'cmd+shift+d',
      action: goDashboard,
      category: 'Navigation',
    },
    {
      name: 'Go to Tmux',
      description: 'Navigate to tmux sessions',
      keys: 'cmd+t',
      action: goTmux,
      category: 'Navigation',
    },
  ];

  // Add optional shortcuts
  if (onToggleSidebar) {
    shortcuts.push({
      name: 'Toggle Sidebar',
      description: 'Show or hide the navigation sidebar',
      keys: 'cmd+b',
      action: onToggleSidebar,
      category: 'View',
    });
  }

  if (onOpenCommandPalette) {
    shortcuts.push({
      name: 'Command Palette',
      description: 'Open command palette',
      keys: 'cmd+k',
      action: onOpenCommandPalette,
      category: 'General',
    });
  }

  if (onFocusSearch) {
    shortcuts.push({
      name: 'Search',
      description: 'Focus the search input',
      keys: 'cmd+/',
      action: onFocusSearch,
      category: 'General',
    });
  }

  if (onRefresh) {
    shortcuts.push({
      name: 'Refresh',
      description: 'Refresh the current view',
      keys: 'cmd+r',
      action: onRefresh,
      category: 'General',
    });
  }

  // Register shortcuts
  useKeyboardShortcuts(shortcuts);

  // Set up global keyboard listener
  useGlobalShortcuts();

  return {
    goHome,
    goDashboard,
    goTmux,
  };
}

/**
 * Hook to set up keyboard shortcuts for modals/dialogs
 */
export function useModalShortcuts(options: {
  onClose: () => void;
  onConfirm?: () => void;
  enabled?: boolean;
}) {
  const { onClose, onConfirm, enabled = true } = options;

  const shortcuts: Omit<KeyboardShortcut, 'id'>[] = [
    {
      name: 'Close',
      description: 'Close the modal',
      keys: 'escape',
      action: onClose,
      enabled,
      scope: 'modal',
      category: 'Modal',
    },
  ];

  if (onConfirm) {
    shortcuts.push({
      name: 'Confirm',
      description: 'Confirm the action',
      keys: 'cmd+enter',
      action: onConfirm,
      enabled,
      scope: 'modal',
      category: 'Modal',
    });
  }

  useKeyboardShortcuts(shortcuts);
}

/**
 * Hook to set up keyboard shortcuts for lists
 */
export function useListShortcuts(options: {
  items: { id: string }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onActivate?: (index: number) => void;
  enabled?: boolean;
}) {
  const { items, selectedIndex, onSelect, onActivate, enabled = true } = options;

  const moveUp = useCallback(() => {
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
    onSelect(newIndex);
  }, [selectedIndex, items.length, onSelect]);

  const moveDown = useCallback(() => {
    const newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
    onSelect(newIndex);
  }, [selectedIndex, items.length, onSelect]);

  const activate = useCallback(() => {
    if (onActivate && selectedIndex >= 0 && selectedIndex < items.length) {
      onActivate(selectedIndex);
    }
  }, [selectedIndex, items.length, onActivate]);

  const shortcuts: Omit<KeyboardShortcut, 'id'>[] = [
    {
      name: 'Move Up',
      description: 'Select previous item',
      keys: 'up',
      action: moveUp,
      enabled,
      category: 'List Navigation',
    },
    {
      name: 'Move Down',
      description: 'Select next item',
      keys: 'down',
      action: moveDown,
      enabled,
      category: 'List Navigation',
    },
    {
      name: 'Move Up (Alt)',
      description: 'Select previous item',
      keys: 'k',
      action: moveUp,
      enabled,
      category: 'List Navigation',
    },
    {
      name: 'Move Down (Alt)',
      description: 'Select next item',
      keys: 'j',
      action: moveDown,
      enabled,
      category: 'List Navigation',
    },
  ];

  if (onActivate) {
    shortcuts.push({
      name: 'Activate',
      description: 'Activate selected item',
      keys: 'enter',
      action: activate,
      enabled,
      category: 'List Navigation',
    });
  }

  useKeyboardShortcuts(shortcuts);

  return {
    moveUp,
    moveDown,
    activate,
  };
}
