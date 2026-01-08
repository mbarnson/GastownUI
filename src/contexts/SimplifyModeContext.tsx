import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface SimplifyModeContextValue {
  /** Whether simplify mode is active */
  isSimplified: boolean
  /** Toggle simplify mode */
  toggleSimplifyMode: () => void
  /** Set simplify mode explicitly */
  setSimplifyMode: (value: boolean) => void
  /** Maximum simultaneous updates to show (fewer in simplified mode) */
  maxSimultaneousUpdates: number
  /** Whether to show detailed metrics or simplified summaries */
  showDetailedMetrics: boolean
  /** Whether to use simplified language */
  useSimplifiedText: boolean
}

const SimplifyModeContext = createContext<SimplifyModeContextValue | null>(null)

const SIMPLIFY_MODE_STORAGE_KEY = 'gastownui-simplify-mode'

interface SimplifyModeProviderProps {
  children: ReactNode
}

export function SimplifyModeProvider({ children }: SimplifyModeProviderProps) {
  const [isSimplified, setIsSimplified] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SIMPLIFY_MODE_STORAGE_KEY) === 'true'
  })

  // Persist preference
  useEffect(() => {
    localStorage.setItem(SIMPLIFY_MODE_STORAGE_KEY, String(isSimplified))
  }, [isSimplified])

  const toggleSimplifyMode = () => {
    setIsSimplified((prev) => !prev)
  }

  const setSimplifyMode = (value: boolean) => {
    setIsSimplified(value)
  }

  // Derived settings based on mode
  const maxSimultaneousUpdates = isSimplified ? 3 : 10
  const showDetailedMetrics = !isSimplified
  const useSimplifiedText = isSimplified

  return (
    <SimplifyModeContext.Provider
      value={{
        isSimplified,
        toggleSimplifyMode,
        setSimplifyMode,
        maxSimultaneousUpdates,
        showDetailedMetrics,
        useSimplifiedText,
      }}
    >
      {children}
    </SimplifyModeContext.Provider>
  )
}

export function useSimplifyMode(): SimplifyModeContextValue {
  const context = useContext(SimplifyModeContext)
  if (!context) {
    throw new Error('useSimplifyMode must be used within a SimplifyModeProvider')
  }
  return context
}

/**
 * Utility to get simplified or detailed text
 */
export function getSimplifiedText(
  detailed: string,
  simplified: string,
  isSimplified: boolean
): string {
  return isSimplified ? simplified : detailed
}

/**
 * Status simplification mappings for common states
 */
export const simplifiedStatusMap: Record<string, string> = {
  'in_progress': 'Working',
  'completed': 'Done',
  'pending': 'Waiting',
  'blocked': 'Stuck',
  'failed': 'Error',
  'queued': 'In line',
  'running': 'Active',
  'idle': 'Ready',
  'stuck': 'Needs help',
  'completing': 'Almost done',
}

export function getSimplifiedStatus(status: string, isSimplified: boolean): string {
  if (!isSimplified) return status
  return simplifiedStatusMap[status.toLowerCase()] || status
}
