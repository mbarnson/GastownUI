/**
 * Offline Mode Support
 *
 * Provides network connectivity detection, data caching, and offline operation queuing.
 * Enables graceful degradation when network is unavailable.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export type NetworkStatus = 'online' | 'offline' | 'slow';

export interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

export interface QueuedOperation {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface OfflineState {
  isOnline: boolean;
  networkStatus: NetworkStatus;
  lastOnline: number | null;
  queuedOperations: number;
  cacheSize: number;
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_PREFIX = 'gastown_cache_';
const QUEUE_KEY = 'gastown_offline_queue';
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
const SLOW_CONNECTION_THRESHOLD = 500; // ms

// ============================================================================
// Network Status Detection
// ============================================================================

class NetworkMonitor {
  private status: NetworkStatus = 'online';
  private lastOnline: number | null = Date.now();
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private latencyHistory: number[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.status = navigator.onLine ? 'online' : 'offline';

      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);

      // Start latency monitoring
      this.startLatencyMonitoring();
    }
  }

  private handleOnline = () => {
    this.status = 'online';
    this.lastOnline = Date.now();
    this.notifyListeners();
  };

  private handleOffline = () => {
    this.status = 'offline';
    this.notifyListeners();
  };

  private startLatencyMonitoring() {
    // Check latency periodically
    this.pingInterval = setInterval(() => {
      this.measureLatency();
    }, 30000); // Every 30 seconds
  }

  private async measureLatency() {
    if (!navigator.onLine) return;

    const start = performance.now();
    try {
      // Use a tiny request to measure latency
      await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-store',
      }).catch(() => {
        // Fallback: just check if we can make any request
      });
      const latency = performance.now() - start;

      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > 10) {
        this.latencyHistory.shift();
      }

      const avgLatency =
        this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length;

      const newStatus: NetworkStatus =
        avgLatency > SLOW_CONNECTION_THRESHOLD ? 'slow' : 'online';

      if (newStatus !== this.status && this.status !== 'offline') {
        this.status = newStatus;
        this.notifyListeners();
      }
    } catch {
      // Request failed, might be offline
      if (this.status === 'online') {
        this.status = 'slow';
        this.notifyListeners();
      }
    }
  }

  getStatus(): NetworkStatus {
    return this.status;
  }

  getLastOnline(): number | null {
    return this.lastOnline;
  }

  isOnline(): boolean {
    return this.status !== 'offline';
  }

  subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.status));
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
  }
}

// Global network monitor instance
export const networkMonitor = new NetworkMonitor();

// ============================================================================
// Data Cache
// ============================================================================

class DataCache {
  private memoryCache: Map<string, CachedData<unknown>> = new Map();

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const cacheKey = CACHE_PREFIX + key;

    // Try memory cache first
    const memoryData = this.memoryCache.get(cacheKey);
    if (memoryData) {
      if (!memoryData.expiresAt || memoryData.expiresAt > Date.now()) {
        return memoryData.data as T;
      }
      this.memoryCache.delete(cacheKey);
    }

    // Try localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed: CachedData<T> = JSON.parse(stored);
          if (!parsed.expiresAt || parsed.expiresAt > Date.now()) {
            // Restore to memory cache
            this.memoryCache.set(cacheKey, parsed);
            return parsed.data;
          }
          // Expired, remove it
          localStorage.removeItem(cacheKey);
        }
      } catch {
        // Parse error, ignore
      }
    }

    return null;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_CACHE_TTL): void {
    const cacheKey = CACHE_PREFIX + key;
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    // Store in memory
    this.memoryCache.set(cacheKey, cached);

    // Store in localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cached));
      } catch (e) {
        // Storage full, try to clear old entries
        this.clearExpired();
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cached));
        } catch {
          // Still failed, just use memory cache
        }
      }
    }
  }

  /**
   * Remove cached data
   */
  remove(key: string): void {
    const cacheKey = CACHE_PREFIX + key;
    this.memoryCache.delete(cacheKey);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(cacheKey);
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.memoryCache.clear();
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();

    // Clear memory cache
    for (const [key, value] of this.memoryCache) {
      if (value.expiresAt && value.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }

    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.expiresAt && parsed.expiresAt < now) {
                keysToRemove.push(key);
              }
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
  }

  /**
   * Get cache size in bytes
   */
  getSize(): number {
    let size = 0;
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          const value = localStorage.getItem(key);
          if (value) {
            size += key.length + value.length;
          }
        }
      }
    }
    return size * 2; // UTF-16
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    const keys: string[] = [];
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
          keys.push(key.replace(CACHE_PREFIX, ''));
        }
      }
    }
    return keys;
  }
}

// Global cache instance
export const dataCache = new DataCache();

// ============================================================================
// Operation Queue
// ============================================================================

class OperationQueue {
  private queue: QueuedOperation[] = [];
  private processing: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Load queue from storage
    this.loadQueue();

