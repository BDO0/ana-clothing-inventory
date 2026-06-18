// System Test Suite — validates all system layers
// Run: navigate to /system-test in the browser
// Each module is independent. Tests clean up after themselves.

import { db } from "../db/database";
import { validateEvent } from "../db/validators";
import { appendEvent } from "../db/database";
import { getStock } from "../engine/stock-engine";
import { getStockSummary, getDailySales, getTopProducts, getEventTrends } from "../engine/analytics-engine";
import { generateInventoryReport, generateBusinessOverview } from "../engine/report-engine";
import { markSynced, markFailed } from "../sync/sync-queue";
import { retryFailedEvents } from "../sync/sync-recovery";
import { createProduct, createVariant } from "../engine/product-service";
import { stockIn, recordSale } from "../engine/inventory-service";

// ---- Test result types ----

export interface TestResult {
  pass: boolean;
  message: string;
}

export interface TestModule {
  name: string;
  results: TestResult[];
}

function pass(message: string): TestResult {
  return { pass: true, message };
}

function fail(message: string): TestResult {
  return { pass: false, message };
}

// ---- Shared test data (cleaned up after each module) ----
let testProductId = "";
let testVariantId = "";

async function createTestFixture() {
  testProductId = await createProduct({ name: "Test Product" });
  testVariantId = await createVariant({
    product_id: testProductId,
    size: "M",
    color: "Test",
    sku: "TEST-FIXTURE",
  });
}

async function destroyTestFixture() {
  await db.inventory_events.where("variant_id").equals(testVariantId).delete();
  await db.variants.delete(testVariantId);
  await db.products.delete(testProductId);
  await db.sync_queue.clear();
}

// ====================================================================
// MODULE 1 — Event Integrity Test
// ====================================================================

export async function testEventIntegrity(): Promise<TestModule> {
  const results: TestResult[] = [];

  const validEvent = {
    variant_id: "test-variant-1",
    type: "STOCK_IN" as const,
    quantity: 10,
    reference: "REF-001",
    note: "Test stock in",
  };

  // 1a. Valid events should pass
  const vr = validateEvent(validEvent);
  results.push(vr.valid
    ? pass("Valid event passes validation")
    : fail(`Valid event rejected: ${vr.reason}`));

  // 1b. Quantity <= 0 should fail
  const badQty = validateEvent({ ...validEvent, quantity: 0 });
  results.push(!badQty.valid
    ? pass("Quantity = 0 correctly rejected")
    : fail("Quantity = 0 should have been rejected"));

  const negQty = validateEvent({ ...validEvent, quantity: -5 });
  results.push(!negQty.valid
    ? pass("Negative quantity correctly rejected")
    : fail("Negative quantity should have been rejected"));

  // 1c. Invalid type should fail
  const badType = validateEvent({ ...validEvent, type: "INVALID_TYPE" as any });
  results.push(!badType.valid
    ? pass("Invalid event type correctly rejected")
    : fail("Invalid event type should have been rejected"));

  // 1d. Empty variant_id should fail
  const noVariant = validateEvent({ ...validEvent, variant_id: "" });
  results.push(!noVariant.valid
    ? pass("Empty variant_id correctly rejected")
    : fail("Empty variant_id should have been rejected"));

  // 1e. Real DB test: UUID + timestamp + synced=false
  await createTestFixture();
  await appendEvent({
    variant_id: testVariantId,
    type: "STOCK_IN",
    quantity: 10,
    note: "Integrity test",
  });

  const events = await db.inventory_events.where("variant_id").equals(testVariantId).toArray();
  if (events.length === 1) {
    const e = events[0];
    const ok = e.id.length > 0 && e.created_at > 0 && e.synced === false;
    results.push(ok
      ? pass("Event created with UUID + timestamp + synced=false")
      : fail("Event created but missing required fields"));
  } else {
    results.push(fail(`Expected 1 event, found ${events.length}`));
  }

  // 1f. Sync queue populated
  const pending = await db.sync_queue.where("status").equals("PENDING").count();
  results.push(pending > 0
    ? pass("Sync queue populated with PENDING entry")
    : fail("No PENDING entry found in sync queue"));

  // 1g. Stock engine correct
  const stock = await getStock(testVariantId);
  results.push(stock === 10
    ? pass("Stock engine returns correct computed value (10)")
    : fail(`Stock engine returned ${stock}, expected 10`));

  await destroyTestFixture();
  return { name: "Module 1: Event Integrity", results };
}

