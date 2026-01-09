import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes, ReactNode } from 'react'

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode
  variant?: 'default' | 'striped' | 'bordered'
  size?: 'sm' | 'md' | 'lg'
  hoverable?: boolean
}

const variantStyles = {
  default: '',
  striped: '[&_tbody_tr:nth-child(even)]:bg-[var(--app-surface)]',
  bordered: 'border border-[var(--app-border)] [&_th]:border [&_th]:border-[var(--app-border)] [&_td]:border [&_td]:border-[var(--app-border)]',
}

const sizeStyles = {
  sm: '[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 text-sm',
  md: '[&_th]:px-4 [&_th]:py-3 [&_td]:px-4 [&_td]:py-3 text-sm',
  lg: '[&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-4 text-base',
}

export function Table({
  children,
  variant = 'default',
  size = 'md',
  hoverable = true,
  className = '',
  ...props
}: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[var(--app-border)]">
      <table
        className={`
          w-full text-left
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${hoverable ? '[&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-[var(--app-surface-alt)]' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </table>
    </div>
  )
}

export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
}

export function TableHeader({
  children,
  className = '',
  ...props
}: TableHeaderProps) {
  return (
    <thead
      className={`
        bg-[var(--app-surface)] text-[var(--app-text-muted)]
        border-b border-[var(--app-border)]
        ${className}
      `}
      {...props}
    >
      {children}
    </thead>
  )
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
}

export function TableBody({
  children,
  className = '',
  ...props
}: TableBodyProps) {
  return (
    <tbody
      className={`divide-y divide-[var(--app-border)] ${className}`}
      {...props}
    >
      {children}
    </tbody>
  )
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode
  selected?: boolean
  clickable?: boolean
}

export function TableRow({
  children,
  selected = false,
  clickable = false,
  className = '',
  ...props
}: TableRowProps) {
  return (
    <tr
      className={`
        ${selected ? 'bg-blue-500/10' : ''}
        ${clickable ? 'cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </tr>
  )
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode
  sortable?: boolean
  sorted?: 'asc' | 'desc' | false
  onSort?: () => void
}

export function TableHead({
  children,
  sortable = false,
  sorted = false,
  onSort,
  className = '',
  ...props
}: TableHeadProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (sortable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onSort?.()
    }
  }

  return (
    <th
      className={`
        font-semibold text-left
        ${sortable ? 'cursor-pointer select-none hover:bg-[var(--app-surface-alt)]' : ''}
        ${className}
      `}
      onClick={sortable ? onSort : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={sortable ? 0 : undefined}
      role={sortable ? 'button' : undefined}
      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="flex flex-col text-[var(--app-text-subtle)]" aria-hidden="true">
            <svg
              className={`w-3 h-3 -mb-1 ${sorted === 'asc' ? 'text-blue-500' : ''}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 8l-6 6h12z" />
            </svg>
            <svg
              className={`w-3 h-3 -mt-1 ${sorted === 'desc' ? 'text-blue-500' : ''}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 16l-6-6h12z" />
            </svg>
          </span>
        )}
      </div>
    </th>
  )
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode
  truncate?: boolean
}

export function TableCell({
  children,
  truncate = false,
  className = '',
  ...props
}: TableCellProps) {
  return (
    <td
      className={`
        text-[var(--app-text)]
        ${truncate ? 'max-w-0 truncate' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </td>
  )
}

export interface TableFooterProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
}

export function TableFooter({
  children,
  className = '',
  ...props
}: TableFooterProps) {
  return (
    <tfoot
      className={`
        bg-[var(--app-surface)] text-[var(--app-text-muted)]
        border-t border-[var(--app-border)]
        ${className}
      `}
      {...props}
    >
      {children}
    </tfoot>
  )
}

export interface TableCaptionProps extends HTMLAttributes<HTMLTableCaptionElement> {
  children: ReactNode
}

export function TableCaption({
  children,
  className = '',
  ...props
}: TableCaptionProps) {
  return (
    <caption
      className={`
        py-3 text-sm text-[var(--app-text-muted)] text-left
        ${className}
      `}
      {...props}
    >
      {children}
    </caption>
  )
}

export interface TableSkeletonProps {
  rows?: number
  columns?: number
  size?: TableProps['size']
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  size = 'md',
}: TableSkeletonProps) {
  return (
    <Table size={size} hoverable={false}>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i}>
              <div className="h-4 w-20 bg-[var(--app-surface-alt)] rounded animate-pulse" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <div
                  className="h-4 bg-[var(--app-surface-alt)] rounded animate-pulse"
                  style={{ width: `${60 + Math.random() * 40}%` }}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export interface EmptyTableProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  colSpan?: number
}

export function EmptyTable({
  icon,
  title,
  description,
  action,
  colSpan = 1,
}: EmptyTableProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-12">
        <div className="flex flex-col items-center justify-center text-center">
          {icon && (
            <div className="mb-4 text-[var(--app-text-subtle)]">{icon}</div>
          )}
          <h3 className="text-sm font-medium text-[var(--app-text)]">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">
              {description}
            </p>
          )}
          {action && <div className="mt-4">{action}</div>}
        </div>
      </TableCell>
    </TableRow>
  )
}
