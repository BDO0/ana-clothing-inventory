// Sync Recovery System
// Recovers stuck or failed syncs safely.
// Local IndexedDB ALWAYS wins. Supabase is reference only.

import { getFailedItems, resetFailedItem } from "./sync-queue";
import { db } from "../db/database";

const RECOVERY_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Retry all FAILED events that are older than RECOVERY_AGE_MS.
 * Resets their retry count to 0 and moves them back to PENDING.
 *
 * Handles transient failures where the server was temporarily unavailable.
 */
export async function retryFailedEvents(): Promise<number> {
  const failed = await getFailedItems();
  const now = Date.now();
  let resetCount = 0;

  for (const item of failed) {
    if (now - item.created_at >= RECOVERY_AGE_MS) {
      await resetFailedItem(item.id!);
      resetCount++;
    }
  }

  if (resetCount > 0) {
    console.log(
      `[Recovery] Reset ${resetCount} failed item(s) back to PENDING`
    );
  }

  return resetCount;
}

/**
 * Reconcile local events with Supabase.
 * Checks for non-synced local events that are missing from Supabase
 * and requeues them.
 *
 * IMPORTANT: Local IndexedDB ALWAYS wins.
 * Never overwrites local data. Only requeues missing uploads.
 */
export async function reconcileLocalVsCloud(
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<number> {
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[Recovery] Supabase not configured — skipping reconciliation");
    return 0;
  }

  console.log("[Recovery] Starting reconciliation...");

  const { SupabaseClient } = await import("./supabase-client");
  const client = new SupabaseClient({
    supabaseUrl,
    supabaseKey,
    tableName: "inventory_events",
  });

  // Get local events that are NOT marked as synced
  const localEvents = await db.inventory_events
    .filter((e) => !e.synced)
    .toArray();

  if (localEvents.length === 0) {
    console.log("[Recovery] All local events are synced — nothing to reconcile");
    return 0;
  }

  // Pull all remote event IDs
  const remoteEvents = await client.getEvents();
  const remoteIds = new Set(remoteEvents.map((e) => e.id));

  let requeued = 0;

  for (const localEvent of localEvents) {
    if (remoteIds.has(localEvent.id)) {
      // Event exists in Supabase but marked as not synced — fix the flag
      await db.inventory_events.update(localEvent.id, { synced: true });
      continue;
    }

    // Event is missing from Supabase — ensure a PENDING queue item exists
    const pendingItems = await db.sync_queue
      .where("status")
      .equals("PENDING")
      .toArray();

    const alreadyPending = pendingItems.some(
      (q) =>
        q.type === "EVENT" &&
        q.payload &&
        typeof q.payload === "object" &&
        "id" in (q.payload as Record<string, unknown>) &&
        (q.payload as Record<string, unknown>).id === localEvent.id
    );

    if (!alreadyPending) {
      await db.sync_queue.add({
        type: "EVENT",
        payload: localEvent,
        status: "PENDING",
        retries: 0,
        created_at: Date.now(),
      });
      requeued++;
    }
  }

  if (requeued > 0) {
    console.log(`[Recovery] Requeued ${requeued} missing event(s)`);
  }

  return requeued;
}