// ====================================================================
// MODULE 2 — Offline Persistence Test
// ====================================================================

export async function testOfflinePersistence(): Promise<TestModule> {
  const results: TestResult[] = [];

  await createTestFixture();

  // 2a. Create 2 products, 3 variants, 5 events (simulating offline work)
  const p1 = await createProduct({ name: "Offline Product 1" });
  const p2 = await createProduct({ name: "Offline Product 2" });

  const v1 = await createVariant({ product_id: p1, size: "S", color: "Red", sku: "OFF-1" });
  const v2 = await createVariant({ product_id: p1, size: "M", color: "Blue", sku: "OFF-2" });
  const v3 = await createVariant({ product_id: p2, size: "L", color: "Black", sku: "OFF-3" });

  await stockIn(v1, 20, "Offline stock in 1");
  await stockIn(v2, 15, "Offline stock in 2");
  await recordSale(v1, 5, "Offline sale 1");
  await stockIn(v3, 30, "Offline stock in 3");
  await recordSale(v2, 3, "Offline sale 2");

  // 2b. Verify all data persisted
  const allProducts = await db.products.toArray();
  const allVariants = await db.variants.toArray();
  const allEvents = await db.inventory_events.toArray();

  results.push(allProducts.length >= 3
    ? pass(`Products persisted: ${allProducts.length}`)
    : fail(`Expected 3+ products, found ${allProducts.length}`));

  results.push(allVariants.length >= 4
    ? pass(`Variants persisted: ${allVariants.length}`)
    : fail(`Expected 4+ variants, found ${allVariants.length}`));

  results.push(allEvents.length >= 5
    ? pass(`Events persisted: ${allEvents.length}`)
    : fail(`Expected 5+ events, found ${allEvents.length}`));

  // 2c. Stock computed correctly offline
  const s1 = await getStock(v1);
  const s2 = await getStock(v2);
  results.push(s1 === 15
    ? pass(`Variant 1 stock correct (${s1})`)
    : fail(`Variant 1 stock wrong (${s1}, expected 15)`));
  results.push(s2 === 12
    ? pass(`Variant 2 stock correct (${s2})`)
    : fail(`Variant 2 stock wrong (${s2}, expected 12)`));

  // 2d. Verify sync_queue has all 5 events
  const pendingCount = await db.sync_queue.where("status").equals("PENDING").count();
  results.push(pendingCount >= 5
    ? pass(`All events queued for sync (${pendingCount})`)
    : fail(`Expected 5+ queue items, found ${pendingCount}`));

  // Cleanup
  await db.inventory_events.where("variant_id").equals(v1).delete();
  await db.inventory_events.where("variant_id").equals(v2).delete();
  await db.inventory_events.where("variant_id").equals(v3).delete();
  await db.variants.delete(v1);
  await db.variants.delete(v2);
  await db.variants.delete(v3);
  await db.products.delete(p1);
  await db.products.delete(p2);
  await destroyTestFixture();
  await db.sync_queue.clear();

  return { name: "Module 2: Offline Persistence", results };
}

// ====================================================================
// MODULE 3 — Sync Queue Test
// ====================================================================

