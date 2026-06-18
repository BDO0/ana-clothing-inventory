// Unit tests for inventory-service.ts — stockIn and recordSale
import { describe, it, expect, beforeEach } from "vitest";
import { stockIn, recordSale } from "../../src/engine/inventory-service";
import { appendEvent, db, addProduct, addVariant } from "../../src/db/database";
import { getStock } from "../../src/engine/stock-engine";
import { resetDatabase } from "../utils/testHelpers";

describe("inventory-service — stockIn", () => {
  let variantId: string;

  beforeEach(async () => {
    await resetDatabase();
    const productId = await addProduct({ name: "Test Product" });
    variantId = await addVariant({ product_id: productId, size: "M", sku: "TST-M" });
  });

  it("should create a STOCK_IN event with correct quantity", async () => {
    await stockIn(variantId, 25, "Shipment #1", "PO-100");

    const stock = await getStock(variantId);
    expect(stock).toBe(25);

    const events = await db.inventory_events.where("variant_id").equals(variantId).sortBy("created_at");
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("STOCK_IN");
    expect(events[0].quantity).toBe(25);
    expect(events[0].note).toBe("Shipment #1");
    expect(events[0].reference).toBe("PO-100");
  });

  it("should throw if variant does not exist", async () => {
    await expect(stockIn("nonexistent-variant", 10)).rejects.toThrow("Variant not found");
  });

  it("should throw if quantity is 0", async () => {
    await expect(stockIn(variantId, 0)).rejects.toThrow("Quantity must be greater than 0");
  });

  it("should throw if quantity is negative", async () => {
    await expect(stockIn(variantId, -5)).rejects.toThrow("Quantity must be greater than 0");
  });

  it("should append to sync_queue as PENDING", async () => {
    await stockIn(variantId, 10);

    const queue = await db.sync_queue.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe("PENDING");
    expect(queue[0].type).toBe("EVENT");
  });
});

describe("inventory-service — recordSale", () => {
  let variantId: string;

  beforeEach(async () => {
    await resetDatabase();
    const productId = await addProduct({ name: "Test Product" });
    variantId = await addVariant({ product_id: productId, size: "L", sku: "TST-L" });
    await stockIn(variantId, 50, "Initial");
  });

  it("should create a SALE event with correct quantity", async () => {
    await recordSale(variantId, 10, "Customer #002", "INV-200");

    const stock = await getStock(variantId);
    expect(stock).toBe(40);

    const events = await db.inventory_events.where("variant_id").equals(variantId).sortBy("created_at");
    expect(events).toHaveLength(2);
    expect(events[1].type).toBe("SALE");
    expect(events[1].quantity).toBe(10);
    expect(events[1].note).toBe("Customer #002");
  });

  it("should throw if variant does not exist", async () => {
    await expect(recordSale("nonexistent-variant", 5)).rejects.toThrow("Variant not found");
  });

  it("should throw if quantity is 0", async () => {
    await expect(recordSale(variantId, 0)).rejects.toThrow("Quantity must be greater than 0");
  });

  it("should allow negative stock (only warn)", async () => {
    // 50 in stock, sell 100
    await recordSale(variantId, 100);

    const stock = await getStock(variantId);
    expect(stock).toBe(-50);
  });

  it("should append to sync_queue as PENDING", async () => {
    await recordSale(variantId, 5);

    const queue = await db.sync_queue.toArray();
    expect(queue).toHaveLength(2); // one for stockIn, one for sale
    expect(queue[1].status).toBe("PENDING");
  });
});