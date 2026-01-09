/**
 * FTUE Accessibility Hooks
 *
 * Hooks for building accessible text-mode FTUE experiences:
 * - useReducedMotion: Respect prefers-reduced-motion media query
 * - useKeyboardNavigation: Arrow key and Enter/Escape navigation
 * - useFocusManagement: Proper focus management for screen readers
 */

export { useReducedMotion } from './useReducedMotion'
export {
  useKeyboardNavigation,
  useFocusManagement,
  type KeyboardNavigationOptions,
} from './useKeyboardNavigation'
