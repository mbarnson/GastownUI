import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  Bell,
  Mic,
  DollarSign,
  AlertTriangle,
  Home,
  Menu,
  X,
} from 'lucide-react'

interface MobileLayoutProps {
  children: React.ReactNode
}

type Tab = 'notifications' | 'voice' | 'escalations' | 'costs'

export default function MobileLayout({ children }: MobileLayoutProps) {
  const [activeTab, setActiveTab] = useState<Tab>('notifications')

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 safe-area-top">
        <div className="flex items-center gap-2">
          <span className="text-orange-500 text-xl font-black">GT</span>
          <span className="text-white font-semibold">Mobile</span>
        </div>
        <Link to="/dashboard" className="text-slate-400 hover:text-white">
          <Home className="w-5 h-5" />
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>

      {/* Bottom navigation */}
      <nav className="flex items-center justify-around bg-slate-800 border-t border-slate-700 safe-area-bottom">
        <NavButton
          icon={<Bell className="w-5 h-5" />}
          label="Alerts"
          active={activeTab === 'notifications'}
          onClick={() => setActiveTab('notifications')}
          badge={3}
        />
        <NavButton
          icon={<Mic className="w-5 h-5" />}
          label="Voice"
          active={activeTab === 'voice'}
          onClick={() => setActiveTab('voice')}
        />
        <NavButton
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Escalations"
          active={activeTab === 'escalations'}
          onClick={() => setActiveTab('escalations')}
          badge={1}
          badgeColor="red"
        />
        <NavButton
          icon={<DollarSign className="w-5 h-5" />}
          label="Costs"
          active={activeTab === 'costs'}
          onClick={() => setActiveTab('costs')}
        />
      </nav>
    </div>
  )
}

interface NavButtonProps {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  badge?: number
  badgeColor?: 'cyan' | 'red' | 'orange'
}

function NavButton({
  icon,
  label,
  active,
  onClick,
  badge,
  badgeColor = 'cyan',
}: NavButtonProps) {
  const badgeColors = {
    cyan: 'bg-cyan-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-3 px-4 transition-colors relative ${
        active ? 'text-cyan-400' : 'text-slate-400'
      }`}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span
            className={`absolute -top-1 -right-1 w-4 h-4 ${badgeColors[badgeColor]} text-white text-xs font-bold rounded-full flex items-center justify-center`}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-xs">{label}</span>
      {active && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan-400 rounded-full" />
      )}
    </button>
  )
}
