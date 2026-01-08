import { useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Settings,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react'

export interface CostThreshold {
  id: string
  name: string
  amount: number
  period: 'hourly' | 'daily' | 'weekly' | 'monthly'
  enabled: boolean
}

export interface CostData {
  current: {
    hourly: number
    daily: number
    weekly: number
    monthly: number
  }
  previous: {
    hourly: number
    daily: number
    weekly: number
    monthly: number
  }
  breakdown: {
    category: string
    amount: number
    percentage: number
  }[]
}

interface CostAlertsProps {
  costData: CostData
  thresholds: CostThreshold[]
  onThresholdUpdate: (threshold: CostThreshold) => void
  onThresholdDelete: (id: string) => void
  onThresholdAdd: (threshold: Omit<CostThreshold, 'id'>) => void
}

export default function CostAlerts({
  costData,
  thresholds,
  onThresholdUpdate,
  onThresholdDelete,
  onThresholdAdd,
}: CostAlertsProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newThreshold, setNewThreshold] = useState<Omit<CostThreshold, 'id'> | null>(null)

  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const getCostStatus = (
    current: number,
    threshold: number
  ): 'safe' | 'warning' | 'critical' => {
    const ratio = current / threshold
    if (ratio >= 1) return 'critical'
    if (ratio >= 0.8) return 'warning'
    return 'safe'
  }

  const getStatusColor = (status: 'safe' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      case 'safe':
        return 'text-green-400'
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  const dailyThreshold = thresholds.find((t) => t.period === 'daily' && t.enabled)
  const dailyStatus = dailyThreshold
    ? getCostStatus(costData.current.daily, dailyThreshold.amount)
    : 'safe'

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          <h2 className="text-white font-semibold">Cost Tracker</h2>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded transition-colors ${
            showSettings ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showSettings ? (
        /* Threshold settings view */
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-white font-medium mb-3">Alert Thresholds</h3>
            <div className="space-y-2">
              {thresholds.map((threshold) => (
                <ThresholdItem
                  key={threshold.id}
                  threshold={threshold}
                  editing={editingId === threshold.id}
                  onEdit={() => setEditingId(threshold.id)}
                  onSave={(updated) => {
                    onThresholdUpdate(updated)
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => onThresholdDelete(threshold.id)}
                  onToggle={() =>
                    onThresholdUpdate({ ...threshold, enabled: !threshold.enabled })
                  }
                />
              ))}
            </div>

            {/* Add new threshold */}
            {newThreshold ? (
              <div className="mt-4 p-3 bg-slate-800 rounded-lg">
                <h4 className="text-sm text-slate-400 mb-3">New Threshold</h4>
                <ThresholdEditor
                  threshold={{ id: 'new', ...newThreshold }}
                  onSave={(t) => {
                    onThresholdAdd({
                      name: t.name,
                      amount: t.amount,
                      period: t.period,
                      enabled: t.enabled,
                    })
                    setNewThreshold(null)
                  }}
                  onCancel={() => setNewThreshold(null)}
                />
              </div>
            ) : (
              <button
                onClick={() =>
                  setNewThreshold({
                    name: 'New Alert',
                    amount: 50,
                    period: 'daily',
                    enabled: true,
                  })
                }
                className="mt-4 flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add threshold</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Cost overview */
        <div className="flex-1 overflow-y-auto">
          {/* Main cost card */}
          <div className="p-4">
            <div
              className={`p-4 rounded-lg border ${
                dailyStatus === 'critical'
                  ? 'bg-red-900/20 border-red-500/50'
                  : dailyStatus === 'warning'
                    ? 'bg-yellow-900/20 border-yellow-500/50'
                    : 'bg-green-900/20 border-green-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Today&apos;s Spend</span>
                {dailyThreshold && (
                  <span className={`text-sm ${getStatusColor(dailyStatus)}`}>
                    {dailyStatus === 'critical'
                      ? 'Over limit!'
                      : dailyStatus === 'warning'
                        ? 'Near limit'
                        : 'On track'}
                  </span>
                )}
              </div>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-white">
                  {formatCurrency(costData.current.daily)}
                </span>
                {dailyThreshold && (
                  <span className="text-slate-500 text-sm pb-1">
                    / {formatCurrency(dailyThreshold.amount)}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {dailyThreshold && (
                <div className="mt-3">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        dailyStatus === 'critical'
                          ? 'bg-red-500'
                          : dailyStatus === 'warning'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min((costData.current.daily / dailyThreshold.amount) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Period breakdown */}
          <div className="px-4 pb-4">
            <h3 className="text-slate-400 text-sm mb-3">Spending Overview</h3>
            <div className="grid grid-cols-2 gap-3">
              <PeriodCard
                label="This Hour"
                amount={costData.current.hourly}
                previous={costData.previous.hourly}
              />
              <PeriodCard
                label="This Week"
                amount={costData.current.weekly}
                previous={costData.previous.weekly}
              />
              <PeriodCard
                label="This Month"
                amount={costData.current.monthly}
                previous={costData.previous.monthly}
              />
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="px-4 pb-4">
            <h3 className="text-slate-400 text-sm mb-3">Cost Breakdown</h3>
            <div className="space-y-2">
              {costData.breakdown.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-8 rounded"
                      style={{
                        backgroundColor:
                          item.percentage > 50
                            ? '#f87171'
                            : item.percentage > 25
                              ? '#fbbf24'
                              : '#22c55e',
                      }}
                    />
                    <span className="text-white">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {formatCurrency(item.amount)}
                    </div>
                    <div className="text-slate-500 text-xs">{item.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active alerts */}
          {thresholds.some(
            (t) =>
              t.enabled &&
              costData.current[t.period] >= t.amount * 0.8
          ) && (
            <div className="px-4 pb-4">
              <h3 className="text-slate-400 text-sm mb-3">Active Alerts</h3>
              <div className="space-y-2">
                {thresholds
                  .filter(
                    (t) =>
                      t.enabled &&
                      costData.current[t.period] >= t.amount * 0.8
                  )
                  .map((threshold) => {
                    const current = costData.current[threshold.period]
                    const status = getCostStatus(current, threshold.amount)
                    return (
                      <div
                        key={threshold.id}
                        className={`flex items-center gap-3 p-3 rounded border ${
                          status === 'critical'
                            ? 'bg-red-900/20 border-red-500/50'
                            : 'bg-yellow-900/20 border-yellow-500/50'
                        }`}
                      >
                        <AlertCircle
                          className={`w-5 h-5 ${getStatusColor(status)}`}
                        />
                        <div className="flex-1">
                          <p className="text-white text-sm">{threshold.name}</p>
                          <p className="text-slate-400 text-xs">
                            {formatCurrency(current)} / {formatCurrency(threshold.amount)}{' '}
                            {threshold.period}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PeriodCard({
  label,
  amount,
  previous,
}: {
  label: string
  amount: number
  previous: number
}) {
  const change = ((amount - previous) / previous) * 100
  const isUp = change > 0

  return (
    <div className="p-3 bg-slate-800 rounded">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className="text-white font-semibold">${amount.toFixed(2)}</div>
      <div
        className={`flex items-center gap-1 text-xs ${
          isUp ? 'text-red-400' : 'text-green-400'
        }`}
      >
        {isUp ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        <span>{Math.abs(change).toFixed(0)}%</span>
      </div>
    </div>
  )
}

function ThresholdItem({
  threshold,
  editing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onToggle,
}: {
  threshold: CostThreshold
  editing: boolean
  onEdit: () => void
  onSave: (threshold: CostThreshold) => void
  onCancel: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  if (editing) {
    return (
      <div className="p-3 bg-slate-700 rounded-lg">
        <ThresholdEditor
          threshold={threshold}
          onSave={onSave}
          onCancel={onCancel}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className={`w-10 h-6 rounded-full transition-colors ${
            threshold.enabled ? 'bg-cyan-500' : 'bg-slate-600'
          }`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
              threshold.enabled ? 'translate-x-4' : ''
            }`}
          />
        </button>
        <div>
          <p className={`text-sm ${threshold.enabled ? 'text-white' : 'text-slate-500'}`}>
            {threshold.name}
          </p>
          <p className="text-slate-500 text-xs">
            ${threshold.amount} {threshold.period}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="p-1.5 text-slate-400 hover:text-white"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function ThresholdEditor({
  threshold,
  onSave,
  onCancel,
}: {
  threshold: CostThreshold
  onSave: (threshold: CostThreshold) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(threshold.name)
  const [amount, setAmount] = useState(threshold.amount.toString())
  const [period, setPeriod] = useState(threshold.period)

  const handleSave = () => {
    onSave({
      ...threshold,
      name,
      amount: parseFloat(amount) || 0,
      period,
    })
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Alert name"
        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
      />
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            $
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
          />
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as CostThreshold['period'])}
          className="px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
        >
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded transition-colors"
        >
          <Check className="w-4 h-4" />
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Mock data for development
export const mockCostData: CostData = {
  current: {
    hourly: 3.25,
    daily: 47.23,
    weekly: 312.50,
    monthly: 1250.00,
  },
  previous: {
    hourly: 2.80,
    daily: 42.10,
    weekly: 298.00,
    monthly: 1180.00,
  },
  breakdown: [
    { category: 'Claude API', amount: 28.50, percentage: 60 },
    { category: 'Compute', amount: 12.00, percentage: 25 },
    { category: 'Storage', amount: 4.73, percentage: 10 },
    { category: 'Other', amount: 2.00, percentage: 5 },
  ],
}

export const mockThresholds: CostThreshold[] = [
  { id: '1', name: 'Daily Limit', amount: 50, period: 'daily', enabled: true },
  { id: '2', name: 'Hourly Spike', amount: 10, period: 'hourly', enabled: true },
  { id: '3', name: 'Monthly Budget', amount: 1500, period: 'monthly', enabled: true },
]
