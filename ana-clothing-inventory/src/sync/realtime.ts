// Supabase Realtime — instant push notifications for multi-device sync.
// Subscribes to postgres_changes on all three inventory tables.
// When any remote change is detected, triggers a pullFromCloud() so the
// other device's UI updates within ~200ms instead of waiting 30 seconds.
//
// Free tier limits: 200 concurrent connections, unlimited messages.
// This module is safe to call even if Supabase is not configured.

import { supabase } from "../auth/auth-service";
import { syncEngine } from "./sync-engine";
import { logger } from "../lib/logger";

type RealtimeChannel = ReturnType<NonNullable<typeof supabase>["channel"]>;

let realtimeChannel: RealtimeChannel | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced handler for remote changes.
 * Multiple rapid changes (e.g. product + variant + event) collapse into
 * one pull instead of three, preventing redundant network requests.
 */
function handleRemoteChange(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    logger.log("[Realtime] Remote change detected — pulling latest data");
    syncEngine.pullFromCloud().catch((err) => {
      logger.warn("[Realtime] Pull failed:", err);
    });
  }, 250);
}

/**
 * Start listening for real-time changes from Supabase.
 * Call once at app startup after Supabase is configured.
 *
 * Requires the tables to be added to the supabase_realtime publication.
 * Run this SQL in Supabase once if you haven't already:
 *
 *   ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
 *   ALTER PUBLICATION supabase_realtime ADD TABLE public.variants;
 *   ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_events;
 */
export function startRealtimeSync(): void {
  if (!supabase) {
    logger.log("[Realtime] Supabase not configured — skipping realtime sync");
    return;
  }

  if (realtimeChannel) {
    logger.log("[Realtime] Already running");
    return;
  }

  realtimeChannel = supabase
    .channel("inventory-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      handleRemoteChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "variants" },
      handleRemoteChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "inventory_events" },
      handleRemoteChange
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        logger.log("[Realtime] ✅ Connected — instant sync active");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        logger.warn(`[Realtime] ⚠️ Connection issue: ${status} — falling back to 30s polling`);
      } else {
        logger.log(`[Realtime] Status: ${status}`);
      }
    });
}

/**
 * Stop the realtime subscription.
 * Called automatically if the app is torn down.
 */
export function stopRealtimeSync(): void {
  if (realtimeChannel && supabase) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
    logger.log("[Realtime] Stopped");
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
