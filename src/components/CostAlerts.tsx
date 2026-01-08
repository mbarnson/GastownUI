/**
 * Cost Alerts Component
 *
 * Displays budget alerts and warnings for cost monitoring.
 * Accessible with proper ARIA roles and screen reader support.
 */

import { useState } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  CheckCircle,
  X,
  DollarSign,
  TrendingUp,
  Settings,
} from 'lucide-react';
import {
  useCostAlerts,
  useBudgetStatus,
  useCostMonitor,
  formatCurrency,
  getAlertLevelColors,
  type AlertLevel,
  type CostAlert,
  type BudgetConfig,
} from '../lib/costMonitor';
import { focusRingClasses } from '../lib/a11y';

// ============================================================================
// Alert Icon Component
// ============================================================================

function AlertIcon({ level, className = '' }: { level: AlertLevel; className?: string }) {
  const baseClass = `${className}`;

  switch (level) {
    case 'exceeded':
      return <AlertOctagon className={baseClass} aria-hidden="true" />;
    case 'critical':
      return <AlertTriangle className={baseClass} aria-hidden="true" />;
    case 'warning':
      return <AlertCircle className={baseClass} aria-hidden="true" />;
    default:
      return <CheckCircle className={baseClass} aria-hidden="true" />;
  }
}

// ============================================================================
// Single Alert Item
// ============================================================================

interface AlertItemProps {
  alert: CostAlert;
  onDismiss: (id: string) => void;
}

function AlertItem({ alert, onDismiss }: AlertItemProps) {
  const colors = getAlertLevelColors(alert.level);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${colors.bg} ${colors.border}`}
      role="alert"
      aria-live={alert.level === 'exceeded' ? 'assertive' : 'polite'}
    >
      <AlertIcon level={alert.level} className={`w-5 h-5 mt-0.5 ${colors.text}`} />
      <div className="flex-1">
        <p className={`font-medium ${colors.text}`}>{alert.message}</p>
        <p className="text-sm text-slate-400 mt-1">
          {formatCurrency(alert.currentValue)} / {formatCurrency(alert.limit)}
          <span className="ml-2">({Math.round(alert.percentage * 100)}%)</span>
        </p>
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        className={`p-1 rounded hover:bg-slate-700/50 transition-colors ${focusRingClasses}`}
        aria-label={`Dismiss ${alert.type} alert`}
      >
        <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
      </button>
    </div>
  );
}

// ============================================================================
// Alerts List Component
// ============================================================================

export function CostAlertsList() {
  const { alerts, dismiss, dismissAll } = useCostAlerts();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      className="space-y-2"
      role="region"
      aria-label="Budget alerts"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400">
          Budget Alerts ({alerts.length})
        </h3>
        {alerts.length > 1 && (
          <button
            onClick={dismissAll}
            className={`text-xs text-slate-500 hover:text-slate-300 transition-colors ${focusRingClasses}`}
          >
            Dismiss all
          </button>
        )}
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} onDismiss={dismiss} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Budget Progress Bar
// ============================================================================

interface BudgetProgressProps {
  label: string;
  current: number;
  limit?: number;
  level: AlertLevel;
}

function BudgetProgress({ label, current, limit, level }: BudgetProgressProps) {
  const colors = getAlertLevelColors(level);
  const percentage = limit ? Math.min((current / limit) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className={colors.text}>
          {formatCurrency(current)}
          {limit && <span className="text-slate-500"> / {formatCurrency(limit)}</span>}
        </span>
      </div>
      {limit && (
        <div
          className="h-2 bg-slate-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${label}: ${formatCurrency(current)} of ${formatCurrency(limit)}`}
        >
          <div
            className={`h-full transition-all duration-300 ${
              level === 'exceeded'
                ? 'bg-red-500'
                : level === 'critical'
                ? 'bg-orange-500'
                : level === 'warning'
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Budget Status Panel
// ============================================================================

export function BudgetStatusPanel() {
  const status = useBudgetStatus();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <section
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
      aria-labelledby="budget-status-heading"
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          id="budget-status-heading"
          className="text-lg font-semibold text-white flex items-center gap-2"
        >
          <DollarSign className="w-5 h-5 text-orange-400" aria-hidden="true" />
          Budget Status
        </h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg hover:bg-slate-700 transition-colors ${focusRingClasses}`}
          aria-label="Budget settings"
          aria-expanded={showSettings}
        >
          <Settings className="w-4 h-4 text-slate-400" aria-hidden="true" />
        </button>
      </div>

      {/* Alerts */}
      {status.alerts.length > 0 && (
        <div className="mb-4">
          <CostAlertsList />
        </div>
      )}

      {/* Progress Bars */}
      <div className="space-y-3">
        <BudgetProgress
          label="Today"
          current={status.daily.current}
          limit={status.daily.limit}
          level={status.daily.level}
        />
        <BudgetProgress
          label="This Week"
          current={status.weekly.current}
          limit={status.weekly.limit}
          level={status.weekly.level}
        />
        <BudgetProgress
          label="This Month"
          current={status.monthly.current}
          limit={status.monthly.limit}
          level={status.monthly.level}
        />
      </div>

      {/* Projected */}
      {status.projected.daily > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <span className="text-slate-400">Projected today:</span>
            <span className={getAlertLevelColors(status.projected.level).text}>
              {formatCurrency(status.projected.daily)}
            </span>
          </div>
        </div>
      )}

      {/* Paused Warning */}
      {status.isPaused && (
        <div
          className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
          role="alert"
        >
          <div className="flex items-center gap-2 text-red-400">
            <AlertOctagon className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">Operations Paused</span>
          </div>
          <p className="text-sm text-red-400/80 mt-1">
            Budget limit exceeded. Operations have been paused.
          </p>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && <BudgetSettings onClose={() => setShowSettings(false)} />}
    </section>
  );
}

