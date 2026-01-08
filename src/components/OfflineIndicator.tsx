/**
 * Offline Status Indicator Component
 *
 * Displays network connectivity status and pending offline operations.
 * Accessible with proper ARIA roles and screen reader support.
 */

import { useState } from 'react';
import {
  Wifi,
  WifiOff,
  CloudOff,
  Cloud,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react';
import {
  useNetworkStatus,
  useOfflineState,
  useOfflineQueue,
  formatTimeAgo,
  type NetworkStatus,
} from '../lib/offline';
import { focusRingClasses } from '../lib/a11y';

// ============================================================================
// Network Status Icon
// ============================================================================

function NetworkIcon({
  status,
  className = '',
}: {
  status: NetworkStatus;
  className?: string;
}) {
  switch (status) {
    case 'offline':
      return <WifiOff className={className} aria-hidden="true" />;
    case 'slow':
      return <Wifi className={`${className} opacity-50`} aria-hidden="true" />;
    default:
      return <Wifi className={className} aria-hidden="true" />;
  }
}

// ============================================================================
// Compact Status Badge (for header)
// ============================================================================

export function OfflineStatusBadge() {
  const status = useNetworkStatus();
  const { pendingOperations } = useOfflineState();

  // Don't show anything when online with no pending operations
  if (status === 'online' && pendingOperations === 0) {
    return null;
  }

  const statusColors = {
    online: 'bg-green-500/20 text-green-400 border-green-500/50',
    slow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    offline: 'bg-red-500/20 text-red-400 border-red-500/50',
  };

  const statusLabels = {
    online: 'Online',
    slow: 'Slow Connection',
    offline: 'Offline',
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusColors[status]}`}
      role="status"
      aria-live="polite"
      aria-label={`Network status: ${statusLabels[status]}${
        pendingOperations > 0 ? `, ${pendingOperations} pending operations` : ''
      }`}
    >
      <NetworkIcon status={status} className="w-4 h-4" />
      <span className="text-sm font-medium">{statusLabels[status]}</span>
      {pendingOperations > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700">
          {pendingOperations}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Full Offline Status Panel
// ============================================================================

export function OfflineStatusPanel() {
  const status = useNetworkStatus();
  const offlineState = useOfflineState();
  const { queue, clear, isProcessing } = useOfflineQueue();
  const [isExpanded, setIsExpanded] = useState(false);

  const isOffline = status === 'offline';
  const hasPendingOps = offlineState.pendingOperations > 0;

  return (
    <section
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
      aria-labelledby="offline-status-heading"
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          id="offline-status-heading"
          className="text-lg font-semibold text-white flex items-center gap-2"
        >
          {isOffline ? (
            <CloudOff className="w-5 h-5 text-red-400" aria-hidden="true" />
          ) : (
            <Cloud className="w-5 h-5 text-green-400" aria-hidden="true" />
          )}
          Network Status
        </h2>
        {hasPendingOps && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-sm text-slate-400 hover:text-white transition-colors ${focusRingClasses}`}
            aria-expanded={isExpanded}
            aria-controls="pending-operations"
          >
            {isExpanded ? 'Hide' : 'Show'} pending ({offlineState.pendingOperations})
          </button>
        )}
      </div>

      {/* Connection Status */}
      <div className="space-y-3">
        <ConnectionStatusRow status={status} />

        {/* Last Online */}
        {offlineState.lastOnline && isOffline && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>Last online: {formatTimeAgo(offlineState.lastOnline)}</span>
          </div>
        )}

        {/* Sync Status */}
        {offlineState.lastSync && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <RefreshCw
              className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>
              {isProcessing
                ? 'Syncing...'
                : `Last sync: ${formatTimeAgo(offlineState.lastSync)}`}
            </span>
          </div>
        )}
      </div>

      {/* Pending Operations List */}
      {isExpanded && hasPendingOps && (
        <div
          id="pending-operations"
          className="mt-4 pt-4 border-t border-slate-700"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-400">
              Pending Operations
            </h3>
            <button
              onClick={clear}
              className={`text-xs text-red-400 hover:text-red-300 transition-colors ${focusRingClasses}`}
              aria-label="Clear all pending operations"
            >
              Clear all
            </button>
          </div>
          <ul className="space-y-2" aria-label="Pending operations list">
            {queue.slice(0, 5).map((op) => (
              <li
                key={op.id}
                className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm text-white">{op.type}</p>
                  <p className="text-xs text-slate-400">
                    {formatTimeAgo(op.timestamp)}
                    {op.retries > 0 && ` (${op.retries} retries)`}
                  </p>
                </div>
                {op.status === 'pending' && (
                  <Clock className="w-4 h-4 text-yellow-400" aria-label="Pending" />
                )}
                {op.status === 'processing' && (
                  <RefreshCw
                    className="w-4 h-4 text-cyan-400 animate-spin"
                    aria-label="Processing"
                  />
                )}
                {op.status === 'failed' && (
                  <AlertTriangle className="w-4 h-4 text-red-400" aria-label="Failed" />
                )}
              </li>
            ))}
            {queue.length > 5 && (
              <li className="text-sm text-slate-500 text-center py-1">
                +{queue.length - 5} more operations
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Offline Warning */}
      {isOffline && (
        <div
          className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg"
          role="alert"
        >
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">You're Offline</span>
          </div>
          <p className="text-sm text-red-400/80 mt-1">
            Changes will be saved locally and synced when you're back online.
          </p>
        </div>
      )}

      {/* Slow Connection Warning */}
      {status === 'slow' && (
        <div
          className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg"
          role="alert"
        >
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">Slow Connection</span>
          </div>
          <p className="text-sm text-yellow-400/80 mt-1">
            Some features may be delayed. Data is being cached for offline use.
          </p>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Connection Status Row
// ============================================================================

function ConnectionStatusRow({ status }: { status: NetworkStatus }) {
  const statusConfig = {
    online: {
      icon: CheckCircle,
      label: 'Connected',
      color: 'text-green-400',
      bg: 'bg-green-500/20',
    },
    slow: {
      icon: AlertTriangle,
      label: 'Slow Connection',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
    },
    offline: {
      icon: WifiOff,
      label: 'Disconnected',
      color: 'text-red-400',
      bg: 'bg-red-500/20',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg ${config.bg}`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`w-5 h-5 ${config.color}`} aria-hidden="true" />
      <span className={`font-medium ${config.color}`}>{config.label}</span>
    </div>
  );
}

// ============================================================================
// Offline Toast Notification
// ============================================================================

interface OfflineToastProps {
  onDismiss: () => void;
}

export function OfflineToast({ onDismiss }: OfflineToastProps) {
  const status = useNetworkStatus();

  if (status === 'online') return null;

  const isOffline = status === 'offline';

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
        isOffline
          ? 'bg-red-900/90 border-red-500/50'
          : 'bg-yellow-900/90 border-yellow-500/50'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <NetworkIcon
        status={status}
        className={`w-5 h-5 ${isOffline ? 'text-red-400' : 'text-yellow-400'}`}
      />
      <div>
        <p className={`font-medium ${isOffline ? 'text-red-300' : 'text-yellow-300'}`}>
          {isOffline ? "You're offline" : 'Slow connection'}
        </p>
        <p className="text-sm text-slate-300">
          {isOffline
            ? 'Changes will sync when back online'
            : 'Some features may be slower'}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className={`p-1 rounded hover:bg-slate-700/50 transition-colors ${focusRingClasses}`}
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
      </button>
    </div>
  );
}

// ============================================================================
// Sync Progress Indicator
// ============================================================================

export function SyncProgressIndicator() {
  const { isProcessing } = useOfflineQueue();
  const { pendingOperations } = useOfflineState();

  if (!isProcessing || pendingOperations === 0) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/50 rounded-full"
      role="status"
      aria-live="polite"
      aria-label={`Syncing ${pendingOperations} operations`}
    >
      <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" aria-hidden="true" />
      <span className="text-sm text-cyan-400 font-medium">
        Syncing ({pendingOperations})
      </span>
    </div>
  );
}

// ============================================================================
// Hook to manage offline toast visibility
// ============================================================================

export function useOfflineToast() {
  const [isDismissed, setIsDismissed] = useState(false);
  const status = useNetworkStatus();

  // Reset dismissal when status changes
  const handleDismiss = () => setIsDismissed(true);

  // Auto-reset when going back online
  if (status === 'online' && isDismissed) {
    setIsDismissed(false);
  }

  return {
    showToast: !isDismissed && status !== 'online',
    dismiss: handleDismiss,
  };
}
