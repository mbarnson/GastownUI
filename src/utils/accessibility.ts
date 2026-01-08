/**
 * Accessibility utilities for Android TalkBack and screen reader support
 */

/**
 * Generate a content description for screen readers
 * Follows Android TalkBack best practices
 */
export function generateContentDescription(
  label: string,
  state?: string,
  hint?: string
): string {
  const parts: string[] = [label]

  if (state) {
    parts.push(state)
  }

  if (hint) {
    parts.push(hint)
  }

  return parts.join('. ')
}

/**
 * Generate ARIA props for interactive elements
 */
export interface AriaProps {
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-pressed'?: boolean
  'aria-selected'?: boolean
  'aria-disabled'?: boolean
  'aria-busy'?: boolean
  'aria-live'?: 'polite' | 'assertive' | 'off'
  'aria-atomic'?: boolean
  role?: string
}

export function generateAriaProps(options: {
  label: string
  description?: string
  descriptionId?: string
  expanded?: boolean
  pressed?: boolean
  selected?: boolean
  disabled?: boolean
  busy?: boolean
  live?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  role?: string
}): AriaProps {
  const props: AriaProps = {
    'aria-label': options.label,
  }

  if (options.descriptionId) {
    props['aria-describedby'] = options.descriptionId
  }

  if (options.expanded !== undefined) {
    props['aria-expanded'] = options.expanded
  }

  if (options.pressed !== undefined) {
    props['aria-pressed'] = options.pressed
  }

  if (options.selected !== undefined) {
    props['aria-selected'] = options.selected
  }

  if (options.disabled !== undefined) {
    props['aria-disabled'] = options.disabled
  }

  if (options.busy !== undefined) {
    props['aria-busy'] = options.busy
  }

  if (options.live) {
    props['aria-live'] = options.live
  }

  if (options.atomic !== undefined) {
    props['aria-atomic'] = options.atomic
  }

  if (options.role) {
    props.role = options.role
  }

  return props
}

/**
 * Status descriptions for screen readers
 */
export const statusDescriptions = {
  loading: 'Loading, please wait',
  success: 'Operation completed successfully',
  error: 'An error occurred',
  warning: 'Warning',
  info: 'Information',

  // Work statuses
  in_progress: 'In progress',
  completed: 'Completed',
  pending: 'Pending',
  blocked: 'Blocked, waiting for dependencies',
  queued: 'Queued for processing',

  // Agent statuses
  active: 'Agent is active and working',
  idle: 'Agent is idle and ready',
  stuck: 'Agent is stuck and may need attention',
  completing: 'Agent is completing work',
}

/**
 * Get accessible status description
 */
export function getStatusDescription(status: string): string {
  return statusDescriptions[status as keyof typeof statusDescriptions] || status
}

/**
 * Format count for screen readers
 * e.g., "3 items" or "1 item"
 */
export function formatCountForScreenReader(count: number, singular: string, plural?: string): string {
  const pluralForm = plural || `${singular}s`
  return count === 1 ? `${count} ${singular}` : `${count} ${pluralForm}`
}

/**
 * Generate announcement text for live regions
 */
export function generateAnnouncement(
  action: 'added' | 'removed' | 'updated' | 'completed' | 'started' | 'failed',
  itemType: string,
  itemName?: string
): string {
  const templates = {
    added: itemName ? `${itemType} ${itemName} added` : `${itemType} added`,
    removed: itemName ? `${itemType} ${itemName} removed` : `${itemType} removed`,
    updated: itemName ? `${itemType} ${itemName} updated` : `${itemType} updated`,
    completed: itemName ? `${itemType} ${itemName} completed` : `${itemType} completed`,
    started: itemName ? `${itemType} ${itemName} started` : `${itemType} started`,
    failed: itemName ? `${itemType} ${itemName} failed` : `${itemType} failed`,
  }

  return templates[action]
}

/**
 * Generate navigation hints for explore by touch
 */
export function getNavigationHint(
  elementType: 'button' | 'link' | 'input' | 'checkbox' | 'toggle' | 'list' | 'listitem',
  action?: string
): string {
  const hints = {
    button: action ? `Double tap to ${action}` : 'Double tap to activate',
    link: action ? `Double tap to ${action}` : 'Double tap to open',
    input: 'Double tap to edit',
    checkbox: 'Double tap to toggle',
    toggle: 'Double tap to toggle',
    list: 'Swipe to explore items',
    listitem: action ? `Double tap to ${action}` : 'Double tap to select',
  }

  return hints[elementType]
}

/**
 * Check if reduced motion is preferred (for announcements timing)
 */
export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Announcement delay based on motion preference
 */
export function getAnnouncementDelay(): number {
  return shouldReduceMotion() ? 0 : 300
}
