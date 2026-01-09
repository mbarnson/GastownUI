import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const variantStyles = {
  primary: `
    bg-blue-600 text-white border-blue-600
    hover:bg-blue-500 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/25
    active:bg-blue-700 active:border-blue-700
    focus-visible:ring-blue-500
  `,
  secondary: `
    bg-[var(--app-surface)] text-[var(--app-text)] border-[var(--app-border)]
    hover:bg-[var(--app-surface-alt)] hover:border-[var(--app-border-strong)]
    active:bg-[var(--app-surface-deep)]
    focus-visible:ring-[var(--app-border-strong)]
  `,
  outline: `
    bg-transparent text-[var(--app-text)] border-[var(--app-border)]
    hover:bg-[var(--app-surface)] hover:border-[var(--app-border-strong)]
    active:bg-[var(--app-surface-alt)]
    focus-visible:ring-[var(--app-border-strong)]
  `,
  ghost: `
    bg-transparent text-[var(--app-text-muted)] border-transparent
    hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]
    active:bg-[var(--app-surface-alt)]
    focus-visible:ring-[var(--app-border)]
  `,
  danger: `
    bg-red-600 text-white border-red-600
    hover:bg-red-500 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/25
    active:bg-red-700 active:border-red-700
    focus-visible:ring-red-500
  `,
  success: `
    bg-green-600 text-white border-green-600
    hover:bg-green-500 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/25
    active:bg-green-700 active:border-green-700
    focus-visible:ring-green-500
  `,
}

const sizeStyles = {
  xs: 'min-h-[1.75rem] min-w-[1.75rem] px-2 py-1 text-xs gap-1 rounded',
  sm: 'min-h-[2rem] min-w-[2rem] px-3 py-1.5 text-sm gap-1.5 rounded-md',
  md: 'min-h-[2.5rem] min-w-[2.5rem] px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'min-h-[2.75rem] min-w-[2.75rem] px-5 py-2.5 text-base gap-2 rounded-lg',
  xl: 'min-h-[3rem] min-w-[3rem] px-6 py-3 text-lg gap-2.5 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
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
          font-medium border
          transition-all duration-200 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          focus-visible:ring-offset-[var(--app-bg)]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <LoadingSpinner size={size} />
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span className="flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="truncate">{children}</span>
        {!loading && icon && iconPosition === 'right' && (
          <span className="flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

function LoadingSpinner({ size }: { size: ButtonProps['size'] }) {
  const spinnerSize = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-5 h-5',
  }

  return (
    <span
      className={`${spinnerSize[size || 'md']} border-2 border-current border-t-transparent rounded-full animate-spin`}
      aria-hidden="true"
    />
  )
}

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'iconPosition'> {
  icon: ReactNode
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className = '', ...props }, ref) => {
    const iconOnlySize = {
      xs: 'min-h-[1.75rem] min-w-[1.75rem] p-1',
      sm: 'min-h-[2rem] min-w-[2rem] p-1.5',
      md: 'min-h-[2.5rem] min-w-[2.5rem] p-2',
      lg: 'min-h-[2.75rem] min-w-[2.75rem] p-2.5',
      xl: 'min-h-[3rem] min-w-[3rem] p-3',
    }

    return (
      <Button
        ref={ref}
        size={size}
        className={`${iconOnlySize[size]} !px-0 ${className}`}
        {...props}
      >
        {icon}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'

export interface ButtonGroupProps {
  children: ReactNode
  className?: string
}

export function ButtonGroup({ children, className = '' }: ButtonGroupProps) {
  return (
    <div
      className={`inline-flex rounded-lg overflow-hidden divide-x divide-[var(--app-border)] ${className}`}
      role="group"
    >
      {children}
    </div>
  )
}
