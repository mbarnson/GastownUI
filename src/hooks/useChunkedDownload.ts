import { useState, useCallback, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'

export type DownloadState =
  | 'pending'
  | 'downloading'
  | 'paused'
  | 'verifying'
  | 'complete'
  | 'failed'

export interface DownloadStatus {
  id: string
  url: string
  totalSize: number
  downloaded: number
  progress: number // 0-100
  status: DownloadState
  chunksCompleted: number
  chunksTotal: number
  error?: string
  sha256?: string
  outputPath: string
}

export interface UseChunkedDownloadReturn {
  /** Start a new download */
  startDownload: (
    url: string,
    outputPath: string,
    expectedSha256?: string
  ) => Promise<string>
  /** Pause an active download */
  pauseDownload: (id: string) => Promise<void>
  /** Resume a paused download */
  resumeDownload: (id: string) => Promise<void>
  /** Cancel and remove a download */
  cancelDownload: (id: string) => Promise<void>
  /** Get status of a specific download */
  getStatus: (id: string) => Promise<DownloadStatus>
  /** List all downloads */
  listDownloads: () => Promise<DownloadStatus[]>
  /** Current download status (for single download use case) */
  currentDownload: DownloadStatus | null
  /** All active downloads */
  downloads: Map<string, DownloadStatus>
  /** Whether any download is active */
  isDownloading: boolean
  /** Error message if any */
  error: string | null
}

/**
 * Hook for managing chunked downloads with progress tracking
 *
 * Features:
 * - 64MB chunks for efficient downloading
 * - Up to 8 parallel chunk downloads
 * - Resume support for interrupted downloads
 * - SHA256 verification
 * - Real-time progress events
 *
 * @example
 * ```tsx
 * const { startDownload, currentDownload, isDownloading } = useChunkedDownload()
 *
 * // Start download
 * const id = await startDownload(
 *   'https://example.com/model.bin',
 *   '/path/to/model.bin',
 *   'expected-sha256-hash'
 * )
 *
 * // Show progress
 * {isDownloading && (
 *   <ProgressBar value={currentDownload?.progress || 0} />
 * )}
 * ```
 */
export function useChunkedDownload(): UseChunkedDownloadReturn {
  const [downloads, setDownloads] = useState<Map<string, DownloadStatus>>(
    new Map()
  )
  const [currentDownload, setCurrentDownload] = useState<DownloadStatus | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  // Listen for download events
  useEffect(() => {
    const unlisteners: UnlistenFn[] = []

    const setupListeners = async () => {
      // Progress updates
      unlisteners.push(
        await listen<DownloadStatus>('download-progress', (event) => {
          const status = event.payload
          setDownloads((prev) => {
            const next = new Map(prev)
            next.set(status.id, status)
            return next
          })
          setCurrentDownload(status)
        })
      )

      // Download started
      unlisteners.push(
        await listen<DownloadStatus>('download-started', (event) => {
          const status = event.payload
          setDownloads((prev) => {
            const next = new Map(prev)
            next.set(status.id, status)
            return next
          })
          setCurrentDownload(status)
          setError(null)
        })
      )

      // Download complete
      unlisteners.push(
        await listen<string>('download-complete', (event) => {
          const id = event.payload
          setDownloads((prev) => {
            const next = new Map(prev)
            const download = next.get(id)
            if (download) {
              next.set(id, { ...download, status: 'complete', progress: 100 })
            }
            return next
          })
          setCurrentDownload((prev) =>
            prev?.id === id ? { ...prev, status: 'complete', progress: 100 } : prev
          )
        })
      )

      // Download error
      unlisteners.push(
        await listen<[string, string]>('download-error', (event) => {
          const [id, errorMsg] = event.payload
          setDownloads((prev) => {
            const next = new Map(prev)
            const download = next.get(id)
            if (download) {
              next.set(id, { ...download, status: 'failed', error: errorMsg })
            }
            return next
          })
          setCurrentDownload((prev) =>
            prev?.id === id ? { ...prev, status: 'failed', error: errorMsg } : prev
          )
          setError(errorMsg)
        })
      )

      // Verifying
      unlisteners.push(
        await listen<string>('download-verifying', (event) => {
          const id = event.payload
          setDownloads((prev) => {
            const next = new Map(prev)
            const download = next.get(id)
            if (download) {
              next.set(id, { ...download, status: 'verifying' })
            }
            return next
          })
          setCurrentDownload((prev) =>
            prev?.id === id ? { ...prev, status: 'verifying' } : prev
          )
        })
      )
    }

    setupListeners()

    return () => {
      unlisteners.forEach((unlisten) => unlisten())
    }
  }, [])

  const startDownload = useCallback(
    async (
      url: string,
      outputPath: string,
      expectedSha256?: string
    ): Promise<string> => {
      setError(null)
      try {
        const id = await invoke<string>('start_chunked_download', {
          url,
          outputPath,
          expectedSha256,
        })
        return id
      } catch (e) {
        const msg = String(e)
        setError(msg)
        throw new Error(msg)
      }
    },
    []
  )

  const pauseDownload = useCallback(async (id: string): Promise<void> => {
    try {
      await invoke('pause_download', { id })
      setDownloads((prev) => {
        const next = new Map(prev)
        const download = next.get(id)
        if (download) {
          next.set(id, { ...download, status: 'paused' })
        }
        return next
      })
      setCurrentDownload((prev) =>
        prev?.id === id ? { ...prev, status: 'paused' } : prev
      )
    } catch (e) {
      setError(String(e))
      throw e
    }
  }, [])

  const resumeDownload = useCallback(async (id: string): Promise<void> => {
    try {
      await invoke('resume_download', { id })
      setDownloads((prev) => {
        const next = new Map(prev)
        const download = next.get(id)
        if (download) {
          next.set(id, { ...download, status: 'downloading' })
        }
        return next
      })
      setCurrentDownload((prev) =>
        prev?.id === id ? { ...prev, status: 'downloading' } : prev
      )
    } catch (e) {
      setError(String(e))
      throw e
    }
  }, [])

  const cancelDownload = useCallback(async (id: string): Promise<void> => {
    try {
      await invoke('cancel_download', { id })
      setDownloads((prev) => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
      setCurrentDownload((prev) => (prev?.id === id ? null : prev))
    } catch (e) {
      setError(String(e))
      throw e
    }
  }, [])

  const getStatus = useCallback(async (id: string): Promise<DownloadStatus> => {
    return invoke<DownloadStatus>('get_download_status', { id })
  }, [])

  const listDownloads = useCallback(async (): Promise<DownloadStatus[]> => {
    return invoke<DownloadStatus[]>('list_downloads')
  }, [])

  const isDownloading = Array.from(downloads.values()).some(
    (d) => d.status === 'downloading' || d.status === 'verifying'
  )

  return {
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    getStatus,
    listDownloads,
    currentDownload,
    downloads,
    isDownloading,
    error,
  }
}

export default useChunkedDownload
