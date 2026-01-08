import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type Theme } from '../hooks/useTheme'

interface ThemeToggleProps {
  /** Optional class name */
  className?: string
  /** Show label text */
  showLabel?: boolean
}

/**
 * Simple toggle button that cycles through themes
 *
 * Cycles: system -> light -> dark -> system
 *
 * @example
 * ```tsx
 * <ThemeToggle />
 * ```
 */
export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const handleClick = () => {
    // Cycle: system -> light -> dark -> system
    const order: Theme[] = ['system', 'light', 'dark']
    const currentIndex = order.indexOf(theme)
    const nextTheme = order[(currentIndex + 1) % order.length]
    setTheme(nextTheme)
  }

  const Icon = theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun
  const label =
    theme === 'system'
      ? 'System'
      : resolvedTheme === 'dark'
        ? 'Dark'
        : 'Light'

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 p-2 rounded-lg transition-colors
        text-slate-400 hover:text-slate-200 hover:bg-slate-700
        dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700
        ${className}`}
      title={`Current theme: ${label}. Click to change.`}
      aria-label={`Theme: ${label}. Click to change.`}
    >
      <Icon className="w-5 h-5" />
      {showLabel && <span className="text-sm">{label}</span>}
    </button>
  )
}

/**
 * Dropdown/menu for selecting theme
 *
 * @example
 * ```tsx
 * <ThemeSelector />
 * ```
 */
export function ThemeSelector({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className={`space-y-1 ${className}`}>
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
            ${
              theme === value
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
          {value === 'system' && (
            <span className="ml-auto text-xs opacity-60">
              ({resolvedTheme})
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/**
 * Compact icon-only theme toggle
 *
 * @example
 * ```tsx
 * <ThemeIcon />
 * ```
 */
export function ThemeIcon({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const handleClick = () => {
    // Simple toggle between light and dark
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
  }

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-lg transition-all duration-200
        text-slate-400 hover:text-slate-200
        hover:bg-slate-700
        ${className}`}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-5 h-5">
        {/* Sun icon - visible in dark mode */}
        <Sun
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
            resolvedTheme === 'dark'
              ? 'opacity-100 rotate-0'
              : 'opacity-0 rotate-90 scale-50'
          }`}
        />
        {/* Moon icon - visible in light mode */}
        <Moon
          className={`absolute inset-0 w-5 h-5 transition-all duration-300 ${
            resolvedTheme === 'light'
              ? 'opacity-100 rotate-0'
              : 'opacity-0 -rotate-90 scale-50'
          }`}
        />
      </div>
    </button>
  )
}

/**
 * Theme toggle with animated switch appearance
 *
 * @example
 * ```tsx
 * <ThemeSwitch />
 * ```
 */
export function ThemeSwitch({ className = '' }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors
        ${isDark ? 'bg-slate-700' : 'bg-slate-300'}
        ${className}`}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Track icons */}
      <Sun className={`absolute left-1.5 w-3 h-3 transition-opacity ${isDark ? 'opacity-40' : 'opacity-0'}`} />
      <Moon className={`absolute right-1.5 w-3 h-3 transition-opacity ${isDark ? 'opacity-0' : 'opacity-40'}`} />

      {/* Thumb */}
      <span
        className={`inline-flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200
          ${isDark ? 'translate-x-6' : 'translate-x-1'}`}
      >
        {isDark ? (
          <Moon className="w-3 h-3 text-slate-700" />
        ) : (
          <Sun className="w-3 h-3 text-amber-500" />
        )}
      </span>
    </button>
  )
}
