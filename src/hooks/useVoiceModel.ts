/**
 * Voice Model Management Hooks
 *
 * Provides hooks for checking, downloading, and managing voice model files.
 * Integrates with the Tauri backend for file operations and chunked downloads.
 */

import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types (matching Rust structs)
// ============================================================================

export interface ModelFileStatus {
  name: string;
  path: string;
  exists: boolean;
  sizeBytes: number | null;
  expectedSizeBytes: number;
}

export interface VoiceModelStatus {
  installed: boolean;
  modelDir: string;
  files: ModelFileStatus[];
  serverBinaryExists: boolean;
  missingFiles: string[];
}

export interface ModelFileInfo {
  id: string;
  name: string;
  filename: string;
  url: string;
  sizeBytes: number;
  sha256: string | null;
}

export interface VoiceModelInfo {
  modelName: string;
  quantization: string;
  totalSizeBytes: number;
  modelDir: string;
  files: ModelFileInfo[];
}

export interface DiskSpaceInfo {
  availableBytes: number;
  totalBytes: number;
  requiredBytes: number;
  hasSufficientSpace: boolean;
}

export interface DownloadStatus {
  id: string;
  url: string;
  totalSize: number;
  downloaded: number;
  progress: number;
  status: 'pending' | 'downloading' | 'paused' | 'verifying' | 'complete' | 'failed';
  chunksCompleted: number;
  chunksTotal: number;
  error: string | null;
  outputPath: string;
}

export interface ModelDownloadProgress {
  fileId: string;
  filename: string;
  downloadId: string;
  bytesDownloaded: number;
  totalBytes: number;
  progress: number;
  status: DownloadStatus['status'];
  error?: string;
}

export interface OverallDownloadProgress {
  totalFiles: number;
  completedFiles: number;
  currentFile: string | null;
  totalBytes: number;
  downloadedBytes: number;
  overallProgress: number;
  status: 'idle' | 'checking' | 'downloading' | 'complete' | 'error';
  error?: string;
  fileProgress: ModelDownloadProgress[];
}

// ============================================================================
// Query Keys
// ============================================================================

const VOICE_MODEL_STATUS_KEY = ['voice', 'model', 'status'];
const VOICE_MODEL_INFO_KEY = ['voice', 'model', 'info'];
const DISK_SPACE_KEY = ['voice', 'model', 'diskSpace'];

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for checking voice model installation status
 */
export function useVoiceModelStatus() {
  return useQuery({
    queryKey: VOICE_MODEL_STATUS_KEY,
    queryFn: () => invoke<VoiceModelStatus>('check_voice_model_status'),
    staleTime: 10000, // 10 seconds
  });
}

/**
 * Hook for getting voice model download info
 */