    // Process queue when coming online
    networkMonitor.subscribe((status) => {
      if (status === 'online') {
        this.processQueue();
      }
    });
  }

  private loadQueue(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(QUEUE_KEY);
        if (stored) {
          this.queue = JSON.parse(stored);
        }
      } catch {
        this.queue = [];
      }
    }
  }

  private saveQueue(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
      } catch {
        // Storage full
      }
    }
    this.notifyListeners();
  }

  /**
   * Add an operation to the queue
   */
  enqueue(
    type: string,
    payload: unknown,
    maxRetries: number = 3
  ): string {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const operation: QueuedOperation = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
      maxRetries,
    };

    this.queue.push(operation);
    this.saveQueue();

    // Try to process immediately if online
    if (networkMonitor.isOnline()) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Remove an operation from the queue
   */
  dequeue(id: string): void {
    this.queue = this.queue.filter((op) => op.id !== id);
    this.saveQueue();
  }

  /**
   * Get all queued operations
   */
  getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  /**
   * Get queue length
   */
  getLength(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Process the queue
   */
  async processQueue(): Promise<void> {
    if (this.processing || !networkMonitor.isOnline() || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && networkMonitor.isOnline()) {
      const operation = this.queue[0];

      try {
        // Dispatch operation to handlers
        await this.executeOperation(operation);
        this.queue.shift();
        this.saveQueue();
      } catch (error) {
        operation.retries++;
        if (operation.retries >= operation.maxRetries) {
          // Max retries reached, remove from queue
          console.error(`Operation ${operation.id} failed after ${operation.retries} retries`);
          this.queue.shift();
        }
        this.saveQueue();
        break; // Stop processing on error
      }
    }

    this.processing = false;
  }

  private async executeOperation(operation: QueuedOperation): Promise<void> {
    // This would be connected to actual API calls
    // For now, just simulate execution
    console.log(`Executing queued operation: ${operation.type}`, operation.payload);

    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// Global queue instance
export const operationQueue = new OperationQueue();

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to get network status
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(networkMonitor.getStatus());

  useEffect(() => {
    return networkMonitor.subscribe(setStatus);
  }, []);

  return status;
}

/**
 * Hook to check if online
 */
export function useIsOnline(): boolean {
  const status = useNetworkStatus();
  return status !== 'offline';
}

/**
 * Hook to get full offline state
 */
export function useOfflineState(): OfflineState {
  const [state, setState] = useState<OfflineState>({
    isOnline: networkMonitor.isOnline(),
    networkStatus: networkMonitor.getStatus(),
    lastOnline: networkMonitor.getLastOnline(),
    queuedOperations: operationQueue.getLength(),
    cacheSize: dataCache.getSize(),
  });

  useEffect(() => {
    const update = () => {
      setState({
        isOnline: networkMonitor.isOnline(),
        networkStatus: networkMonitor.getStatus(),
        lastOnline: networkMonitor.getLastOnline(),
        queuedOperations: operationQueue.getLength(),
        cacheSize: dataCache.getSize(),
      });
    };

    const unsubNetwork = networkMonitor.subscribe(update);
    const unsubQueue = operationQueue.subscribe(update);

    return () => {
      unsubNetwork();
      unsubQueue();
    };
  }, []);

  return state;
}

/**
 * Hook for cached data with automatic refetch
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    staleWhileRevalidate?: boolean;
  }
): {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(() => dataCache.get<T>(key));
  const [isLoading, setIsLoading] = useState(!data);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isOnline = useIsOnline();

  const refetch = useCallback(async () => {
    if (!isOnline) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const freshData = await fetcher();
      dataCache.set(key, freshData, options?.ttl);
      setData(freshData);
      setIsStale(false);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Fetch failed'));
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, isOnline, options?.ttl]);

  useEffect(() => {
    const cached = dataCache.get<T>(key);
    if (cached) {
      setData(cached);
      if (options?.staleWhileRevalidate && isOnline) {
        setIsStale(true);
        refetch();
      }
    } else if (isOnline) {
      refetch();
    }
  }, [key, isOnline]);

  return { data, isLoading, isStale, error, refetch };
}

/**
 * Hook for queuing operations when offline
 */
export function useOfflineQueue(): {
  enqueue: (type: string, payload: unknown) => string;
  queue: QueuedOperation[];
  clear: () => void;
  isProcessing: boolean;
} {
  const [queue, setQueue] = useState<QueuedOperation[]>(operationQueue.getQueue());

  useEffect(() => {
    return operationQueue.subscribe(() => {
      setQueue(operationQueue.getQueue());
    });
  }, []);

  return {
    enqueue: useCallback((type, payload) => operationQueue.enqueue(type, payload), []),
    queue,
    clear: useCallback(() => operationQueue.clear(), []),
    isProcessing: false,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format time ago
 */
export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
