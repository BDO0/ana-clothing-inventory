// Sync Engine — hardened with batch upload, smart retry, DTO layer.
// Processes the sync_queue and pushes events to Supabase via DTO.
// Follows /docs/04-sync-engine.md
//
// Critical Rule: Sync NEVER modifies original event data.
// Only status fields (sync_queue.status, inventory_events.synced) change.

import {
  getPendingItems,
  getEventFromQueue,
  markSynced,
  markFailed,
} from "./sync-queue";
import {
  toDTO,
  toProductDTO,
  toVariantDTO,
  fromProductDTO,
  fromVariantDTO,
  fromEventDTO,
} from "./dto";
import {
  SupabaseClient,
  type SupabaseResponse,
  type SyncConfig,
} from "./supabase-client";
import { dispatchSyncPulled } from "./sync-events";

const MIN_SYNC_INTERVAL_MS = 3_000; // throttle for periodic syncs: 3 seconds

export type { SyncConfig };

/**
 * Compute exponential backoff delay in milliseconds.
 * Formula: 2^retries seconds → milliseconds, capped at 5 minutes.
 */
function backoffMs(retries: number): number {
  return Math.min(2 ** retries * 1000, 5 * 60 * 1000);
}

export class SyncEngine {
  private static instance: SyncEngine | null = null;

  private config: SyncConfig;
  private client!: SupabaseClient;
  private timer: ReturnType<typeof setInterval> | null = null;
  private onlineHandler: (() => void) | null = null;
  private idleCallback: number | null = null;
  private running = false;
  private lastSyncTime = 0;
  private _syncing = false; // mutex: only one processQueue at a time

  private constructor(config: SyncConfig = {}) {
    this.config = {
      tableName: "inventory_events",
      ...config,
    };
    this.rebuildClient();
  }

  private rebuildClient(): void {
    this.client = new SupabaseClient(this.config);
  }