export function useVoiceModelInfo() {
  return useQuery({
    queryKey: VOICE_MODEL_INFO_KEY,
    queryFn: () => invoke<VoiceModelInfo>('get_voice_model_info'),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for checking disk space
 */
export function useDiskSpace(requiredBytes?: number) {
  return useQuery({
    queryKey: [...DISK_SPACE_KEY, requiredBytes],
    queryFn: () => invoke<DiskSpaceInfo>('check_disk_space', { requiredBytes }),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook for managing voice model download process
 */
export function useVoiceModelDownload() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<OverallDownloadProgress>({
    totalFiles: 0,
    completedFiles: 0,
    currentFile: null,
    totalBytes: 0,
    downloadedBytes: 0,
    overallProgress: 0,
    status: 'idle',
    fileProgress: [],
  });

  // Listen for download progress events
  useEffect(() => {
    let unlistenProgress: (() => void) | null = null;
    let unlistenComplete: (() => void) | null = null;
    let unlistenError: (() => void) | null = null;

    const setupListeners = async () => {
      unlistenProgress = await listen<DownloadStatus>('download-progress', (event) => {
        const status = event.payload;
        setProgress(prev => {
          const fileProgress = prev.fileProgress.map(fp =>
            fp.downloadId === status.id
              ? {
                  ...fp,
                  bytesDownloaded: status.downloaded,
                  progress: status.progress,
                  status: status.status,
                }
              : fp
          );

          const downloadedBytes = fileProgress.reduce((sum, fp) => sum + fp.bytesDownloaded, 0);
          const overallProgress = prev.totalBytes > 0
            ? (downloadedBytes / prev.totalBytes) * 100
            : 0;

          return {
            ...prev,
            downloadedBytes,
            overallProgress,
            fileProgress,
          };
        });
      });

      unlistenComplete = await listen<string>('download-complete', (event) => {
        const downloadId = event.payload;
        setProgress(prev => {
          const fileProgress = prev.fileProgress.map(fp =>
            fp.downloadId === downloadId
              ? { ...fp, status: 'complete' as const, progress: 100 }
              : fp
          );

          const completedFiles = fileProgress.filter(fp => fp.status === 'complete').length;
          const isComplete = completedFiles === prev.totalFiles;

          return {
            ...prev,
            completedFiles,
            fileProgress,
            status: isComplete ? 'complete' : prev.status,
            currentFile: isComplete ? null : prev.currentFile,
          };
        });
      });

      unlistenError = await listen<[string, string]>('download-error', (event) => {
        const [downloadId, error] = event.payload;
        setProgress(prev => {
          const fileProgress = prev.fileProgress.map(fp =>
            fp.downloadId === downloadId
              ? { ...fp, status: 'failed' as const, error }
              : fp
          );

          return {
            ...prev,
            status: 'error',
            error: `Download failed: ${error}`,
            fileProgress,
          };
        });
      });
    };

    setupListeners();

    return () => {
      unlistenProgress?.();
      unlistenComplete?.();
      unlistenError?.();
    };
  }, []);

  // Start download mutation
  const startDownloadMutation = useMutation({
    mutationFn: async () => {
      // Reset progress
      setProgress(prev => ({
        ...prev,
        status: 'checking',
        error: undefined,
      }));

      // Prepare directory
      const modelDir = await invoke<string>('prepare_voice_model_directory');

      // Get model info
      const modelInfo = await invoke<VoiceModelInfo>('get_voice_model_info');

      // Check which files need downloading
      const modelStatus = await invoke<VoiceModelStatus>('check_voice_model_status');

      // Filter to only missing files
      const filesToDownload = modelInfo.files.filter(file =>
        modelStatus.missingFiles.some(missing =>
          missing.includes(file.filename) || file.filename.includes(missing)
        )
      );

      if (filesToDownload.length === 0) {
        setProgress(prev => ({
          ...prev,
          status: 'complete',
          overallProgress: 100,
        }));
        return;
      }

      // Calculate total size
      const totalBytes = filesToDownload.reduce((sum, f) => sum + f.sizeBytes, 0);

      // Initialize progress tracking
      const fileProgress: ModelDownloadProgress[] = filesToDownload.map(file => ({
        fileId: file.id,
        filename: file.filename,
        downloadId: '',
        bytesDownloaded: 0,
        totalBytes: file.sizeBytes,
        progress: 0,
        status: 'pending',
      }));

      setProgress({
        totalFiles: filesToDownload.length,
        completedFiles: 0,
        currentFile: filesToDownload[0].filename,
        totalBytes,
        downloadedBytes: 0,
        overallProgress: 0,
        status: 'downloading',
        fileProgress,
      });

      // Start downloads sequentially to avoid overwhelming the system
      for (let i = 0; i < filesToDownload.length; i++) {
        const file = filesToDownload[i];
        const outputPath = file.filename.includes('/')
          ? `${modelDir}/${file.filename}`
          : `${modelDir}/${file.filename}`;

        setProgress(prev => ({
          ...prev,
          currentFile: file.filename,
        }));

        try {
          const downloadId = await invoke<string>('start_chunked_download', {
            url: file.url,
            outputPath,
            expectedSha256: file.sha256,
          });

          // Update the download ID for this file
          setProgress(prev => ({
            ...prev,
            fileProgress: prev.fileProgress.map(fp =>
              fp.fileId === file.id
                ? { ...fp, downloadId, status: 'downloading' }
                : fp
            ),
          }));

          // Wait for this download to complete before starting next
          // (The event listeners will update progress)
          await waitForDownload(downloadId);
        } catch (error) {
          throw new Error(`Failed to download ${file.filename}: ${error}`);
        }
      }

      // Make server binary executable
      await invoke('make_server_executable');

      // Invalidate model status cache
      queryClient.invalidateQueries({ queryKey: VOICE_MODEL_STATUS_KEY });

      setProgress(prev => ({
        ...prev,
        status: 'complete',
        overallProgress: 100,
        currentFile: null,
      }));
    },
    onError: (error) => {
      setProgress(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }));
    },
  });

  const reset = useCallback(() => {
    setProgress({
      totalFiles: 0,
      completedFiles: 0,
      currentFile: null,
      totalBytes: 0,
      downloadedBytes: 0,
      overallProgress: 0,
      status: 'idle',
      fileProgress: [],
    });
  }, []);

  return {
    progress,
    isDownloading: progress.status === 'downloading' || progress.status === 'checking',
    isComplete: progress.status === 'complete',
    hasError: progress.status === 'error',
    startDownload: startDownloadMutation.mutate,
    reset,
  };
}

/**
 * Combined hook for voice model setup workflow
 */
export function useVoiceModelSetup() {
  const modelStatus = useVoiceModelStatus();
  const modelInfo = useVoiceModelInfo();
  const diskSpace = useDiskSpace(modelInfo.data?.totalSizeBytes);
  const download = useVoiceModelDownload();

  const isReady = modelStatus.data?.installed ?? false;
  const needsSetup = !isReady && !modelStatus.isLoading;
  const canDownload = diskSpace.data?.hasSufficientSpace ?? false;

  return {
    // Status
    isReady,
    needsSetup,
    canDownload,
    isLoading: modelStatus.isLoading || modelInfo.isLoading || diskSpace.isLoading,

    // Data
    modelStatus: modelStatus.data,
    modelInfo: modelInfo.data,
    diskSpace: diskSpace.data,

    // Download
    downloadProgress: download.progress,
    isDownloading: download.isDownloading,
    downloadComplete: download.isComplete,
    downloadError: download.hasError,
    startDownload: download.startDownload,
    resetDownload: download.reset,

    // Refresh
    refresh: () => {
      modelStatus.refetch();
      diskSpace.refetch();
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Wait for a download to complete
 */
async function waitForDownload(downloadId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      try {
        const status = await invoke<DownloadStatus>('get_download_status', { id: downloadId });
        if (status.status === 'complete') {
          clearInterval(checkInterval);
          resolve();
        } else if (status.status === 'failed') {
          clearInterval(checkInterval);
          reject(new Error(status.error || 'Download failed'));
        }
      } catch (error) {
        // Download might not exist yet, continue waiting
      }
    }, 500);

    // Timeout after 30 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Download timeout'));
    }, 30 * 60 * 1000);
  });
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
