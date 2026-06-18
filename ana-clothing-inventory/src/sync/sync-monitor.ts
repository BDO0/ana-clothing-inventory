// Sync Monitor — observability layer for sync system debugging.
// Tracks sync metrics and provides diagnostic snapshots.
// Optional UI integration can access these for dev dashboards.

import { getQueueStats, getFailedItems } from "./sync-queue";

export interface SyncMetrics {
  totalSynced: number;
  totalFailed: number;
  retryQueueSize: number;
  lastSyncTime: number | null;
  averageSyncLatency: number;
  isConfigured: boolean;
  isOnline: boolean;
}

interface LatencyEntry {
  timestamp: number;
  latency: number;
}

// Internal ring buffer for latency tracking (last 100 syncs)
const latencyBuffer: LatencyEntry[] = [];
const MAX_LATENCY_SAMPLES = 100;

let lastSyncTime: number | null = null;

/**
 * Record a sync operation result for metrics tracking.
 * Called by the sync engine after each batch completes.
 */
export function recordSync(latencyMs: number): void {
  lastSyncTime = Date.now();

  latencyBuffer.push({
    timestamp: lastSyncTime,
    latency: latencyMs,
  });

  // Trim old entries
  if (latencyBuffer.length > MAX_LATENCY_SAMPLES) {
    latencyBuffer.shift();
  }
}

/**
 * Get current sync metrics snapshot.
 */
export async function getSyncMetrics(): Promise<SyncMetrics> {
  const stats = await getQueueStats();

  const avgLatency =
    latencyBuffer.length > 0
      ? latencyBuffer.reduce((sum, e) => sum + e.latency, 0) /
        latencyBuffer.length
      : 0;

  return {
    totalSynced: stats.synced,
    totalFailed: stats.failed,
    retryQueueSize: stats.pending,
    lastSyncTime,
    averageSyncLatency: Math.round(avgLatency),
    isConfigured: !!getConfig(),
    isOnline:
      typeof navigator !== "undefined" ? navigator.onLine : true,
  };
}

// Lazy config reference — populated by sync engine on record
let _configRef: { supabaseUrl?: string; supabaseKey?: string } | null = null;

/**
 * Set config reference for isConfigured check.
 */
export function setSyncConfig(
  config: { supabaseUrl?: string; supabaseKey?: string } | null
): void {
  _configRef = config;
}

function getConfig(): {
  supabaseUrl?: string;
  supabaseKey?: string;
} | null {
  return _configRef;
}

/**
 * Get a human-readable sync status summary for debugging.
 */
export async function getSyncStatusReport(): Promise<string> {
  const metrics = await getSyncMetrics();
  const failedItems = await getFailedItems();

  const lines = [
    "=== Sync Status Report ===",
    `Total Synced:        ${metrics.totalSynced}`,
    `Total Failed:        ${metrics.totalFailed}`,
    `Retry Queue Size:    ${metrics.retryQueueSize}`,
    `Last Sync Time:      ${metrics.lastSyncTime ? new Date(metrics.lastSyncTime).toISOString() : "never"}`,
    `Avg Sync Latency:    ${metrics.averageSyncLatency}ms`,
    `Supabase Configured: ${metrics.isConfigured}`,
    `Online:              ${metrics.isOnline}`,
    "",
    `Failed Items: ${failedItems.length}`,
    ...failedItems.slice(0, 10).map(
      (item) =>
        `  #${item.id} retries=${item.retries} type=${item.type} created=${new Date(
          item.created_at
        ).toISOString()}`
    ),
    failedItems.length > 10 ? `  ... and ${failedItems.length - 10} more` : "",
  ];

  return lines.filter(Boolean).join("\n");
}