import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface CalmModeContextValue {
  /** Whether calm mode is active (either system preference or manual toggle) */
  isCalm: boolean
  /** Whether calm mode was manually enabled (overrides system preference) */
  manualCalmMode: boolean | null
  /** Toggle calm mode manually */
  toggleCalmMode: () => void
  /** Set calm mode explicitly */
  setCalmMode: (value: boolean | null) => void
  /** System prefers-reduced-motion preference */
  systemPrefersReducedMotion: boolean
}

const CalmModeContext = createContext<CalmModeContextValue | null>(null)

const CALM_MODE_STORAGE_KEY = 'gastownui-calm-mode'

interface CalmModeProviderProps {
  children: ReactNode
}

export function CalmModeProvider({ children }: CalmModeProviderProps) {
  const systemPrefersReducedMotion = useReducedMotion()
  const [manualCalmMode, setManualCalmMode] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(CALM_MODE_STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
    return null
  })

  // Persist manual preference
  useEffect(() => {
    if (manualCalmMode === null) {
      localStorage.removeItem(CALM_MODE_STORAGE_KEY)
    } else {
      localStorage.setItem(CALM_MODE_STORAGE_KEY, String(manualCalmMode))
    }
  }, [manualCalmMode])

  // isCalm: manual override takes precedence, otherwise use system preference
  const isCalm = manualCalmMode !== null ? manualCalmMode : systemPrefersReducedMotion

  const toggleCalmMode = () => {
    setManualCalmMode((prev) => {
      if (prev === null) return true
      if (prev === true) return false
      return null // Reset to follow system
    })
  }

  const setCalmMode = (value: boolean | null) => {
    setManualCalmMode(value)
  }

  return (
    <CalmModeContext.Provider
      value={{
        isCalm,
        manualCalmMode,
        toggleCalmMode,
        setCalmMode,
        systemPrefersReducedMotion,
      }}
    >
      {children}
    </CalmModeContext.Provider>
  )
}

export function useCalmMode(): CalmModeContextValue {
  const context = useContext(CalmModeContext)
  if (!context) {
    throw new Error('useCalmMode must be used within a CalmModeProvider')
  }
  return context
}
