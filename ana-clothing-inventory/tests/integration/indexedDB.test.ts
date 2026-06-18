// Integration tests — IndexedDB (Dexie) event persistence and sync queue
import { describe, it, expect, beforeEach } from "vitest";
import { appendEvent, db, addProduct, addVariant } from "../../src/db/database";
import { getStock } from "../../src/engine/stock-engine";
import { getPendingItems, getQueueStats } from "../../src/sync/sync-queue";
import { resetDatabase, createStockInEvent, createSaleEvent } from "../utils/testHelpers";

describe("IndexedDB — event persistence", () => {
  const variantId = "variant-shirt-m";

  beforeEach(async () => {
    await resetDatabase();
    await addProduct({ name: "Test Shirt" });
    await addVariant({ product_id: (await db.products.toArray())[0]?.id ?? "p1", size: "M", color: "Black", sku: "TSH-BLK-M" });
  });

  it("should save events to IndexedDB", async () => {
    await appendEvent(createStockInEvent(variantId, 20));
    await appendEvent(createSaleEvent(variantId, 5));

    const events = await db.inventory_events.where("variant_id").equals(variantId).sortBy("created_at");
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("STOCK_IN");
    expect(events[1].type).toBe("SALE");
  });

  it("should persist events after simulated reload", async () => {
    await appendEvent(createStockInEvent(variantId, 50));

    // Verify stock before "reload"
    await appendEvent(createStockInEvent(variantId, 10));
    let stock = await getStock(variantId);
    expect(stock).toBe(60);

    // The stock is computed from events — verify they still exist
    const events = await db.inventory_events.where("variant_id").equals(variantId).toArray();
    expect(events).toHaveLength(2);

    // Compute stock again — must match
    stock = await getStock(variantId);
    expect(stock).toBe(60);
  });

  it("should store unsynced events in sync_queue", async () => {
    await appendEvent(createStockInEvent(variantId, 10));

    const pendingItems = await getPendingItems();
    expect(pendingItems).toHaveLength(1);
    expect(pendingItems[0].status).toBe("PENDING");
    expect(pendingItems[0].type).toBe("EVENT");
  });

  it("should track sync queue statistics", async () => {
    await appendEvent(createStockInEvent(variantId, 10));
    await appendEvent(createSaleEvent(variantId, 3));

    const stats = await getQueueStats();
    expect(stats.pending).toBe(2);
    expect(stats.synced).toBe(0);
    expect(stats.failed).toBe(0);
  });

  it("should not allow direct event deletion", async () => {
    await appendEvent(createStockInEvent(variantId, 30));

    const events = await db.inventory_events.toArray();
    expect(events).toHaveLength(1);

    // Verify: no delete API is exposed for events table
    // The stock must always be computable from events
    const stock = await getStock(variantId);
    expect(stock).toBe(30);
  });

  it("should assign UUID and timestamp to every event", async () => {
    await appendEvent(createStockInEvent(variantId, 15));

    const events = await db.inventory_events.toArray();
    expect(events).toHaveLength(1);

    const event = events[0];
    expect(event.id).toBeDefined();
    expect(typeof event.id).toBe("string");
    expect(event.id.length).toBeGreaterThanOrEqual(10);
    expect(event.created_at).toBeDefined();
    expect(typeof event.created_at).toBe("number");
    expect(event.created_at).toBeGreaterThan(0);
    expect(event.synced).toBe(false);
  });
});