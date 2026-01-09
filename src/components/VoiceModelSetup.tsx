/**
 * Voice Model Setup Component
 *
 * Handles checking for and downloading the LFM2.5-Audio voice model.
 * Shows download progress and handles disk space validation.
 */

import { useState } from 'react';
import {
  Download,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Mic,
  ArrowRight,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  useVoiceModelSetup,
  formatBytes,
} from '../hooks/useVoiceModel';

interface VoiceModelSetupProps {
  /** Called when setup is complete or skipped */
  onComplete?: () => void;
  /** Called when user dismisses the setup */
  onDismiss?: () => void;
  /** Show as a modal overlay */
  modal?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
}

/**
 * Full-page voice model setup component
 */
export function VoiceModelSetup({
  onComplete,
  onDismiss,
  modal = false,
  compact = false,
}: VoiceModelSetupProps) {
  const {
    isReady,
    needsSetup,
    canDownload,
    isLoading,
    modelStatus,
    modelInfo,
    diskSpace,
    downloadProgress,
    isDownloading,
    downloadComplete,
    downloadError,
    startDownload,
    resetDownload,
    refresh,
  } = useVoiceModelSetup();

  const [showDetails, setShowDetails] = useState(false);

  // If model is ready, don't show anything
  if (isReady && !downloadComplete) {
    onComplete?.();
    return null;
  }

  // Show completion state
  if (downloadComplete) {
    return (
      <SetupContainer modal={modal} compact={compact}>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Voice Model Ready
          </h2>
          <p className="text-slate-400 mb-6">
            The LFM2.5-Audio model has been installed successfully.
            Voice features are now available.
          </p>
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl transition-colors"
          >
            Continue
          </button>
        </div>
      </SetupContainer>
    );
  }

  // Show error state
  if (downloadError) {
    return (
      <SetupContainer modal={modal} compact={compact}>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Download Failed
          </h2>
          <p className="text-slate-400 mb-2">
            {downloadProgress.error || 'An error occurred during download.'}
          </p>
          <p className="text-slate-500 text-sm mb-6">
            Please check your internet connection and try again.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                resetDownload();
                refresh();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Skip for Now
              </button>
            )}
          </div>
        </div>
      </SetupContainer>
    );
  }

  // Show download progress
  if (isDownloading) {
    return (
      <SetupContainer modal={modal} compact={compact}>
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <ProgressRing progress={downloadProgress.overallProgress} size={80} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {Math.round(downloadProgress.overallProgress)}%
                </span>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-white mb-1">
              Downloading Voice Model
            </h2>
            <p className="text-slate-400 text-sm">
              {downloadProgress.currentFile
                ? `Downloading ${downloadProgress.currentFile}...`
                : 'Preparing download...'}
            </p>
          </div>

          {/* Progress details */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Progress</span>
              <span className="text-white">
                {formatBytes(downloadProgress.downloadedBytes)} / {formatBytes(downloadProgress.totalBytes)}
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.overallProgress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {downloadProgress.completedFiles} of {downloadProgress.totalFiles} files complete
            </div>
          </div>

          {/* File list (collapsed by default) */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>

          {showDetails && (
            <div className="mt-3 space-y-2">
              {downloadProgress.fileProgress.map((file) => (
                <div
                  key={file.fileId}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="flex-shrink-0">
                    {file.status === 'complete' ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : file.status === 'downloading' ? (
                      <Download className="w-4 h-4 text-cyan-400 animate-pulse" />
                    ) : file.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600" />
                    )}
                  </div>
                  <span className="flex-1 text-slate-300 truncate">
                    {file.filename.split('/').pop()}
                  </span>
                  <span className="text-slate-500">
                    {Math.round(file.progress)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-slate-500 mt-4">
            Download runs in the background. You can minimize this window.
          </p>
        </div>
      </SetupContainer>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <SetupContainer modal={modal} compact={compact}>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Checking voice model status...</p>
        </div>
      </SetupContainer>
    );
  }

  // Show setup prompt
  return (
    <SetupContainer modal={modal} compact={compact} onDismiss={onDismiss}>
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
          <Mic className="w-10 h-10 text-cyan-400" />
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl font-semibold text-white mb-2">
          Enable Voice Features
        </h2>
        <p className="text-slate-400 mb-6 max-w-sm">
          Download the LFM2.5-Audio model to enable voice commands,
          speech recognition, and text-to-speech in Gas Town.
        </p>

        {/* Model Info */}
        {modelInfo && (
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 mb-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-slate-400">Model</span>
              <span className="text-sm text-white font-medium">
                {modelInfo.modelName}
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-slate-400">Quantization</span>
              <span className="text-sm text-white">
                {modelInfo.quantization}
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-slate-400">Download Size</span>
              <span className="text-sm text-white">
                {formatBytes(modelInfo.totalSizeBytes)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Files</span>
              <span className="text-sm text-white">
                {modelStatus?.missingFiles.length || modelInfo.files.length} to download
              </span>
            </div>
          </div>
        )}

        {/* Disk Space Warning */}
        {diskSpace && !diskSpace.hasSufficientSpace && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6 w-full max-w-sm">
            <div className="flex items-start gap-2">
              <HardDrive className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-amber-300 font-medium">
                  Insufficient disk space
                </p>
                <p className="text-xs text-amber-400/80 mt-1">
                  {formatBytes(diskSpace.availableBytes)} available,{' '}
                  {formatBytes(diskSpace.requiredBytes)} required
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            onClick={() => startDownload()}
            disabled={!canDownload}
            className={`
              flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium transition-colors
              ${canDownload
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'}
            `}
          >
            <Download className="w-5 h-5" />
            Download Model
            <ArrowRight className="w-4 h-4" />
          </button>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm text-slate-400 hover:text-white transition-colors py-2"
            >
              Skip for now (voice features disabled)
            </button>
          )}
        </div>

        {/* Storage Location */}
        {modelInfo && (
          <p className="text-xs text-slate-500 mt-4">
            Will be saved to: {modelInfo.modelDir}
          </p>
        )}
      </div>
    </SetupContainer>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface SetupContainerProps {
  children: React.ReactNode;
  modal?: boolean;
  compact?: boolean;
  onDismiss?: () => void;
}

function SetupContainer({ children, modal, compact, onDismiss }: SetupContainerProps) {
  if (compact) {
    return (
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-6">
        {children}
      </div>
    );
  }

  if (modal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-8">
      {/* Background effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 bg-slate-900/80 border border-slate-800 rounded-2xl p-8 max-w-lg w-full backdrop-blur-sm">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

function ProgressRing({ progress, size = 60, strokeWidth = 4 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-700"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-cyan-500 transition-all duration-300"
      />
    </svg>
  );
}

// ============================================================================
// Compact Banner Component
// ============================================================================

interface VoiceModelBannerProps {
  onSetup?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Compact banner to show when voice model is not installed
 */
export function VoiceModelBanner({ onSetup, onDismiss, className = '' }: VoiceModelBannerProps) {
  const { needsSetup, modelInfo, isLoading } = useVoiceModelSetup();

  if (isLoading || !needsSetup) {
    return null;
  }

  return (
    <div className={`bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Mic className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-cyan-300">
              Voice features available
            </p>
            <p className="text-xs text-cyan-400/70">
              Download {modelInfo ? formatBytes(modelInfo.totalSizeBytes) : 'model'} to enable
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSetup}
            className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Setup
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default VoiceModelSetup;
