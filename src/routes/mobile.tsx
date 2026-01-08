import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import {
  Bell,
  Mic,
  AlertTriangle,
  DollarSign,
  Home,
} from 'lucide-react'
import NotificationHub, {
  mockNotifications,
  type Notification,
} from '../components/mobile/NotificationHub'
import VoiceOnlyMode from '../components/mobile/VoiceOnlyMode'
import EscalationApproval, {
  mockEscalations,
  type Escalation,
} from '../components/mobile/EscalationApproval'
import CostAlerts, {
  mockCostData,
  mockThresholds,
  type CostThreshold,
  type CostData,
} from '../components/mobile/CostAlerts'

export const Route = createFileRoute('/mobile')({
  component: MobilePage,
})

type Tab = 'notifications' | 'voice' | 'escalations' | 'costs'

function MobilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('notifications')

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const unreadCount = notifications.filter((n) => !n.read).length

  // Escalation state
  const [escalations, setEscalations] = useState<Escalation[]>(mockEscalations)
  const escalationCount = escalations.length

  // Cost state
  const [costData] = useState<CostData>(mockCostData)
  const [thresholds, setThresholds] = useState<CostThreshold[]>(mockThresholds)

  // Notification handlers
  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const handleDeleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const handleNotificationAction = useCallback(
    (notification: Notification, action: 'approve' | 'reject') => {
      console.log(`Notification ${notification.id}: ${action}`)
      // Remove from notifications after action
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
    },
    []
  )

  // Voice command handler
  const handleVoiceCommand = useCallback((command: string) => {
    console.log('Voice command:', command)
    // Could navigate to relevant tab based on command
  }, [])

  // Escalation handlers
  const handleApproveEscalation = useCallback((id: string, comment?: string) => {
    console.log(`Approved escalation ${id}`, comment)
    setEscalations((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const handleRejectEscalation = useCallback((id: string, reason: string) => {
    console.log(`Rejected escalation ${id}: ${reason}`)
    setEscalations((prev) => prev.filter((e) => e.id !== id))
  }, [])

  // Cost threshold handlers
  const handleThresholdUpdate = useCallback((threshold: CostThreshold) => {
    setThresholds((prev) =>
      prev.map((t) => (t.id === threshold.id ? threshold : t))
    )
  }, [])

  const handleThresholdDelete = useCallback((id: string) => {
    setThresholds((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleThresholdAdd = useCallback(
    (threshold: Omit<CostThreshold, 'id'>) => {
      const newThreshold: CostThreshold = {
        ...threshold,
        id: Date.now().toString(),
      }
      setThresholds((prev) => [...prev, newThreshold])
    },
    []
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'notifications':
        return (
          <NotificationHub
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onDelete={handleDeleteNotification}
            onAction={handleNotificationAction}
          />
        )
      case 'voice':
        return <VoiceOnlyMode onCommand={handleVoiceCommand} />
      case 'escalations':
        return (
          <EscalationApproval
            escalations={escalations}
            onApprove={handleApproveEscalation}
            onReject={handleRejectEscalation}
          />
        )
      case 'costs':
        return (
          <CostAlerts
            costData={costData}
            thresholds={thresholds}
            onThresholdUpdate={handleThresholdUpdate}
            onThresholdDelete={handleThresholdDelete}
            onThresholdAdd={handleThresholdAdd}
          />
        )
    }
  }

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
      <main className="flex-1 overflow-hidden">{renderContent()}</main>

      {/* Bottom navigation */}
      <nav className="flex items-center justify-around bg-slate-800 border-t border-slate-700 safe-area-bottom">
        <NavButton
          icon={<Bell className="w-5 h-5" />}
          label="Alerts"
          active={activeTab === 'notifications'}
          onClick={() => setActiveTab('notifications')}
          badge={unreadCount}
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
          badge={escalationCount}
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
