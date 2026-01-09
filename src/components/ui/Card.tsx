import { forwardRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
  loading?: boolean
}

const variantStyles = {
  default: `
    bg-[var(--app-surface)] border-[var(--app-border)]
  `,
  elevated: `
    bg-[var(--app-surface)] border-transparent
    shadow-lg shadow-black/10
  `,
  outlined: `
    bg-transparent border-[var(--app-border)]
  `,
  ghost: `
    bg-transparent border-transparent
  `,
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      interactive = false,
      loading = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const interactiveStyles = interactive
      ? `
        cursor-pointer
        transition-all duration-200 ease-out
        hover:border-[var(--app-border-strong)]
        hover:shadow-md hover:shadow-black/5
        hover:-translate-y-0.5
        active:translate-y-0 active:shadow-sm
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-blue-500 focus-visible:ring-offset-2
        focus-visible:ring-offset-[var(--app-bg)]
      `
      : ''

    if (loading) {
      return (
        <div
          ref={ref}
          className={`
            rounded-xl border
            ${variantStyles[variant]}
            ${paddingStyles[padding]}
            ${className}
          `}
          aria-busy="true"
          {...props}
        >
          <CardSkeleton padding={padding} />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        className={`
          rounded-xl border
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${interactiveStyles}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  actions?: ReactNode
}

export function CardHeader({
  children,
  actions,
  className = '',
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${className}`}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  )
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export function CardTitle({
  children,
  as: Tag = 'h3',
  className = '',
  ...props
}: CardTitleProps) {
  return (
    <Tag
      className={`text-lg font-semibold text-[var(--app-text)] ${className}`}
      {...props}
    >
      {children}
    </Tag>
  )
}

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
}

export function CardDescription({
  children,
  className = '',
  ...props
}: CardDescriptionProps) {
  return (
    <p
      className={`text-sm text-[var(--app-text-muted)] mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  )
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardContent({
  children,
  className = '',
  ...props
}: CardContentProps) {
  return (
    <div className={`mt-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardFooter({
  children,
  className = '',
  ...props
}: CardFooterProps) {
  return (
    <div
      className={`
        flex items-center justify-end gap-3 mt-4 pt-4
        border-t border-[var(--app-border)]
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

function CardSkeleton({ padding }: { padding: CardProps['padding'] }) {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-6 rounded-full ml-auto" />
      </div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`
        bg-[var(--app-surface-alt)] rounded
        ${className}
      `}
      {...props}
    />
  )
}

export interface SkeletonTextProps {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  )
}

export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SkeletonAvatar({ size = 'md', className = '' }: SkeletonAvatarProps) {
  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  return (
    <Skeleton className={`rounded-full ${sizeStyles[size]} ${className}`} />
  )
}
