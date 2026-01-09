import { forwardRef } from 'react'
import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

const baseInputStyles = `
  w-full rounded-lg border
  bg-[var(--app-surface)] text-[var(--app-text)]
  border-[var(--app-border)]
  placeholder:text-[var(--app-text-subtle)]
  transition-all duration-200
  hover:border-[var(--app-border-strong)]
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--app-border)]
`

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      iconPosition = 'left',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--app-text)] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              ${baseInputStyles}
              ${sizeStyles.md}
              ${icon && iconPosition === 'left' ? 'pl-10' : ''}
              ${icon && iconPosition === 'right' ? 'pr-10' : ''}
              ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
              ${className}
            `}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]">
              {icon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-500">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-[var(--app-text-subtle)]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-[var(--app-text)] mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            ${baseInputStyles}
            ${sizeStyles.md}
            min-h-[100px] resize-y
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            ${className}
          `}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="mt-1.5 text-sm text-red-500">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="mt-1.5 text-sm text-[var(--app-text-subtle)]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-[var(--app-text)] mb-1.5"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
            ${baseInputStyles}
            ${sizeStyles.md}
            pr-10 cursor-pointer
            appearance-none
            bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236e6e73%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]
            bg-[length:20px] bg-[right_12px_center] bg-no-repeat
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            ${className}
          `}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="mt-1.5 text-sm text-red-500">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className="mt-1.5 text-sm text-[var(--app-text-subtle)]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  description?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}`

    return (
      <div className={`flex items-start gap-3 ${className}`}>
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className="
            mt-0.5 h-5 w-5 rounded
            border-[var(--app-border)] bg-[var(--app-surface)]
            text-blue-600
            transition-colors duration-150
            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            focus:ring-offset-[var(--app-bg)]
            cursor-pointer
          "
          {...props}
        />
        <div className="flex-1">
          <label
            htmlFor={checkboxId}
            className="text-sm font-medium text-[var(--app-text)] cursor-pointer"
          >
            {label}
          </label>
          {description && (
            <p className="mt-0.5 text-sm text-[var(--app-text-muted)]">
              {description}
            </p>
          )}
        </div>
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export interface RadioGroupProps {
  label?: string
  name: string
  options: Array<{ value: string; label: string; description?: string; disabled?: boolean }>
  value?: string
  onChange?: (value: string) => void
  className?: string
}

export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  className = '',
}: RadioGroupProps) {
  return (
    <fieldset className={className}>
      {label && (
        <legend className="text-sm font-medium text-[var(--app-text)] mb-3">
          {label}
        </legend>
      )}
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.value} className="flex items-start gap-3">
            <input
              id={`${name}-${option.value}`}
              name={name}
              type="radio"
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={(e) => onChange?.(e.target.value)}
              className="
                mt-0.5 h-5 w-5
                border-[var(--app-border)] bg-[var(--app-surface)]
                text-blue-600
                transition-colors duration-150
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                focus:ring-offset-[var(--app-bg)]
                cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
            <div className="flex-1">
              <label
                htmlFor={`${name}-${option.value}`}
                className={`text-sm font-medium text-[var(--app-text)] cursor-pointer ${
                  option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {option.label}
              </label>
              {option.description && (
                <p className="mt-0.5 text-sm text-[var(--app-text-muted)]">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  )
}

export interface FormFieldProps {
  children: ReactNode
  className?: string
}

export function FormField({ children, className = '' }: FormFieldProps) {
  return <div className={`mb-4 ${className}`}>{children}</div>
}

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode
}

export function Form({ children, className = '', ...props }: FormProps) {
  return (
    <form className={`space-y-4 ${className}`} {...props}>
      {children}
    </form>
  )
}
