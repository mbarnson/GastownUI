import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface AccessibleButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children: ReactNode
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Size - all maintain minimum 44x44pt touch target */
  size?: 'sm' | 'md' | 'lg'
  /** Whether button is in loading state */
  loading?: boolean
  /** Icon to show before text */
  icon?: ReactNode
  /** Icon to show after text */
  iconAfter?: ReactNode
  /** Full width button */
  fullWidth?: boolean
}

const variantClasses = {
  primary:
    'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border-transparent',
  secondary:
    'bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100 border-slate-600',
  ghost:
    'bg-transparent hover:bg-slate-800 active:bg-slate-700 text-slate-300 hover:text-white border-transparent',
  danger:
    'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white border-transparent',
}

const sizeClasses = {
  // All sizes maintain minimum 44x44pt touch target
  sm: 'min-h-[2.75rem] min-w-[2.75rem] px-3 text-sm gap-1.5',
  md: 'min-h-[2.75rem] min-w-[2.75rem] px-4 text-base gap-2',
  lg: 'min-h-[3rem] min-w-[3rem] px-6 text-lg gap-2.5',
}

/**
 * Accessible button component with:
 * - Minimum 44x44pt touch targets (Apple HIG)
 * - Dynamic Type font scaling support
 * - Focus-visible ring for keyboard navigation
 * - Disabled and loading states
 * - Screen reader friendly
 *
 * @example
 * ```tsx
 * <AccessibleButton variant="primary" onClick={handleClick}>
 *   Save Changes
 * </AccessibleButton>
 *
 * <AccessibleButton variant="ghost" size="sm" icon={<Settings />}>
 *   Settings
 * </AccessibleButton>
 * ```
 */
export const AccessibleButton = forwardRef<
  HTMLButtonElement,
  AccessibleButtonProps
>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconAfter,
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center
          font-medium rounded-lg border
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : icon ? (
          <span className="flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="truncate">{children}</span>
        {iconAfter && !loading && (
          <span className="flex-shrink-0" aria-hidden="true">
            {iconAfter}
          </span>
        )}
      </button>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'

/**
 * Touch target wrapper for icon buttons or small clickable areas
 * Ensures minimum 44x44pt touch target around any child element
 *
 * @example
 * ```tsx
 * <TouchTarget onClick={handleClick} label="Close">
 *   <X className="w-5 h-5" />
 * </TouchTarget>
 * ```
 */
export interface TouchTargetProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  /** Accessible label for screen readers */
  label: string
}

export const TouchTarget = forwardRef<HTMLButtonElement, TouchTargetProps>(
  ({ children, label, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        className={`
          touch-target
          rounded-lg
          text-slate-400 hover:text-white
          hover:bg-slate-800 active:bg-slate-700
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)

TouchTarget.displayName = 'TouchTarget'

/**
 * Accessible icon button - convenience wrapper around TouchTarget
 *
 * @example
 * ```tsx
 * <IconButton icon={<Settings />} label="Open settings" onClick={handleClick} />
 * ```
 */
export interface IconButtonProps
  extends Omit<TouchTargetProps, 'children'> {
  icon: ReactNode
  /** Size variant - maintains touch target minimum */
  size?: 'sm' | 'md' | 'lg'
}

const iconSizeClasses = {
  sm: 'min-h-[2.5rem] min-w-[2.5rem]', // 40px - slightly smaller for dense UIs
  md: 'min-h-[2.75rem] min-w-[2.75rem]', // 44px
  lg: 'min-h-[3rem] min-w-[3rem]', // 48px
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className = '', ...props }, ref) => {
    return (
      <TouchTarget
        ref={ref}
        className={`${iconSizeClasses[size]} ${className}`}
        {...props}
      >
        {icon}
      </TouchTarget>
    )
  }
)

IconButton.displayName = 'IconButton'

/**
 * Text with truncation that reveals full content on focus/hover
 * Meets accessibility requirement for full-text visibility
 *
 * @example
 * ```tsx
 * <TruncatedText fullText="This is a very long text that will be truncated">
 *   This is a very long text...
 * </TruncatedText>
 * ```
 */
export interface TruncatedTextProps {
  children: ReactNode
  /** Full text content for tooltip/reveal */
  fullText: string
  /** Additional CSS classes */
  className?: string
  /** Max width constraint */
  maxWidth?: string
}

export function TruncatedText({
  children,
  fullText,
  className = '',
  maxWidth = '100%',
}: TruncatedTextProps) {
  return (
    <span
      className={`truncate-tooltip block ${className}`}
      style={{ maxWidth }}
      data-full-text={fullText}
      tabIndex={0}
      role="text"
    >
      {children}
    </span>
  )
}