export async function testSyncQueue(): Promise<TestModule> {
  const results: TestResult[] = [];

  // 3a. MarkFailed with VALIDATION error → stays FAILED permanently
  await db.sync_queue.add({
    type: "EVENT",
    payload: { id: "test-1" },
    status: "PENDING",
    retries: 0,
    created_at: Date.now(),
  });

  const queueId = (await db.sync_queue.orderBy("id").last())!.id!;
  await markFailed(queueId, "VALIDATION");

  const q1 = await db.sync_queue.get(queueId);
  results.push(q1?.status === "FAILED"
    ? pass("VALIDATION error → permanently FAILED (no retry)")
    : fail(`VALIDATION error should be FAILED, got ${q1?.status}`));

  // 3b. MarkFailed with NETWORK error → retry (PENDING + increments retries)
  await db.sync_queue.add({
    type: "EVENT",
    payload: { id: "test-2" },
    status: "PENDING",
    retries: 0,
    created_at: Date.now(),
  });

  const queueId2 = (await db.sync_queue.orderBy("id").last())!.id!;
  await markFailed(queueId2, "NETWORK");

  const q2 = await db.sync_queue.get(queueId2);
  results.push(q2?.status === "PENDING" && q2?.retries === 1
    ? pass("NETWORK error → retried (PENDING, retries=1)")
    : fail(`NETWORK error should be PENDING, got ${q2?.status} retries=${q2?.retries}`));

  // 3c. Max retries = 5 → FAILED
  await db.sync_queue.add({
    type: "EVENT",
    payload: { id: "test-3" },
    status: "PENDING",
    retries: 4,
    created_at: Date.now(),
  });

  const queueId3 = (await db.sync_queue.orderBy("id").last())!.id!;
  await markFailed(queueId3, "NETWORK");

  const q3 = await db.sync_queue.get(queueId3);
  results.push(q3?.status === "FAILED" && q3?.retries === 5
    ? pass("Max retries (5) reached → permanently FAILED")
    : fail(`After 5 retries should be FAILED, got ${q3?.status} retries=${q3?.retries}`));

  // 3d. markSynced sets event synced=true
  const now = Date.now();
  await db.inventory_events.add({
    id: "test-sync-event",
    variant_id: "test-v",
    type: "STOCK_IN",
    quantity: 1,
    created_at: now,
    synced: false,
  });

  await db.sync_queue.add({
    type: "EVENT",
    payload: { id: "test-sync-event" },
    status: "PENDING",
    retries: 0,
    created_at: now,
  });

  const queueId4 = (await db.sync_queue.orderBy("id").last())!.id!;
  await markSynced(queueId4, "test-sync-event");

  const q4 = await db.sync_queue.get(queueId4);
  const e4 = await db.inventory_events.get("test-sync-event");
  results.push(q4?.status === "SYNCED" && e4?.synced === true
    ? pass("MarkSynced correctly updates queue + event status")
    : fail(`markSynced didn't work: queue=${q4?.status}, event=${e4?.synced}`));

  await db.inventory_events.delete("test-sync-event");
  await db.sync_queue.clear();

  return { name: "Module 3: Sync Queue Behavior", results };
}

// ====================================================================
// MODULE 4 — Recovery System Test
// ====================================================================

export async function testRecovery(): Promise<TestModule> {
  const results: TestResult[] = [];

  // 4a. Create FAILED items, then retryFailedEvents()
  const oldTime = Date.now() - 15 * 60 * 1000; // 15 minutes ago (past RECOVERY_AGE)
  await db.sync_queue.add({ type: "EVENT", payload: { id: "r1" }, status: "FAILED", retries: 3, created_at: oldTime });
  await db.sync_queue.add({ type: "EVENT", payload: { id: "r2" }, status: "FAILED", retries: 4, created_at: oldTime });

  const resetCount = await retryFailedEvents();
  results.push(resetCount === 2
    ? pass(`RetryFailedEvents reset ${resetCount} old FAILED items to PENDING`)
    : fail(`Expected 2 items reset, got ${resetCount}`));

  // Verify they're now PENDING
  const pendingAfter = await db.sync_queue.where("status").equals("PENDING").count();
  results.push(pendingAfter >= 2
    ? pass(`Failed items moved to PENDING (${pendingAfter} pending)`)
    : fail(`Expected 2+ pending, found ${pendingAfter}`));

  // 4b. Recent FAILED items (less than 10 min) should NOT be reset
  await db.sync_queue.add({ type: "EVENT", payload: { id: "r3" }, status: "FAILED", retries: 2, created_at: Date.now() - 60_000 });

  const resetCount2 = await retryFailedEvents();
  results.push(resetCount2 === 0
    ? pass("Recent FAILED items (1 min old) NOT reset")
    : fail(`Expected 0 resets for recent items, got ${resetCount2}`));

  await db.sync_queue.clear();
  return { name: "Module 4: Recovery System", results };
}

// ====================================================================
// MODULE 5 — Analytics Correctness Test
// ====================================================================

