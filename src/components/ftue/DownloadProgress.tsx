import { useEffect } from 'react'
import { Download, CheckCircle, AlertCircle, Pause, Play, X } from 'lucide-react'
import { useFTUE, DownloadProgress as DownloadProgressType } from '../../contexts/FTUEContext'
import { useLiveRegion } from '../a11y/LiveRegion'
import { ProgressRing, StagedReveal } from './TheatricalTransition'

interface DownloadProgressProps {
  /** Called when all downloads complete */
  onComplete?: () => void
  /** Show individual file progress */
  showDetails?: boolean
}

/**
 * Download progress display for FTUE
 * Shows chunked download progress for voice models and assets
 */
export default function DownloadProgressDisplay({
  onComplete,
  showDetails = true,
}: DownloadProgressProps) {
  const {
    state,
    nextStage,
    updateDownload,
    touchInteraction,
  } = useFTUE()
  const { announce } = useLiveRegion()

  // Check for completion
  useEffect(() => {
    if (state.overallDownloadProgress >= 100 && state.downloads.length > 0) {
      const allComplete = state.downloads.every(d => d.status === 'complete')
      if (allComplete) {
        announce('All downloads complete')
        onComplete?.()
      }
    }
  }, [state.overallDownloadProgress, state.downloads, announce, onComplete])

  const handlePauseResume = (download: DownloadProgressType) => {
    touchInteraction()
    const newStatus = download.status === 'downloading' ? 'paused' : 'downloading'
    updateDownload(download.id, { status: newStatus })
    announce(newStatus === 'paused' ? `Paused ${download.name}` : `Resuming ${download.name}`)
  }

  const handleRetry = (download: DownloadProgressType) => {
    touchInteraction()
    updateDownload(download.id, {
      status: 'downloading',
      bytesDownloaded: 0,
      error: undefined,
    })
    announce(`Retrying ${download.name}`)
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const getStatusIcon = (status: DownloadProgressType['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-400" />
      default:
        return <Download className="w-5 h-5 text-cyan-400 animate-pulse" />
    }
  }

  const activeDownloads = state.downloads.filter(d => d.status === 'downloading')
  const completedDownloads = state.downloads.filter(d => d.status === 'complete')
  const errorDownloads = state.downloads.filter(d => d.status === 'error')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-lg w-full">
        {/* Main progress ring */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <ProgressRing
              progress={state.overallDownloadProgress}
              size={120}
              strokeWidth={8}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {Math.round(state.overallDownloadProgress)}%
              </span>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mb-1">
            {state.overallDownloadProgress >= 100
              ? 'Downloads Complete!'
              : 'Downloading Assets'}
          </h2>
          <p className="text-slate-400 text-sm">
            {activeDownloads.length > 0
              ? `${activeDownloads.length} file${activeDownloads.length > 1 ? 's' : ''} in progress`
              : completedDownloads.length > 0
                ? `${completedDownloads.length} file${completedDownloads.length > 1 ? 's' : ''} downloaded`
                : 'Preparing downloads...'}
          </p>
        </div>

        {/* Download list */}
        {showDetails && state.downloads.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <StagedReveal
              staggerDelay={100}
              containerClassName="divide-y divide-slate-700"
            >
              {state.downloads.map((download) => {
                const progress = download.totalBytes > 0
                  ? (download.bytesDownloaded / download.totalBytes) * 100
                  : 0

                return (
                  <div
                    key={download.id}
                    className="p-4 flex items-center gap-4"
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {getStatusIcon(download.status)}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-white truncate">
                          {download.name}
                        </p>
                        <p className="text-xs text-slate-400 ml-2">
                          {formatBytes(download.bytesDownloaded)} / {formatBytes(download.totalBytes)}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`
                            h-full rounded-full transition-all duration-300
                            ${download.status === 'complete' ? 'bg-green-500' : ''}
                            ${download.status === 'error' ? 'bg-red-500' : ''}
                            ${download.status === 'paused' ? 'bg-yellow-500' : ''}
                            ${download.status === 'downloading' ? 'bg-cyan-500' : ''}
                            ${download.status === 'pending' ? 'bg-slate-600' : ''}
                          `}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {/* Error message */}
                      {download.error && (
                        <p className="text-xs text-red-400 mt-1">
                          {download.error}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0">
                      {download.status === 'downloading' && (
                        <button
                          onClick={() => handlePauseResume(download)}
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                          aria-label="Pause download"
                        >
                          <Pause className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                      {download.status === 'paused' && (
                        <button
                          onClick={() => handlePauseResume(download)}
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                          aria-label="Resume download"
                        >
                          <Play className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                      {download.status === 'error' && (
                        <button
                          onClick={() => handleRetry(download)}
                          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                          aria-label="Retry download"
                        >
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </StagedReveal>
          </div>
        )}

        {/* Summary stats */}
        {state.downloads.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-slate-400">
                {completedDownloads.length} complete
              </span>
            </div>
            {activeDownloads.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-slate-400">
                  {activeDownloads.length} active
                </span>
              </div>
            )}
            {errorDownloads.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-slate-400">
                  {errorDownloads.length} failed
                </span>
              </div>
            )}
          </div>
        )}

        {/* Continue button (when complete) */}
        {state.overallDownloadProgress >= 100 && (
          <button
            onClick={() => {
              touchInteraction()
              nextStage()
              onComplete?.()
            }}
            className="w-full mt-8 px-6 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-cyan-500/20"
          >
            Continue to Setup
          </button>
        )}

        {/* Tip */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Downloads run in the background. You can minimize this window.
        </p>
      </div>
    </div>
  )
}

/**
 * Compact download indicator for header/status bar
 */
interface CompactDownloadIndicatorProps {
  onClick?: () => void
}

export function CompactDownloadIndicator({ onClick }: CompactDownloadIndicatorProps) {
  const { state } = useFTUE()

  if (state.downloads.length === 0 || state.overallDownloadProgress >= 100) {
    return null
  }

  const activeCount = state.downloads.filter(d => d.status === 'downloading').length

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 transition-colors"
      aria-label={`${activeCount} downloads in progress, ${Math.round(state.overallDownloadProgress)}% complete`}
    >
      <ProgressRing
        progress={state.overallDownloadProgress}
        size={20}
        strokeWidth={2}
      />
      <span className="text-sm text-slate-300">
        {Math.round(state.overallDownloadProgress)}%
      </span>
    </button>
  )
}
