/**
 * Cost Monitoring and Budget Alerts System
 *
 * Tracks API/compute costs and alerts when approaching or exceeding budget limits.
 * Supports daily, weekly, and monthly budgets with configurable thresholds.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface BudgetConfig {
  /** Daily spending limit in dollars */
  dailyLimit?: number;
  /** Weekly spending limit in dollars */
  weeklyLimit?: number;
  /** Monthly spending limit in dollars */
  monthlyLimit?: number;
  /** Warning threshold as percentage (0-1), default 0.8 (80%) */
  warningThreshold?: number;
  /** Critical threshold as percentage (0-1), default 0.95 (95%) */
  criticalThreshold?: number;
  /** Whether to pause operations when limit exceeded */
  pauseOnExceed?: boolean;
}

export interface CostData {
  /** Cost for current day in dollars */
  today: number;
  /** Cost for current week in dollars */
  thisWeek: number;
  /** Cost for current month in dollars */
  thisMonth: number;
  /** Current hourly rate in dollars */
  hourlyRate: number;
  /** Projected daily cost based on current rate */
  projectedDaily: number;
  /** Last updated timestamp */
  lastUpdated: string;
}

export type AlertLevel = 'normal' | 'warning' | 'critical' | 'exceeded';

export interface CostAlert {
  id: string;
  level: AlertLevel;
  type: 'daily' | 'weekly' | 'monthly' | 'projected';
  message: string;
  currentValue: number;
  limit: number;
  percentage: number;
  timestamp: string;
  dismissed?: boolean;
}

export interface BudgetStatus {
  daily: {
    current: number;
    limit?: number;
    percentage: number;
    level: AlertLevel;
  };
  weekly: {
    current: number;
    limit?: number;
    percentage: number;
    level: AlertLevel;
  };
  monthly: {
    current: number;
    limit?: number;
    percentage: number;
    level: AlertLevel;
  };
  projected: {
    daily: number;
    level: AlertLevel;
  };
  isPaused: boolean;
  alerts: CostAlert[];
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_BUDGET_CONFIG: Required<BudgetConfig> = {
  dailyLimit: 50,
  weeklyLimit: 250,
  monthlyLimit: 1000,
  warningThreshold: 0.8,
  criticalThreshold: 0.95,
  pauseOnExceed: false,
};

// ============================================================================
// Cost Monitor Class
// ============================================================================

class CostMonitor {
  private config: Required<BudgetConfig>;
  private costData: CostData;
  private alerts: Map<string, CostAlert> = new Map();
  private listeners: Set<() => void> = new Set();
  private isPaused: boolean = false;

  constructor(config?: BudgetConfig) {
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
    this.costData = {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      hourlyRate: 0,
      projectedDaily: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Update the current cost data
   */
  updateCosts(data: Partial<CostData>): void {
    this.costData = {
      ...this.costData,
      ...data,
      lastUpdated: new Date().toISOString(),
    };

    // Calculate projected daily cost
    const now = new Date();
    const hoursRemaining = 24 - now.getHours() - now.getMinutes() / 60;
    this.costData.projectedDaily =
      this.costData.today + this.costData.hourlyRate * hoursRemaining;

    // Check for alerts
    this.checkAlerts();
    this.notifyListeners();
  }

  /**
   * Update budget configuration
   */
  updateConfig(config: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...config };
    this.checkAlerts();
    this.notifyListeners();
  }

  /**
   * Get current budget status
   */
  getStatus(): BudgetStatus {
    const dailyLevel = this.getAlertLevel(
      this.costData.today,
      this.config.dailyLimit
    );
    const weeklyLevel = this.getAlertLevel(
      this.costData.thisWeek,
      this.config.weeklyLimit
    );
    const monthlyLevel = this.getAlertLevel(
      this.costData.thisMonth,
      this.config.monthlyLimit
    );
    const projectedLevel = this.getAlertLevel(
      this.costData.projectedDaily,
      this.config.dailyLimit
    );

    return {
      daily: {
        current: this.costData.today,
        limit: this.config.dailyLimit,
        percentage: this.config.dailyLimit
          ? this.costData.today / this.config.dailyLimit
          : 0,
        level: dailyLevel,
      },
      weekly: {
        current: this.costData.thisWeek,
        limit: this.config.weeklyLimit,
        percentage: this.config.weeklyLimit
          ? this.costData.thisWeek / this.config.weeklyLimit
          : 0,
        level: weeklyLevel,
      },
      monthly: {
        current: this.costData.thisMonth,
        limit: this.config.monthlyLimit,
        percentage: this.config.monthlyLimit
          ? this.costData.thisMonth / this.config.monthlyLimit
          : 0,
        level: monthlyLevel,
      },
      projected: {
        daily: this.costData.projectedDaily,
        level: projectedLevel,
      },
      isPaused: this.isPaused,
      alerts: Array.from(this.alerts.values()).filter((a) => !a.dismissed),
    };
  }

  /**
   * Get the current cost data
   */
  getCostData(): CostData {
    return { ...this.costData };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<BudgetConfig> {
    return { ...this.config };
  }

  /**
   * Dismiss an alert
   */
  dismissAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.dismissed = true;
      this.notifyListeners();
    }
  }

