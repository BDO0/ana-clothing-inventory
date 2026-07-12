// Local Database — IndexedDB via Dexie.js
// Primary source of truth. Follows /docs/03-local-database.md

import Dexie, { type Table } from "dexie";
import { v4 as uuid } from "uuid";
import type {
  Product,
  Variant,
  InventoryEvent,
  SyncQueueItem,
} from "./models";
import { assertValidEvent } from "./validators";
import { getCurrentUserId } from "../auth/auth-service";

// Lazy import to avoid circular dependency — only used for immediate sync trigger
async function triggerSync(): Promise<void> {
  if (!_supabaseConfigured) return;
  const { syncEngine } = await import("../sync/sync-engine");
  syncEngine.triggerImmediateSync().catch(() => {/* silent — periodic sync will retry */});
}

// Lazy check for Supabase config — set once at startup
let _supabaseConfigured = false;
export function setSupabaseConfigured(v: boolean): void {
  _supabaseConfigured = v;
}
export function isSupabaseConfigured(): boolean {
  return _supabaseConfigured;
}

class InventoryDB extends Dexie {
  products!: Table<Product, string>;
  variants!: Table<Variant, string>;
  inventory_events!: Table<InventoryEvent, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super("AnaClothingInventory");

    this.version(2).stores({
      products: "id, created_at",
      variants: "id, product_id, sku",
      inventory_events: "id, variant_id, created_at, type",
      sync_queue: "++id, status, created_at",
    });
  }
}

export const db = new InventoryDB();

// ---------------------------------------------------------------
// Append-only event writer — NEVER update or delete events
// Rule: All writes go to IndexedDB first, then sync_queue
// ---------------------------------------------------------------

export async function isDatabaseEmpty(): Promise<boolean> {
  const productsCount = await db.products.count();
  const eventsCount = await db.inventory_events.count();
  return productsCount === 0 && eventsCount === 0;
}

export async function hydrateDatabase(
  products: Product[],
  variants: Variant[],
  events: InventoryEvent[]
): Promise<void> {
  await db.transaction("rw", db.products, db.variants, db.inventory_events, async () => {
    // Clear any existing to ensure a clean slate
    await db.products.clear();
    await db.variants.clear();
    await db.inventory_events.clear();
    
    // Inject directly without hitting the sync_queue
    if (products.length > 0) await db.products.bulkAdd(products);
    if (variants.length > 0) await db.variants.bulkAdd(variants);
    if (events.length > 0) await db.inventory_events.bulkAdd(events);
  });
}

/**
 * Merge remote data from Supabase into the local database using upsert (bulkPut).
 * This is safe to call at any time — it will NOT wipe local data.
 * Records from the cloud are marked synced=true.
 * Locally-pending (unsynced) records are NOT overwritten for products/variants
 * because their version in the sync_queue is the authoritative outbound write.
 * Events are append-only and safe to upsert by ID.
 */
export async function mergeFromCloud(
  products: Product[],
  variants: Variant[],
  events: InventoryEvent[]
): Promise<void> {
  await db.transaction("rw", db.products, db.variants, db.inventory_events, async () => {
    // For products and variants: only upsert records that don't exist locally
    // OR that are already synced (i.e. the cloud version is authoritative).
    // This prevents overwriting locally-pending changes with stale cloud data.
    const localProductIds = new Set((await db.products.toArray()).filter(p => !p.synced).map(p => p.id));
    const localVariantIds = new Set((await db.variants.toArray()).filter(v => !v.synced).map(v => v.id));

    const safeProducts = products.filter(p => !localProductIds.has(p.id));
    const safeVariants = variants.filter(v => !localVariantIds.has(v.id));

    if (safeProducts.length > 0) await db.products.bulkPut(safeProducts);
    if (safeVariants.length > 0) await db.variants.bulkPut(safeVariants);

    // Events are append-only — always safe to upsert by ID
    if (events.length > 0) await db.inventory_events.bulkPut(events);
  });
}

export async function appendEvent(
  event: Omit<InventoryEvent, "id" | "synced" | "created_at"> & { created_at?: number }
): Promise<void> {
  // Gate: validate before writing. A bad event = corrupted stock forever.
  assertValidEvent(event as any);

  const fullEvent: InventoryEvent = {
    ...event,
    id: uuid(),
    created_at: event.created_at ?? Date.now(),
    synced: false,
    user_id: getCurrentUserId() ?? undefined, // stamp the author's UUID for audit trail
  };

  await db.inventory_events.add(fullEvent);

  // Only add to sync queue if Supabase is configured.
  if (_supabaseConfigured) {
    await db.sync_queue.add({
      type: "EVENT",
      payload: fullEvent,
      status: "PENDING",
      retries: 0,
      created_at: Date.now(),
    });
    // Push to Supabase immediately instead of waiting for the 30s timer
    triggerSync();
  }
}

