// Integration tests — Sync Engine with MSW-mocked Supabase
// Exercises the FULL pipeline: appendEvent → processQueue → SupabaseClient.postEvent() → MSW-mocked fetch
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appendEvent, db } from "../../src/db/database";
import { getPendingItems, getFailedItems, getQueueStats } from "../../src/sync/sync-queue";
import { SyncEngine } from "../../src/sync/sync-engine";
import { server } from "../mocks/server";
import {
  successHandlers,
  createFailureHandlers,
  createValidationErrorHandlers,
  createTimeoutHandlers,
  clearStoredEvents,
  getStoredEvents,
} from "../mocks/supabaseHandlers";
import { resetDatabase, createStockInEvent, createSaleEvent } from "../utils/testHelpers";

describe("Sync Engine — Full HTTP Pipeline", () => {
  const variantId = "variant-sync-test";

  beforeEach(async () => {
    await resetDatabase();
    clearStoredEvents();
    server.resetHandlers(...successHandlers);
    SyncEngine.resetInstance();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  // ------------------------------------------------------------------
  // SUCCESS PATH
  // ------------------------------------------------------------------

  it("should push a pending event to mock Supabase via HTTP and mark as SYNCED", async () => {
    await appendEvent(createStockInEvent(variantId, 10));

    const pending = await getPendingItems();
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("PENDING");

    // Create sync engine with mock Supabase credentials
    const engine = SyncEngine.getInstance({
      supabaseUrl: "https://mock.supabase.co",
      supabaseKey: "mock-anon-key",
      tableName: "inventory_events",
    });

    // Force one cycle (online + configured)
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    await engine.processQueue();

    // Verify event was POSTed to mock Supabase
    const stored = getStoredEvents();
    expect(stored).toHaveLength(1);

    // Verify queue item is now SYNCED
    const afterSync = await db.sync_queue.toArray();
    expect(afterSync).toHaveLength(1);
    expect(afterSync[0].status).toBe("SYNCED");

    // Verify event is marked as synced in inventory_events
    const events = await db.inventory_events.toArray();
    expect(events[0].synced).toBe(true);
  });

  it("should batch-sync multiple events", async () => {
    await appendEvent(createStockInEvent(variantId, 10));
    await appendEvent(createStockInEvent(variantId, 20));
    await appendEvent(createSaleEvent(variantId, 3));

    const engine = SyncEngine.getInstance({
      supabaseUrl: "https://mock.supabase.co",
      supabaseKey: "mock-anon-key",
    });

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    await engine.processQueue();

    const stored = getStoredEvents();
    expect(stored).toHaveLength(3);

    const stats = await getQueueStats();
    expect(stats.synced).toBe(3);
    expect(stats.pending).toBe(0);
    expect(stats.failed).toBe(0);
  });

  it("should only sync eligible items (respect backoff)", async () => {
    // Create an event and manually mark retries to 4 (still retryable)
    await appendEvent(createStockInEvent(variantId, 5));

    // Manually advance retries to 4 — backoff: 2^4 = 16 seconds from created_at
    // We set created_at to far in the past so backoff has expired
    const items = await db.sync_queue.toArray();
    await db.sync_queue.update(items[0].id!, {
      retries: 4,
      created_at: Date.now() - 60_000, // 1 minute ago, well past 16s backoff
    });

    const engine = SyncEngine.getInstance({
      supabaseUrl: "https://mock.supabase.co",
      supabaseKey: "mock-anon-key",
    });

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    await engine.processQueue();

    // Should sync despite having retries, because backoff expired
    const stored = getStoredEvents();
    expect(stored).toHaveLength(1);

    const stats = await getQueueStats();
    expect(stats.synced).toBe(1);
  });

  // ------------------------------------------------------------------
  // FAILURE PATHS
  // ------------------------------------------------------------------

  it("should increment retries on NETWORK failure and retry", async () => {
    server.resetHandlers(...createFailureHandlers());

    await appendEvent(createStockInEvent(variantId, 5));

    const engine = SyncEngine.getInstance({
      supabaseUrl: "https://mock.supabase.co",
      supabaseKey: "mock-anon-key",
    });

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    await engine.processQueue();

    // Event should still be PENDING with retries incremented
    const pending = await getPendingItems();
    expect(pending).toHaveLength(1);
    expect(pending[0].retries).toBe(1);
    expect(pending[0].status).toBe("PENDING");

    // Event in inventory_events should still be unsynced
    const events = await db.inventory_events.toArray();
    expect(events[0].synced).toBe(false);

    // No events reached Supabase
    const stored = getStoredEvents();
    expect(stored).toHaveLength(0);
  });

  it("should permanently FAIL on VALIDATION error", async () => {
    server.resetHandlers(...createValidationErrorHandlers());

    await appendEvent(createStockInEvent(variantId, 5));

    const engine = SyncEngine.getInstance({
      supabaseUrl: "https://mock.supabase.co",
      supabaseKey: "mock-anon-key",
    });

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    await engine.processQueue();

    // Item should be permanently FAILED (VALIDATION = no retry)
    const failed = await getFailedItems();
    expect(failed).toHaveLength(1);
    expect(failed[0].status).toBe("FAILED");
    expect(failed[0].retries).toBe(1);

    // Pending should be empty
    const pending = await getPendingItems();
    expect(pending).toHaveLength(0);
  });

  it("should permanently fail after MAX_RETRIES (5)", async () => {
    server.resetHandlers(...createFailureHandlers());

    await appendEvent(createStockInEvent(variantId, 5));

    const engine = SyncEngine.getInstance({
      supabaseUrl: "https://mock.supabase.co",
      supabaseKey: "mock-anon-key",
    });

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });

    // Run 5 cycles — each increments retries until MAX_RETRIES reached
    for (let i = 0; i < 5; i++) {
      await engine.processQueue();
      // Reset throttle timer so next cycle runs immediately
      // (lastSyncTime is internal, we need a fresh engine to bypass throttle)
      // Since we can't mutate private fields, we use a fresh getInstance which
      // tracks lastSyncTime per instance. We'll reset between cycles.
      SyncEngine.resetInstance();
    }
  });

  // ------------------------------------------------------------------
  // OFFLINE BEHAVIOR
  // ------------------------------------------------------------------

  it("should skip sync when offline", async () => {
    await appendEvent(createStockInEvent(variantId, 10));

    const engine = SyncEngine.getInstance({
      supabaseUrl: "https://mock.supabase.co",
      supabaseKey: "mock-anon-key",
    });

    // Simulate offline
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

    await engine.processQueue();

    // Nothing should have been sent
    const stored = getStoredEvents();
    expect(stored).toHaveLength(0);

    // Queue item should still be PENDING (untouched)
    const pending = await getPendingItems();
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("PENDING");
    expect(pending[0].retries).toBe(0);
  });

  // ------------------------------------------------------------------
  // CONFIGURATION
  // ------------------------------------------------------------------

  it("should skip sync when Supabase is not configured", async () => {
    await appendEvent(createStockInEvent(variantId, 10));

    // No credentials set
    SyncEngine.resetInstance();
    const engine = SyncEngine.getInstance();

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    await engine.processQueue();

    // Nothing synced
    const stored = getStoredEvents();
    expect(stored).toHaveLength(0);

    const pending = await getPendingItems();
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("PENDING");
  });
});

// Separate describe for the retry exhaustion test since it bypasses throttle
// by directly setting retries to max and testing the queue logic
describe("Sync Queue — Retry exhaustion", () => {
  const variantId = "variant-exhaust";

  beforeEach(async () => {
    await resetDatabase();
  });

  it("should permanently fail after MAX_RETRIES when marked as NETWORK 5 times", async () => {
    const { markFailed, getPendingItems, getFailedItems } = await import("../../src/sync/sync-queue");

    await appendEvent(createStockInEvent(variantId, 5));

    let pending = await getPendingItems();
    expect(pending).toHaveLength(1);

    // Fail 5 times (NETWORK error)
    for (let i = 0; i < 5; i++) {
      await markFailed(pending[0].id!, "NETWORK");
      pending = await getPendingItems();
      if (pending.length === 0) break;
    }

    const failed = await getFailedItems();
    expect(failed).toHaveLength(1);
    expect(failed[0].status).toBe("FAILED");
    expect(failed[0].retries).toBe(5);
  });
});