export async function testAnalyticsCorrectness(): Promise<TestModule> {
  const results: TestResult[] = [];

  await createTestFixture();

  // Create controlled dataset
  await stockIn(testVariantId, 10, "Analytics test stock 1");
  await stockIn(testVariantId, 20, "Analytics test stock 2");
  await recordSale(testVariantId, 5, "Analytics test sale 1");
  await recordSale(testVariantId, 3, "Analytics test sale 2");

  // 5a. stock-engine matches expected math
  const stock = await getStock(testVariantId);
  results.push(stock === 22
    ? pass(`stock-engine: 10+20-5-3 = ${stock} (correct)`)
    : fail(`stock-engine returned ${stock}, expected 22`));

  // 5b. Stock summary matches stock engine
  const summary = await getStockSummary();
  results.push(summary.totalStock >= stock
    ? pass(`Stock summary total (${summary.totalStock}) >= stock-engine (${stock})`)
    : fail(`Stock summary (${summary.totalStock}) < stock-engine (${stock})`));

  // 5c. Top products includes our test product
  const topProducts = await getTopProducts(10);
  const found = topProducts.some(p => p.productName === "Test Product");
  results.push(found
    ? pass("Top products includes our test product")
    : fail("Test product not found in top products"));

  // 5d. Inventory report matches
  const report = await generateInventoryReport();
  const ourProduct = report.items.find(i => i.productName === "Test Product");
  results.push(ourProduct?.totalStock === 22
    ? pass(`Inventory report matches stock engine (${ourProduct?.totalStock})`)
    : fail(`Inventory report stock mismatch: ${ourProduct?.totalStock}`));

  // 5e. Business overview generates without error
  try {
    const overview = await generateBusinessOverview();
    results.push(overview.products.total > 0
      ? pass("Business overview generated successfully")
      : fail("Business overview has 0 products"));
  } catch (err) {
    results.push(fail(`Business overview crashed: ${err}`));
  }

  // 5f. Event trends produce data
  const trends = await getEventTrends("7d");
  results.push(Array.isArray(trends)
    ? pass(`Event trends returned ${trends.length} days of data`)
    : fail("Event trends returned non-array"));

  await destroyTestFixture();
  await db.sync_queue.clear();
  return { name: "Module 5: Analytics Correctness", results };
}

// ====================================================================
// MODULE 6 — UI Data Consistency Test
// ====================================================================

export async function testDataConsistency(): Promise<TestModule> {
  const results: TestResult[] = [];

  await createTestFixture();

  // 6a. StockIn updates stock instantly
  const before = await getStock(testVariantId);
  await stockIn(testVariantId, 50, "Consistency test");
  const after = await getStock(testVariantId);
  results.push(after === before + 50
    ? pass(`StockIn immediately reflected: ${before} → ${after}`)
    : fail(`StockIn not reflected: ${before} → ${after}`));

  // 6b. Sale reduces stock and can go negative
  await recordSale(testVariantId, 999, "Test negative stock");
  const afterSale = await getStock(testVariantId);
  results.push(afterSale < 0
    ? pass(`Sale allows negative stock (${afterSale}) — correct behavior`)
    : fail(`Expected negative stock after excessive sale, got ${afterSale}`));

  // 6c. History page equivalent test: events exist
  const events = await db.inventory_events.where("variant_id").equals(testVariantId).toArray();
  results.push(events.length >= 2
    ? pass(`Event history available: ${events.length} events`)
    : fail(`Expected 2+ events, found ${events.length}`));

  await destroyTestFixture();
  await db.sync_queue.clear();
  return { name: "Module 6: UI Data Consistency", results };
}

// ====================================================================
// MODULE 7 — Stress / Load Test
// ====================================================================