/**
 * Clean up stale PENDING items from the sync queue.
 * Removes items older than `maxAgeMs` that were created when
 * Supabase was not configured but are now stuck.
 * Returns the number of deleted items.
 */
export async function cleanStalePendingItems(
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000 // 7 days
): Promise<number> {
  const cutoff = Date.now() - maxAgeMs;
  const stale = await db.sync_queue
    .where("status")
    .equals("PENDING")
    .filter((item) => item.created_at < cutoff)
    .toArray();
  const ids = stale.map((item) => item.id!);
  if (ids.length > 0) {
    await db.sync_queue.bulkDelete(ids);
  }
  return ids.length;
}

// ---------------------------------------------------------------
// Product helpers
// ---------------------------------------------------------------

export async function addProduct(
  product: Omit<Product, "id" | "created_at" | "synced">
): Promise<string> {
  const full: Product = {
    ...product,
    id: uuid(),
    created_at: Date.now(),
    synced: false,
  };
  await db.products.add(full);

  if (_supabaseConfigured) {
    await db.sync_queue.add({
      type: "PRODUCT",
      payload: full,
      status: "PENDING",
      retries: 0,
      created_at: Date.now(),
    });
    triggerSync();
  }

  return full.id;
}

// ---------------------------------------------------------------
// Variant helpers
// ---------------------------------------------------------------

export async function addVariant(
  variant: Omit<Variant, "id" | "synced">
): Promise<string> {
  const full: Variant = {
    ...variant,
    id: uuid(),
    synced: false,
  };
  await db.variants.add(full);

  if (_supabaseConfigured) {
    await db.sync_queue.add({
      type: "VARIANT",
      payload: full,
      status: "PENDING",
      retries: 0,
      created_at: Date.now(),
    });
    triggerSync();
  }

  return full.id;
}

export async function updateProduct(id: string, updates: Partial<Omit<Product, "id" | "created_at">>): Promise<void> {
  const product = await db.products.get(id);
  if (!product) throw new Error("Product not found");

  const updated = { ...product, ...updates, synced: false };
  await db.products.put(updated);

  if (_supabaseConfigured) {
    await db.sync_queue.add({
      type: "PRODUCT_UPDATE",
      payload: updated,
      status: "PENDING",
      retries: 0,
      created_at: Date.now(),
    });
    triggerSync();
  }
}

export async function deleteProduct(id: string): Promise<void> {
  await db.transaction("rw", db.products, db.variants, db.inventory_events, async () => {
    const variants = await db.variants.where({ product_id: id }).toArray();
    const variantIds = variants.map(v => v.id);
    
    // Cascade delete locally
    if (variantIds.length > 0) {
      await db.inventory_events.where("variant_id").anyOf(variantIds).delete();
      await db.variants.bulkDelete(variantIds);
    }
    await db.products.delete(id);
  });

  if (_supabaseConfigured) {
    await db.sync_queue.add({
      type: "PRODUCT_DELETE",
      payload: id,
      status: "PENDING",
      retries: 0,
      created_at: Date.now(),
    });
    triggerSync();
  }
}

export async function updateVariant(id: string, updates: Partial<Omit<Variant, "id" | "product_id">>): Promise<void> {
  const variant = await db.variants.get(id);
  if (!variant) throw new Error("Variant not found");

  const updated = { ...variant, ...updates, synced: false };
  await db.variants.put(updated);

  if (_supabaseConfigured) {
    await db.sync_queue.add({
      type: "VARIANT_UPDATE",
      payload: updated,
      status: "PENDING",
      retries: 0,
      created_at: Date.now(),
    });
    triggerSync();
  }
}

export async function deleteVariant(id: string): Promise<void> {
  await db.transaction("rw", db.variants, db.inventory_events, async () => {
    await db.inventory_events.where({ variant_id: id }).delete();
    await db.variants.delete(id);
  });

  if (_supabaseConfigured) {
    await db.sync_queue.add({
      type: "VARIANT_DELETE",
      payload: id,
      status: "PENDING",
      retries: 0,
      created_at: Date.now(),
    });
    triggerSync();
  }
}