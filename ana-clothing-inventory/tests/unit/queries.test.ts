// Unit tests for queries.ts — read-only query helpers
import { describe, it, expect, beforeEach } from "vitest";
import { createProduct, createVariant } from "../../src/engine/product-service";
import { stockIn } from "../../src/engine/inventory-service";
import {
  getAllProducts,
  getProductById,
  getAllVariants,
  getVariantsByProduct,
  getVariantById,
  getRecentEvents,
} from "../../src/engine/queries";
import { resetDatabase } from "../utils/testHelpers";

describe("queries — getAllProducts", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return empty array when no products exist", async () => {
    const products = await getAllProducts();
    expect(products).toEqual([]);
  });

  it("should return all products sorted by created_at descending", async () => {
    const id1 = await createProduct({ name: "Alpha" });
    await new Promise((r) => setTimeout(r, 5));
    const id2 = await createProduct({ name: "Beta" });

    const products = await getAllProducts();
    expect(products).toHaveLength(2);
    // Most recent first
    expect(products[0].name).toBe("Beta");
    expect(products[1].name).toBe("Alpha");
  });
});

describe("queries — getProductById", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return undefined when product not found", async () => {
    const product = await getProductById("nonexistent");
    expect(product).toBeUndefined();
  });

  it("should return the correct product", async () => {
    const id = await createProduct({ name: "Found Me" });
    const product = await getProductById(id);
    expect(product).toBeDefined();
    expect(product!.name).toBe("Found Me");
  });
});

describe("queries — getAllVariants", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return all variants sorted by SKU", async () => {
    const productId = await createProduct({ name: "Parent" });
    await createVariant({ product_id: productId, size: "L", sku: "Z-L" });
    await createVariant({ product_id: productId, size: "S", sku: "A-S" });

    const variants = await getAllVariants();
    expect(variants).toHaveLength(2);
    expect(variants[0].sku).toBe("A-S");
    expect(variants[1].sku).toBe("Z-L");
  });
});

describe("queries — getVariantsByProduct", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return only variants for the given product", async () => {
    const prod1 = await createProduct({ name: "Product 1" });
    const prod2 = await createProduct({ name: "Product 2" });

    await createVariant({ product_id: prod1, sku: "P1-A" });
    await createVariant({ product_id: prod1, sku: "P1-B" });
    await createVariant({ product_id: prod2, sku: "P2-A" });

    const p1Variants = await getVariantsByProduct(prod1);
    expect(p1Variants).toHaveLength(2);
    expect(p1Variants.every((v) => v.product_id === prod1)).toBe(true);
  });
});

describe("queries — getVariantById", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return undefined when variant not found", async () => {
    const variant = await getVariantById("nonexistent");
    expect(variant).toBeUndefined();
  });

  it("should return the correct variant", async () => {
    const prodId = await createProduct({ name: "P" });
    const variantId = await createVariant({ product_id: prodId, sku: "FOUND-SKU", size: "XL" });

    const variant = await getVariantById(variantId);
    expect(variant).toBeDefined();
    expect(variant!.sku).toBe("FOUND-SKU");
    expect(variant!.size).toBe("XL");
  });
});

describe("queries — getRecentEvents", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return events sorted by created_at descending (newest first)", async () => {
    const prodId = await createProduct({ name: "Event Product" });
    const variantId = await createVariant({ product_id: prodId, sku: "EVT-1" });

    await stockIn(variantId, 10, "First");
    await new Promise((r) => setTimeout(r, 5));
    await stockIn(variantId, 20, "Second");
    await new Promise((r) => setTimeout(r, 5));
    await stockIn(variantId, 30, "Third");

    const events = await getRecentEvents(10);
    expect(events).toHaveLength(3);
    expect(events[0].note).toBe("Third");
    expect(events[1].note).toBe("Second");
    expect(events[2].note).toBe("First");
  });

  it("should respect the limit parameter", async () => {
    const prodId = await createProduct({ name: "Event Product" });
    const variantId = await createVariant({ product_id: prodId, sku: "EVT-2" });

    await stockIn(variantId, 1);
    await stockIn(variantId, 2);
    await stockIn(variantId, 3);
    await stockIn(variantId, 4);
    await stockIn(variantId, 5);

    const events = await getRecentEvents(3);
    expect(events).toHaveLength(3);
  });
});