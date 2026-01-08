import { useNavigate } from '@tanstack/react-router';
import { useSetupPreferences } from '../hooks/useSetupPreferences';
import { useSetupStatus, isSetupComplete } from '../hooks/useSetup';
import { AlertTriangle, X, ArrowRight, RefreshCw } from 'lucide-react';

interface SetupBannerProps {
  className?: string;
}

/**
 * Persistent banner shown when setup was skipped or is incomplete.
 * Per FTUE.md: "Users can skip FTUE at any time. The dashboard shows a persistent banner."
 */
export function SetupBanner({ className = '' }: SetupBannerProps) {
  const navigate = useNavigate();
  const { preferences, isLoaded, dismissBanner, resetSkip, isInterrupted } = useSetupPreferences();
  const { data: status } = useSetupStatus();

  // Don't show if:
  // - Not loaded yet
  // - Banner was dismissed
  // - Setup is complete (both Go and Beads installed)
  // - Setup was never skipped and not interrupted
  if (!isLoaded) return null;
  if (preferences.setupDismissed) return null;
  if (status && isSetupComplete(status)) return null;
  if (!preferences.setupSkipped && !isInterrupted) return null;

  const handleCompleteSetup = () => {
    resetSkip(); // Clear the skip flag
    navigate({ to: '/ftue' });
  };

  const handleDismiss = () => {
    dismissBanner();
  };

  // Different messages for skipped vs interrupted
  const message = isInterrupted
    ? "Setup was interrupted. Resume to enable all features."
    : "Gas Town not configured. Complete setup to enable all features.";

  const buttonText = isInterrupted ? "Resume Setup" : "Complete Setup";

  return (
    <div
      className={`bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg">
          {isInterrupted ? (
            <RefreshCw className="w-5 h-5 text-amber-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
        </div>
        <p className="text-sm text-amber-300">{message}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCompleteSetup}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-sm transition-colors"
        >
          {buttonText}
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default SetupBanner;
