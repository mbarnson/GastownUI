import { createContext, useContext, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

export type SidebarMode = 'voice' | 'selfTest' | 'deepQuery'

interface SidebarModeContextValue {
  sidebarMode: SidebarMode
  setSidebarMode: Dispatch<SetStateAction<SidebarMode>>
}

const SidebarModeContext = createContext<SidebarModeContextValue | null>(null)

export function SidebarModeProvider({
  children,
}: {
  children: ReactNode
}) {
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('voice')

  return (
    <SidebarModeContext.Provider value={{ sidebarMode, setSidebarMode }}>
      {children}
    </SidebarModeContext.Provider>
  )
}

export function useSidebarMode() {
  const context = useContext(SidebarModeContext)
  if (!context) {
    throw new Error('useSidebarMode must be used within SidebarModeProvider')
  }
  return context
}