  static getInstance(config?: SyncConfig): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine(config);
    } else if (config) {
      SyncEngine.instance.config = { ...SyncEngine.instance.config, ...config };
      SyncEngine.instance.rebuildClient();
    }
    return SyncEngine.instance;
  }

  static resetInstance(): void {
    if (SyncEngine.instance) {
      SyncEngine.instance.stop();
      SyncEngine.instance = null;
    }
  }

  private isConfigured(): boolean {
    return !!(this.config.supabaseUrl && this.config.supabaseKey);
  }

  private isOnline(): boolean {
    return typeof navigator !== "undefined" && navigator.onLine;
  }

  /**
   * Process all PENDING items from the sync queue.
   * Groups events into batches and sends them via the Supabase client.
   */
  async processQueue(force = false): Promise<void> {
    if (!this.isConfigured()) {
      console.warn("[Sync] Supabase not configured — skipping sync");
      return;
    }

    if (!this.isOnline()) {
      console.log("[Sync] Offline — sync skipped");
      return;
    }

    // Mutex: prevent concurrent runs which cause FK race conditions
    if (this._syncing) {
      console.log("[Sync] Already syncing — skipping concurrent call");
      return;
    }

    // Throttle: prevent too-frequent calls from the periodic timer.
    // force=true bypasses this (used by triggerImmediateSync after a user write).
    const now = Date.now();
    if (!force && now - this.lastSyncTime < MIN_SYNC_INTERVAL_MS) {
      console.log("[Sync] Throttled — skipping (too soon since last sync)");
      return;
    }

    this._syncing = true;
    try {
      await this._runQueue();
    } finally {
      this._syncing = false;
      this.lastSyncTime = Date.now();
    }
  }

  private async _runQueue(): Promise<void> {
    const pending = await getPendingItems();
    if (pending.length === 0) {
      console.log("[Sync] Queue is empty");
      return;
    }

    console.log(`[Sync] Processing ${pending.length} pending item(s)...`);

    let synced = 0;
    let failed = 0;

    // Filter eligible items (skip ones still in backoff)
    const eligible = pending.filter((item) => {
      const delay = backoffMs(item.retries);
      return item.retries === 0 || Date.now() - item.created_at >= delay;
    });

    if (eligible.length === 0) {
      console.log("[Sync] All items are still in backoff");
      return;
    }

    // Process strictly sequentially to preserve foreign key dependencies
    // A Product must exist before its Variant, and a Variant before an Event.
    for (const item of eligible) {
      let response: SupabaseResponse | null = null;
      let entityId = "";

      if (item.type === "PRODUCT") {
        const product = item.payload as import("../db/models").Product;
        if (!product) continue;
        entityId = product.id;
        response = await this.client.postProduct(toProductDTO(product));
      } else if (item.type === "PRODUCT_UPDATE") {
        const product = item.payload as import("../db/models").Product;
        if (!product) continue;
        entityId = product.id;
        response = await this.client.patchProduct(toProductDTO(product));
      } else if (item.type === "PRODUCT_DELETE") {
        entityId = item.payload as string;
        if (!entityId) continue;
        response = await this.client.deleteProduct(entityId);
      } else if (item.type === "VARIANT") {
        const variant = item.payload as import("../db/models").Variant;
        if (!variant) continue;
        entityId = variant.id;
        response = await this.client.postVariant(toVariantDTO(variant));
      } else if (item.type === "VARIANT_UPDATE") {
        const variant = item.payload as import("../db/models").Variant;
        if (!variant) continue;
        entityId = variant.id;
        response = await this.client.patchVariant(toVariantDTO(variant));
      } else if (item.type === "VARIANT_DELETE") {
        entityId = item.payload as string;
        if (!entityId) continue;
        response = await this.client.deleteVariant(entityId);
      } else if (item.type === "EVENT") {
        const event = getEventFromQueue(item);
        if (!event) {
          console.warn(`[Sync] Invalid payload for queue item #${item.id}`);
          continue;
        }
        entityId = event.id;
        response = await this.client.postEvent(toDTO(event));
      }

      if (!response) {
        console.warn(`[Sync] Unknown queue item type: ${item.type}`);
        continue;
      }

      if (response.ok) {
        await markSynced(item.id!, entityId, item.type);
        synced++;
      } else {
        console.error(`[Sync] Item ${item.id} failed: ${response.errorType} (${response.status})`);
        await markFailed(item.id!, response.errorType);
        failed++;

        // Stop processing on validation errors to prevent cascading FK failures
        if (response.errorType === "VALIDATION") {
          console.error("[Sync] Validation error — pausing sync queue");
          break;
        }
      }
    }

    console.log(`[Sync] Done — synced=${synced} failed=${failed}`);
  }

  /**
   * Pull all data from Supabase if the local database is empty.
   * Used only on first run — after that, pullFromCloud() handles sync.
   */
  async hydrate(): Promise<void> {
    if (!this.isConfigured() || !this.isOnline()) return;

    const { isDatabaseEmpty, hydrateDatabase } = await import("../db/database");
    const empty = await isDatabaseEmpty();
    if (!empty) {
      return; // Only hydrate if fresh/empty — otherwise use pullFromCloud()
    }

    console.log("[Sync] Local database is empty — hydrating from cloud...");

    try {
      const [productDTOs, variantDTOs, eventDTOs] = await Promise.all([
        this.client.getProducts(),
        this.client.getVariants(),
        this.client.getEvents(),
      ]);

      const products = productDTOs.map(fromProductDTO);
      const variants = variantDTOs.map(fromVariantDTO);
      const events = eventDTOs.map(fromEventDTO);

      await hydrateDatabase(products, variants, events);

      console.log(`[Sync] Hydration complete: ${products.length} products, ${variants.length} variants, ${events.length} events`);
    } catch (err) {
      console.error("[Sync] Hydration failed:", err);
    }
  }

  /**
   * Pull latest data from Supabase and merge it into the local database.
   * This is the KEY method that enables multi-device sync.
   * It runs on startup, on network reconnect, and on every periodic tick.
   * Uses mergeFromCloud() which upserts — it never wipes local data.
   */
  async pullFromCloud(): Promise<void> {
    if (!this.isConfigured() || !this.isOnline()) return;

    try {
      const [productDTOs, variantDTOs, eventDTOs] = await Promise.all([
        this.client.getProducts(),
        this.client.getVariants(),
        this.client.getEvents(),
      ]);

      const { mergeFromCloud } = await import("../db/database");
      const products = productDTOs.map(fromProductDTO);
      const variants = variantDTOs.map(fromVariantDTO);
      const events = eventDTOs.map(fromEventDTO);

      await mergeFromCloud(products, variants, events);

      // Notify React pages to reload their data from IndexedDB
      dispatchSyncPulled();

      console.log(`[Sync] Pull complete: ${products.length} products, ${variants.length} variants, ${events.length} events`);
    } catch (err) {
      console.error("[Sync] Pull from cloud failed:", err);
    }
  }

  /**
   * Full sync cycle: process queue + cleanup old synced items.
   */
  async sync(): Promise<void> {
    const { clearSyncedItems } = await import("./sync-queue");
    await this.processQueue();
    await clearSyncedItems();
  }

  /**
   * Immediately process the queue, bypassing the throttle timer.
   * Call this right after any local write so data reaches Supabase quickly
   * instead of waiting up to 30 seconds for the periodic timer.
   */
  async triggerImmediateSync(): Promise<void> {
    // If a sync is already running, wait for it to finish then run again
    // so items queued during the current sync don't get dropped.
    if (this._syncing) {
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (!this._syncing) { clearInterval(check); resolve(); }
        }, 100);
      });
    }
    // force=true skips the throttle check completely
    await this.processQueue(true);
  }

  /**
   * Start the sync engine: register triggers and run immediately.
   * Idempotent — calling start() multiple times is safe.
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    // 1. Run on startup: hydrate empty DB first, then pull remote changes,
    //    then push any locally-pending queue items.
    this.hydrate().then(() => {
      return this.pullFromCloud();
    }).then(() => {
      this.processQueue();
    });

    // 2. Internet reconnect trigger — pull AND push when coming back online
    this.onlineHandler = () => {
      console.log("[Sync] Network restored — pulling remote changes then pushing local queue");
      this.pullFromCloud().then(() => this.processQueue());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.onlineHandler);

      // 3. Visibility change — pull when user switches back to this tab
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          this.pullFromCloud().then(() => this.processQueue());
        }
      });

      // 4. Idle sync — runs when browser is idle
      if ("requestIdleCallback" in window) {
        this.idleCallback = window.requestIdleCallback(
          () => {
            this.pullFromCloud().then(() => this.processQueue());
          },
          { timeout: 5000 }
        );
      }
    }

    // 5. Periodic timer — every 30 seconds: pull remote changes, then push local
    this.timer = setInterval(() => {
      this.pullFromCloud().then(() => this.processQueue());
    }, 30_000);

    console.log("[Sync] Engine started (bidirectional sync active)");
  }

  /**
   * Stop the sync engine: remove triggers and clear timer.
   */
  stop(): void {
    this.running = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.onlineHandler && typeof window !== "undefined") {
      window.removeEventListener("online", this.onlineHandler);
      this.onlineHandler = null;
    }

    if (this.idleCallback !== null && typeof window !== "undefined") {
      window.cancelIdleCallback(this.idleCallback);
      this.idleCallback = null;
    }

    console.log("[Sync] Engine stopped");
  }
}

// Singleton instance — Supabase credentials configured via getInstance(config)
export const syncEngine = SyncEngine.getInstance();