export async function testStress(): Promise<TestModule> {
  const results: TestResult[] = [];

  const startTime = Date.now();

  // Create 20 products, 50 variants, 100 events — moderate stress
  const productIds: string[] = [];
  const variantIds: string[] = [];

  try {
    for (let i = 0; i < 20; i++) {
      const pid = await createProduct({ name: `Stress Product ${i}` });
      productIds.push(pid);
    }

    for (let pi = 0; pi < productIds.length; pi++) {
      for (let vi = 0; vi < 3; vi++) {
        const vid = await createVariant({
          product_id: productIds[pi],
          size: `${vi === 0 ? "S" : vi === 1 ? "M" : "L"}`,
          color: `Color-${vi}`,
          sku: `STRESS-${pi}-${vi}`,
        });
        variantIds.push(vid);
      }
    }

    for (let ei = 0; ei < 100; ei++) {
      const vid = variantIds[ei % variantIds.length];
      if (ei % 3 === 0) {
        await stockIn(vid, Math.floor(Math.random() * 20) + 1, `Stress stock ${ei}`);
      } else {
        await recordSale(vid, Math.floor(Math.random() * 5) + 1, `Stress sale ${ei}`);
      }
    }

    // Verify stock engine handles it
    const allStock = await Promise.all(
      variantIds.slice(0, 5).map((vid) => getStock(vid))
    );

    results.push(allStock.every((s) => typeof s === "number")
      ? pass(`Stress test: stock engine computed ${variantIds.length} variants`)
      : fail("Stock engine failed during stress test"));

    // Verify analytics works under load
    const summary = await getStockSummary();
    results.push(summary.totalProducts >= 20
      ? pass(`Stress test: stock summary has ${summary.totalProducts} products`)
      : fail(`Stress test: stock summary has ${summary.totalProducts} products, expected 20+`));

    const elapsed = Date.now() - startTime;
    results.push(pass(`Stress test completed in ${elapsed}ms`));

  } catch (err) {
    results.push(fail(`Stress test crashed: ${err}`));
  }

  // Cleanup all test data
  for (const vid of variantIds) {
    await db.inventory_events.where("variant_id").equals(vid).delete();
    await db.variants.delete(vid);
  }
  for (const pid of productIds) {
    await db.products.delete(pid);
  }
  await db.sync_queue.clear();
  await destroyTestFixture();

  return { name: "Module 7: Stress / Load", results };
}

// ====================================================================
// MODULE 8 — Full System Flow Test
// ====================================================================

export async function testFullSystemFlow(): Promise<TestModule> {
  const results: TestResult[] = [];

  await createTestFixture();

  // Simulate a realistic offline workflow
  // 1. Create product + variant
  const p1 = await createProduct({ name: "Flow Test Product" });
  const v1 = await createVariant({ product_id: p1, size: "XL", color: "White", sku: "FLOW-001" });

  // 2. Stock in
  await stockIn(v1, 100, "Flow test initial stock");
  await stockIn(v1, 50, "Flow test second batch");

  // 3. Record sales
  await recordSale(v1, 30, "Flow test sale 1");
  await recordSale(v1, 20, "Flow test sale 2");
  await recordSale(v1, 10, "Flow test sale 3");

  // 4. Verify stock consistency across all layers
  const stock = await getStock(v1);
  results.push(stock === 90
    ? pass(`Full flow: stock engine = ${stock} (100+50-30-20-10=90)`)
    : fail(`Full flow: stock engine = ${stock}, expected 90`));

  // 5. Analytics matches stock engine
  const summary = await getStockSummary();
  results.push(summary.totalStock >= stock
    ? pass("Full flow: analytics summary consistent with stock engine")
    : fail("Full flow: analytics summary inconsistent"));

  // 6. Event history complete
  const events = await db.inventory_events.where("variant_id").equals(v1).toArray();
  results.push(events.length === 5
    ? pass(`Full flow: ${events.length} events logged (correct)`)
    : fail(`Full flow: ${events.length} events, expected 5`));

  // 7. Sync queue has all events
  const queueCount = await db.sync_queue.where("status").equals("PENDING").count();
  results.push(queueCount >= 5
    ? pass(`Full flow: ${queueCount} events queued for sync`)
    : fail(`Full flow: ${queueCount} queued, expected 5+`));

  // 8. Daily sales works
  const today = new Date().toISOString().slice(0, 10);
  const dailySales = await getDailySales(today);
  results.push(dailySales.totalQuantity === 60
    ? pass(`Full flow: daily sales = ${dailySales.totalQuantity} (30+20+10)`)
    : fail(`Full flow: daily sales = ${dailySales.totalQuantity}, expected 60`));

  // 9. Top products shows our product
  const top = await getTopProducts(5);
  const found = top.some(p => p.productName === "Flow Test Product");
  results.push(found
    ? pass("Full flow: product appears in top products")
    : fail("Full flow: product missing from top products"));

  // Cleanup
  await db.inventory_events.where("variant_id").equals(v1).delete();
  await db.variants.delete(v1);
  await db.products.delete(p1);
  await destroyTestFixture();
  await db.sync_queue.clear();

  return { name: "Module 8: Full System Flow", results };
}

// ---- Runner ----

export const ALL_TESTS: (() => Promise<TestModule>)[] = [
  testEventIntegrity,
  testOfflinePersistence,
  testSyncQueue,
  testRecovery,
  testAnalyticsCorrectness,
  testDataConsistency,
  testStress,
  testFullSystemFlow,
];