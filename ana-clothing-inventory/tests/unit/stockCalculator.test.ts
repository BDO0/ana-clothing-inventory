// Unit tests for getStock() — stock computation from events via Dexie/IndexedDB
import { describe, it, expect, beforeEach } from "vitest";
import { getStock } from "../../src/engine/stock-engine";
import { appendEvent, db } from "../../src/db/database";
import {
  resetDatabase,
  createStockInEvent,
  createSaleEvent,
  createReturnEvent,
  createAdjustmentEvent,
} from "../utils/testHelpers";

describe("getStock — stock calculator", () => {
  const variantId = "variant-t-shirt-m";

  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return 0 when no events exist", async () => {
    const stock = await getStock(variantId);
    expect(stock).toBe(0);
  });

  it("should compute correct stock from STOCK_IN events only", async () => {
    await appendEvent(createStockInEvent(variantId, 30));
    await appendEvent(createStockInEvent(variantId, 20));

    const stock = await getStock(variantId);
    expect(stock).toBe(50);
  });

  it("should compute correct stock from mixed STOCK_IN and SALE events", async () => {
    await appendEvent(createStockInEvent(variantId, 30));
    await appendEvent(createStockInEvent(variantId, 20));
    await appendEvent(createSaleEvent(variantId, 5));
    await appendEvent(createSaleEvent(variantId, 3));

    const stock = await getStock(variantId);
    expect(stock).toBe(42);
  });

  it("should correctly apply RETURN events (increase stock)", async () => {
    await appendEvent(createStockInEvent(variantId, 10));
    await appendEvent(createSaleEvent(variantId, 8));
    await appendEvent(createReturnEvent(variantId, 2));

    const stock = await getStock(variantId);
    expect(stock).toBe(4);
  });

  it("should correctly apply ADJUSTMENT events (decrease stock)", async () => {
    await appendEvent(createStockInEvent(variantId, 50));
    await appendEvent(createAdjustmentEvent(variantId, 3));

    const stock = await getStock(variantId);
    expect(stock).toBe(47);
  });

  it("should handle a large dataset (stress test with 1000 events)", async () => {
    for (let i = 0; i < 500; i++) {
      await appendEvent(createStockInEvent(variantId, 1));
    }
    for (let i = 0; i < 500; i++) {
      await appendEvent(createSaleEvent(variantId, 1));
    }

    const stock = await getStock(variantId);
    expect(stock).toBe(0);
  });

  it("should isolate stock per variant (not cross-contaminate)", async () => {
    const hoodieId = "variant-hoodie-l";
    const jeansId = "variant-jeans-32";

    await appendEvent(createStockInEvent(hoodieId, 30));
    await appendEvent(createStockInEvent(jeansId, 50));
    await appendEvent(createSaleEvent(hoodieId, 5));

    const hoodieStock = await getStock(hoodieId);
    const jeansStock = await getStock(jeansId);

    expect(hoodieStock).toBe(25);
    expect(jeansStock).toBe(50);
  });
});