  /**
   * Clear all dismissed alerts
   */
  clearDismissedAlerts(): void {
    for (const [id, alert] of this.alerts) {
      if (alert.dismissed) {
        this.alerts.delete(id);
      }
    }
    this.notifyListeners();
  }

  /**
   * Resume operations if paused
   */
  resume(): void {
    this.isPaused = false;
    this.notifyListeners();
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private getAlertLevel(current: number, limit?: number): AlertLevel {
    if (!limit || limit <= 0) return 'normal';

    const percentage = current / limit;

    if (percentage >= 1) return 'exceeded';
    if (percentage >= this.config.criticalThreshold) return 'critical';
    if (percentage >= this.config.warningThreshold) return 'warning';
    return 'normal';
  }

  private checkAlerts(): void {
    const now = new Date().toISOString();

    // Check daily limit
    this.checkLimit('daily', this.costData.today, this.config.dailyLimit, now);

    // Check weekly limit
    this.checkLimit('weekly', this.costData.thisWeek, this.config.weeklyLimit, now);

    // Check monthly limit
    this.checkLimit('monthly', this.costData.thisMonth, this.config.monthlyLimit, now);

    // Check projected daily
    if (
      this.config.dailyLimit &&
      this.costData.projectedDaily > this.config.dailyLimit
    ) {
      this.addAlert({
        id: 'projected-daily',
        level: 'warning',
        type: 'projected',
        message: `Projected daily spend ($${this.costData.projectedDaily.toFixed(2)}) exceeds limit`,
        currentValue: this.costData.projectedDaily,
        limit: this.config.dailyLimit,
        percentage: this.costData.projectedDaily / this.config.dailyLimit,
        timestamp: now,
      });
    }

    // Check if we should pause
    if (this.config.pauseOnExceed) {
      const exceeded =
        (this.config.dailyLimit && this.costData.today >= this.config.dailyLimit) ||
        (this.config.weeklyLimit && this.costData.thisWeek >= this.config.weeklyLimit) ||
        (this.config.monthlyLimit && this.costData.thisMonth >= this.config.monthlyLimit);

      if (exceeded && !this.isPaused) {
        this.isPaused = true;
      }
    }
  }

  private checkLimit(
    type: 'daily' | 'weekly' | 'monthly',
    current: number,
    limit: number | undefined,
    timestamp: string
  ): void {
    if (!limit) return;

    const level = this.getAlertLevel(current, limit);
    const alertId = `${type}-${level}`;
    const percentage = current / limit;

    if (level !== 'normal') {
      const messages = {
        warning: `${type.charAt(0).toUpperCase() + type.slice(1)} spend at ${Math.round(percentage * 100)}% of limit`,
        critical: `${type.charAt(0).toUpperCase() + type.slice(1)} spend approaching limit (${Math.round(percentage * 100)}%)`,
        exceeded: `${type.charAt(0).toUpperCase() + type.slice(1)} budget exceeded!`,
      };

      this.addAlert({
        id: alertId,
        level,
        type,
        message: messages[level],
        currentValue: current,
        limit,
        percentage,
        timestamp,
      });
    } else {
      // Remove any previous alerts for this type
      this.alerts.delete(`${type}-warning`);
      this.alerts.delete(`${type}-critical`);
      this.alerts.delete(`${type}-exceeded`);
    }
  }

  private addAlert(alert: CostAlert): void {
    // Don't add if already dismissed
    const existing = this.alerts.get(alert.id);
    if (existing?.dismissed) return;

    this.alerts.set(alert.id, alert);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// Global instance
export const costMonitor = new CostMonitor();

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to access cost monitoring state
 */
export function useCostMonitor(): {
  status: BudgetStatus;
  costData: CostData;
  config: Required<BudgetConfig>;
  updateCosts: (data: Partial<CostData>) => void;
  updateConfig: (config: Partial<BudgetConfig>) => void;
  dismissAlert: (alertId: string) => void;
  resume: () => void;
} {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return costMonitor.subscribe(() => forceUpdate({}));
  }, []);

  return {
    status: costMonitor.getStatus(),
    costData: costMonitor.getCostData(),
    config: costMonitor.getConfig(),
    updateCosts: useCallback((data) => costMonitor.updateCosts(data), []),
    updateConfig: useCallback((config) => costMonitor.updateConfig(config), []),
    dismissAlert: useCallback((id) => costMonitor.dismissAlert(id), []),
    resume: useCallback(() => costMonitor.resume(), []),
  };
}

/**
 * Hook to get just the budget status
 */
export function useBudgetStatus(): BudgetStatus {
  const [status, setStatus] = useState<BudgetStatus>(costMonitor.getStatus());

  useEffect(() => {
    return costMonitor.subscribe(() => {
      setStatus(costMonitor.getStatus());
    });
  }, []);

  return status;
}

/**
 * Hook to get active alerts
 */
export function useCostAlerts(): {
  alerts: CostAlert[];
  dismiss: (alertId: string) => void;
  dismissAll: () => void;
} {
  const [alerts, setAlerts] = useState<CostAlert[]>([]);

  useEffect(() => {
    const update = () => {
      setAlerts(costMonitor.getStatus().alerts);
    };
    update();
    return costMonitor.subscribe(update);
  }, []);

  return {
    alerts,
    dismiss: useCallback((id) => costMonitor.dismissAlert(id), []),
    dismissAll: useCallback(() => {
      alerts.forEach((a) => costMonitor.dismissAlert(a.id));
    }, [alerts]),
  };
}

/**
 * Hook to sync cost data from town status
 */
export function useCostSync(townCostToday?: number, townCostRate?: number): void {
  const prevRef = useRef<{ today?: number; rate?: number }>({});

  useEffect(() => {
    if (
      townCostToday !== prevRef.current.today ||
      townCostRate !== prevRef.current.rate
    ) {
      costMonitor.updateCosts({
        today: townCostToday ?? 0,
        hourlyRate: townCostRate ?? 0,
      });
      prevRef.current = { today: townCostToday, rate: townCostRate };
    }
  }, [townCostToday, townCostRate]);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get color classes for alert level
 */
export function getAlertLevelColors(level: AlertLevel): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case 'exceeded':
      return {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/50',
      };
    case 'critical':
      return {
        bg: 'bg-orange-500/20',
        text: 'text-orange-400',
        border: 'border-orange-500/50',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/50',
      };
    default:
      return {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/50',
      };
  }
}

/**
 * Get icon name for alert level (for use with lucide-react)
 */
export function getAlertLevelIcon(level: AlertLevel): string {
  switch (level) {
    case 'exceeded':
      return 'AlertOctagon';
    case 'critical':
      return 'AlertTriangle';
    case 'warning':
      return 'AlertCircle';
    default:
      return 'CheckCircle';
  }
}
