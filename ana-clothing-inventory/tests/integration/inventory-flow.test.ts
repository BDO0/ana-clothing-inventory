// Integration tests — full inventory lifecycle (STOCK_IN → SALE → RETURN)
import { describe, it, expect, beforeEach } from "vitest";
import { getStock } from "../../src/engine/stock-engine";
import { stockIn, recordSale } from "../../src/engine/inventory-service";
import { appendEvent, db, addProduct, addVariant } from "../../src/db/database";
import {
  resetDatabase,
  createReturnEvent,
  createAdjustmentEvent,
} from "../utils/testHelpers";

describe("Inventory Flow — full lifecycle", () => {
  let productId: string;
  let variantId: string;

  beforeEach(async () => {
    await resetDatabase();
    productId = await addProduct({ name: "Korean T-Shirt" });
    variantId = await addVariant({ product_id: productId, size: "M", color: "White", sku: "TSH-WHT-M" });
  });

  it("should complete a full STOCK_IN → getStock → SALE → getStock lifecycle", async () => {
    // Phase 1: Stock in 50 units
    await stockIn(variantId, 50, "Initial shipment");

    let currentStock = await getStock(variantId);
    expect(currentStock).toBe(50);

    // Phase 2: Record a sale of 5 units
    await recordSale(variantId, 5, "Customer #001");

    currentStock = await getStock(variantId);
    expect(currentStock).toBe(45);

    // Phase 3: Verify event history
    const events = await db.inventory_events.where("variant_id").equals(variantId).sortBy("created_at");
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("STOCK_IN");
    expect(events[1].type).toBe("SALE");

    // Verify events haven't been modified
    expect(events[0].synced).toBe(false);
    expect(events[1].synced).toBe(false);
  });

  it("should handle RETURN events correctly (stock increase)", async () => {
    await stockIn(variantId, 10);
    await recordSale(variantId, 8);
    // Return 2 units
    await appendEvent(createReturnEvent(variantId, 2));

    const stock = await getStock(variantId);
    expect(stock).toBe(4);
  });

  it("should handle ADJUSTMENT events correctly (stock decrease)", async () => {
    await stockIn(variantId, 50);
    // Adjust down by 3
    await appendEvent(createAdjustmentEvent(variantId, 3));

    const stock = await getStock(variantId);
    expect(stock).toBe(47);
  });

  it("should isolate inventory between variants", async () => {
    const variant2Id = await addVariant({ product_id: productId, size: "L", color: "Black", sku: "TSH-BLK-L" });

    await stockIn(variantId, 30);
    await stockIn(variant2Id, 50);
    await recordSale(variantId, 5);

    expect(await getStock(variantId)).toBe(25);
    expect(await getStock(variant2Id)).toBe(50);
  });

  it("should allow selling more than current stock (overdraft)", async () => {
    await stockIn(variantId, 10);

    // Sell 15 when only 10 are available
    await recordSale(variantId, 15);

    const stock = await getStock(variantId);
    expect(stock).toBe(-5);
  });
});