// ============================================================================
// Budget Settings
// ============================================================================

interface BudgetSettingsProps {
  onClose: () => void;
}

function BudgetSettings({ onClose }: BudgetSettingsProps) {
  const { config, updateConfig } = useCostMonitor();
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    updateConfig(localConfig);
    onClose();
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-700">
      <h3 className="text-sm font-medium text-white mb-3">Budget Limits</h3>

      <div className="space-y-3">
        <div>
          <label htmlFor="daily-limit" className="block text-xs text-slate-400 mb-1">
            Daily Limit ($)
          </label>
          <input
            id="daily-limit"
            type="number"
            min="0"
            step="1"
            value={localConfig.dailyLimit}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, dailyLimit: parseFloat(e.target.value) || 0 })
            }
            className={`w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm ${focusRingClasses}`}
          />
        </div>

        <div>
          <label htmlFor="weekly-limit" className="block text-xs text-slate-400 mb-1">
            Weekly Limit ($)
          </label>
          <input
            id="weekly-limit"
            type="number"
            min="0"
            step="1"
            value={localConfig.weeklyLimit}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, weeklyLimit: parseFloat(e.target.value) || 0 })
            }
            className={`w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm ${focusRingClasses}`}
          />
        </div>

        <div>
          <label htmlFor="monthly-limit" className="block text-xs text-slate-400 mb-1">
            Monthly Limit ($)
          </label>
          <input
            id="monthly-limit"
            type="number"
            min="0"
            step="1"
            value={localConfig.monthlyLimit}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, monthlyLimit: parseFloat(e.target.value) || 0 })
            }
            className={`w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm ${focusRingClasses}`}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="pause-on-exceed"
            type="checkbox"
            checked={localConfig.pauseOnExceed}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, pauseOnExceed: e.target.checked })
            }
            className={`w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 ${focusRingClasses}`}
          />
          <label htmlFor="pause-on-exceed" className="text-sm text-slate-300">
            Pause operations when limit exceeded
          </label>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          className={`flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors ${focusRingClasses}`}
        >
          Save
        </button>
        <button
          onClick={onClose}
          className={`px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors ${focusRingClasses}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Cost Badge (for header)
// ============================================================================

export function CostBadge() {
  const status = useBudgetStatus();
  const highestLevel = [
    status.daily.level,
    status.weekly.level,
    status.monthly.level,
  ].reduce((highest, current) => {
    const levels: AlertLevel[] = ['normal', 'warning', 'critical', 'exceeded'];
    return levels.indexOf(current) > levels.indexOf(highest) ? current : highest;
  }, 'normal' as AlertLevel);

  const colors = getAlertLevelColors(highestLevel);
  const hasAlerts = status.alerts.length > 0;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${colors.bg} ${colors.border}`}
      role="status"
      aria-label={`Budget status: ${formatCurrency(status.daily.current)} today${
        hasAlerts ? `, ${status.alerts.length} alert${status.alerts.length > 1 ? 's' : ''}` : ''
      }`}
    >
      <DollarSign className={`w-4 h-4 ${colors.text}`} aria-hidden="true" />
      <span className={`text-sm font-medium ${colors.text}`}>
        {formatCurrency(status.daily.current)}
      </span>
      {hasAlerts && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
          {status.alerts.length}
        </span>
      )}
    </div>
  );
}
