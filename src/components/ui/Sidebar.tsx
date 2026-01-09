import { forwardRef, useEffect, useRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { X } from 'lucide-react'

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  open: boolean
  onClose: () => void
  position?: 'left' | 'right'
  width?: 'sm' | 'md' | 'lg' | 'xl'
  title?: string
  showOverlay?: boolean
}

const widthStyles = {
  sm: 'w-64',
  md: 'w-80',
  lg: 'w-96',
  xl: 'w-[28rem]',
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  (
    {
      children,
      open,
      onClose,
      position = 'left',
      width = 'md',
      title,
      showOverlay = true,
      className = '',
      ...props
    },
    ref
  ) => {
    const sidebarRef = useRef<HTMLElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
      if (open) {
        closeButtonRef.current?.focus()

        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            onClose()
          }
        }

        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'

        return () => {
          document.removeEventListener('keydown', handleEscape)
          document.body.style.overflow = ''
        }
      }
    }, [open, onClose])

    const positionStyles =
      position === 'left'
        ? `left-0 ${open ? 'translate-x-0' : '-translate-x-full'}`
        : `right-0 ${open ? 'translate-x-0' : 'translate-x-full'}`

    return (
      <>
        {showOverlay && (
          <div
            className={`
              fixed inset-0 z-40
              bg-black/50 backdrop-blur-sm
              transition-opacity duration-300
              ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
            onClick={onClose}
            aria-hidden="true"
          />
        )}

        <aside
          ref={ref || sidebarRef}
          className={`
            fixed top-0 h-full z-50
            bg-[var(--app-bg)] text-[var(--app-text)]
            border-[var(--app-border)]
            ${position === 'left' ? 'border-r' : 'border-l'}
            shadow-2xl shadow-black/20
            transform transition-transform duration-300 ease-out
            flex flex-col
            ${widthStyles[width]}
            ${positionStyles}
            ${className}
          `}
          aria-label={title || 'Sidebar'}
          aria-hidden={!open}
          {...props}
        >
          {title && (
            <SidebarHeader>
              <SidebarTitle>{title}</SidebarTitle>
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="
                  p-2 rounded-lg
                  text-[var(--app-text-muted)]
                  hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-blue-500
                "
                aria-label="Close sidebar"
              >
                <X size={20} />
              </button>
            </SidebarHeader>
          )}
          {children}
        </aside>
      </>
    )
  }
)

Sidebar.displayName = 'Sidebar'

export interface SidebarHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function SidebarHeader({
  children,
  className = '',
  ...props
}: SidebarHeaderProps) {
  return (
    <div
      className={`
        flex items-center justify-between p-4
        border-b border-[var(--app-border)]
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export interface SidebarTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
}

export function SidebarTitle({
  children,
  className = '',
  ...props
}: SidebarTitleProps) {
  return (
    <h2
      className={`text-lg font-semibold text-[var(--app-text)] ${className}`}
      {...props}
    >
      {children}
    </h2>
  )
}

export interface SidebarContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function SidebarContent({
  children,
  className = '',
  ...props
}: SidebarContentProps) {
  return (
    <div
      className={`flex-1 overflow-y-auto p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export interface SidebarFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function SidebarFooter({
  children,
  className = '',
  ...props
}: SidebarFooterProps) {
  return (
    <div
      className={`
        p-4 border-t border-[var(--app-border)]
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export interface SidebarNavProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

export function SidebarNav({
  children,
  className = '',
  ...props
}: SidebarNavProps) {
  return (
    <nav className={`space-y-1 ${className}`} {...props}>
      {children}
    </nav>
  )
}

export interface SidebarNavItemProps extends HTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  icon?: ReactNode
  active?: boolean
  onClick?: () => void
}

export function SidebarNavItem({
  children,
  icon,
  active = false,
  className = '',
  onClick,
  ...props
}: SidebarNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg
        text-left font-medium
        transition-colors duration-150
        ${
          active
            ? 'bg-blue-600 text-white'
            : `
              text-[var(--app-text-muted)]
              hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]
            `
        }
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-blue-500 focus-visible:ring-inset
        ${className}
      `}
      aria-current={active ? 'page' : undefined}
      {...props}
    >
      {icon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="truncate">{children}</span>
    </button>
  )
}

export interface SidebarSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  title?: string
}

export function SidebarSection({
  children,
  title,
  className = '',
  ...props
}: SidebarSectionProps) {
  return (
    <div className={`${className}`} {...props}>
      {title && (
        <h3 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--app-text-subtle)]">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
