import { type ReactNode, type HTMLAttributes, forwardRef } from 'react'
import {
  generateContentDescription,
  generateAriaProps,
  getNavigationHint,
} from '../../utils/accessibility'

interface AccessibleElementProps extends HTMLAttributes<HTMLElement> {
  /** The element type to render */
  as?: 'div' | 'span' | 'button' | 'a' | 'section' | 'article' | 'nav' | 'main' | 'aside'
  /** Primary label for screen readers */
  label: string
  /** Current state description (e.g., "expanded", "3 of 5") */
  state?: string
  /** Hint for how to interact with the element */
  hint?: string
  /** Element type for navigation hints */
  elementType?: 'button' | 'link' | 'input' | 'checkbox' | 'toggle' | 'list' | 'listitem'
  /** Custom action description for hint */
  action?: string
  /** Whether element is expanded (for collapsible content) */
  expanded?: boolean
  /** Whether element is pressed (for toggle buttons) */
  pressed?: boolean
  /** Whether element is selected */
  selected?: boolean
  /** Whether element is disabled */
  disabled?: boolean
  /** Whether element is loading/busy */
  busy?: boolean
  /** Live region politeness */
  live?: 'polite' | 'assertive' | 'off'
  /** ARIA role override */
  role?: string
  /** ID for description element */
  descriptionId?: string
  /** Children */
  children: ReactNode
}

/**
 * Wrapper component that adds comprehensive accessibility attributes
 * for Android TalkBack and other screen readers
 */
const AccessibleElement = forwardRef<HTMLElement, AccessibleElementProps>(
  (
    {
      as: Component = 'div',
      label,
      state,
      hint,
      elementType,
      action,
      expanded,
      pressed,
      selected,
      disabled,
      busy,
      live,
      role,
      descriptionId,
      children,
      className,
      ...props
    },
    ref
  ) => {
    // Generate content description
    const contentDescription = generateContentDescription(
      label,
      state,
      hint || (elementType ? getNavigationHint(elementType, action) : undefined)
    )

    // Generate ARIA props
    const ariaProps = generateAriaProps({
      label: contentDescription,
      descriptionId,
      expanded,
      pressed,
      selected,
      disabled,
      busy,
      live,
      role,
    })

    const ElementComponent = Component as keyof JSX.IntrinsicElements

    return (
      <ElementComponent
        ref={ref as never}
        className={className}
        {...ariaProps}
        {...props}
      >
        {children}
      </ElementComponent>
    )
  }
)

AccessibleElement.displayName = 'AccessibleElement'

export default AccessibleElement

/**
 * Hidden description element for aria-describedby
 */
export function AccessibleDescription({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  return (
    <span
      id={id}
      className="sr-only"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </span>
  )
}

/**
 * Skip link for keyboard navigation
 */
export function SkipLink({
  href,
  children = 'Skip to main content',
}: {
  href: string
  children?: ReactNode
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
    >
      {children}
    </a>
  )
}
