// Sync Queue Helpers
// Thin wrappers over db.sync_queue for reading/updating status.
// Follows /docs/04-sync-engine.md

import { db } from "../db/database";
import type { InventoryEvent, SyncQueueItem } from "../db/models";

const MAX_RETRIES = 5;

/**
 * Get all PENDING queue items, oldest first.
 */
export async function getPendingItems(): Promise<SyncQueueItem[]> {
  return db.sync_queue
    .where("status")
    .equals("PENDING")
    .sortBy("created_at");
}

/**
 * Get queue statistics for UI display.
 */
export async function getQueueStats(): Promise<{
  pending: number;
  synced: number;
  failed: number;
}> {
  const [pending, synced, failed] = await Promise.all([
    db.sync_queue.where("status").equals("PENDING").count(),
    db.sync_queue.where("status").equals("SYNCED").count(),
    db.sync_queue.where("status").equals("FAILED").count(),
  ]);
  return { pending, synced, failed };
}

export async function markSynced(
  queueId: number,
  entityId: string,
  type: string = "EVENT"
): Promise<void> {
  await db.sync_queue.update(queueId, { status: "SYNCED" });
  if (type === "EVENT") {
    await db.inventory_events.update(entityId, { synced: true });
  } else if (type === "PRODUCT" || type === "PRODUCT_UPDATE") {
    await db.products.update(entityId, { synced: true });
  } else if (type === "VARIANT" || type === "VARIANT_UPDATE") {
    await db.variants.update(entityId, { synced: true });
  }
}

/**
 * Mark a queue item as FAILED with error classification.
 * - NETWORK errors: retried (PENDING, increments retries)
 * - VALIDATION errors: permanently FAILED (will never succeed)
 * - SERVER errors: retried with backoff
 * - UNKNOWN errors: retried up to MAX_RETRIES
 * At MAX_RETRIES, item stays FAILED permanently.
 */
export async function markFailed(
  queueId: number,
  errorType: string = "UNKNOWN"
): Promise<void> {
  const item = await db.sync_queue.get(queueId);
  if (!item) return;

  const retries = (item.retries ?? 0) + 1;

  // VALIDATION errors never retry — the event itself is corrupt
  if (errorType === "VALIDATION") {
    await db.sync_queue.update(queueId, {
      status: "FAILED",
      retries,
    });
    return;
  }

  // Other errors: retry up to MAX_RETRIES
  await db.sync_queue.update(queueId, {
    status: retries >= MAX_RETRIES ? "FAILED" : "PENDING",
    retries,
  });
}

/**
 * Get all FAILED items (for recovery system).
 */
export async function getFailedItems(): Promise<SyncQueueItem[]> {
  return db.sync_queue
    .where("status")
    .equals("FAILED")
    .sortBy("created_at");
}

/**
 * Reset a FAILED item back to PENDING with 0 retries.
 */
export async function resetFailedItem(queueId: number): Promise<void> {
  await db.sync_queue.update(queueId, {
    status: "PENDING",
    retries: 0,
  });
}

/**
 * Clean up old SYNCED items from the queue.
 */
export async function clearSyncedItems(): Promise<number> {
  return db.sync_queue.where("status").equals("SYNCED").delete();
}

/**
 * Get the event payload from a queue item.
 */
export function getEventFromQueue(
  item: SyncQueueItem
): InventoryEvent | null {
  if (item.type === "EVENT" && item.payload) {
    return item.payload as InventoryEvent;
  }
  return null;
}