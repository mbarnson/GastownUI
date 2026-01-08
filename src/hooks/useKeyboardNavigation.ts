import { useEffect, useCallback, useRef, RefObject } from 'react';

/**
 * Keyboard navigation hook for list/grid navigation
 * Implements ARIA-compliant keyboard patterns
 */
export function useArrowNavigation<T extends HTMLElement>(
  items: RefObject<T | null>[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    onSelect?: (index: number) => void;
  } = {}
) {
  const { orientation = 'vertical', loop = true, onSelect } = options;
  const currentIndex = useRef(0);

  const focusItem = useCallback((index: number) => {
    const item = items[index]?.current;
    if (item) {
      item.focus();
      currentIndex.current = index;
    }
  }, [items]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const total = items.length;
    if (total === 0) return;

    let nextIndex = currentIndex.current;
    let handled = false;

    switch (event.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = loop
            ? (currentIndex.current + 1) % total
            : Math.min(currentIndex.current + 1, total - 1);
          handled = true;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          nextIndex = loop
            ? (currentIndex.current - 1 + total) % total
            : Math.max(currentIndex.current - 1, 0);
          handled = true;
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = loop
            ? (currentIndex.current + 1) % total
            : Math.min(currentIndex.current + 1, total - 1);
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          nextIndex = loop
            ? (currentIndex.current - 1 + total) % total
            : Math.max(currentIndex.current - 1, 0);
          handled = true;
        }
        break;
      case 'Home':
        nextIndex = 0;
        handled = true;
        break;
      case 'End':
        nextIndex = total - 1;
        handled = true;
        break;
      case 'Enter':
      case ' ':
        if (onSelect) {
          onSelect(currentIndex.current);
          handled = true;
        }
        break;
    }

    if (handled) {
      event.preventDefault();
      focusItem(nextIndex);
    }
  }, [items.length, orientation, loop, onSelect, focusItem]);

  return {
    handleKeyDown,
    focusItem,
    currentIndex: currentIndex.current,
  };
}

/**
 * Hook for Escape key to close panels/modals
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, enabled]);
}

/**
 * Hook to trap focus within a container (for modals)
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element on mount
    firstElement?.focus();

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, enabled]);
}

/**
 * Hook to announce changes to screen readers
 */
export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    let announcer = document.getElementById('sr-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'sr-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      document.body.appendChild(announcer);
    }
    announceRef.current = announcer as HTMLDivElement;

    return () => {
      // Don't remove on unmount as other components might use it
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      // Clear after delay to allow repeated announcements
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return announce;
}
