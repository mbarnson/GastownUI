/**
 * Animation components for GastownUI
 *
 * All animations respect prefers-reduced-motion and the app's calm mode setting.
 */

export { PageTransition, FadeTransition, StaggerChildren } from './PageTransition'
export type {
  PageTransitionProps,
  FadeTransitionProps,
  StaggerChildrenProps,
} from './PageTransition'

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  Spinner,
  ProgressIndeterminate,
  PulseIndicator,
  LoadingOverlay,
  LoadingContent,
} from './LoadingStates'
export type {
  SkeletonProps,
  SkeletonTextProps,
  SkeletonCardProps,
  SpinnerProps,
  ProgressIndeterminateProps,
  PulseIndicatorProps,
  LoadingOverlayProps,
  LoadingContentProps,
} from './LoadingStates'
