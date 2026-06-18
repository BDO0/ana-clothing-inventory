// Unit tests for product-service.ts — createProduct and createVariant
import { describe, it, expect, beforeEach } from "vitest";
import { createProduct, createVariant } from "../../src/engine/product-service";
import { db } from "../../src/db/database";
import { getAllProducts, getAllVariants, getVariantsByProduct } from "../../src/engine/queries";
import { resetDatabase } from "../utils/testHelpers";

describe("product-service — createProduct", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should create a product and return its ID", async () => {
    const id = await createProduct({ name: "Denim Jacket", description: "Blue denim" });

    expect(id).toBeDefined();
    expect(typeof id).toBe("string");

    const products = await getAllProducts();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("Denim Jacket");
    expect(products[0].description).toBe("Blue denim");
  });

  it("should assign unique IDs to multiple products", async () => {
    const id1 = await createProduct({ name: "Product A" });
    const id2 = await createProduct({ name: "Product B" });

    expect(id1).not.toBe(id2);

    const products = await getAllProducts();
    expect(products).toHaveLength(2);
  });

  it("should assign created_at timestamp", async () => {
    await createProduct({ name: "Timed Product" });

    const products = await getAllProducts();
    expect(products[0].created_at).toBeGreaterThan(0);
    expect(typeof products[0].created_at).toBe("number");
  });
});

describe("product-service — createVariant", () => {
  let productId: string;

  beforeEach(async () => {
    await resetDatabase();
    productId = await createProduct({ name: "Base Product" });
  });

  it("should create a variant under a product", async () => {
    const variantId = await createVariant({
      product_id: productId,
      size: "XL",
      color: "Red",
      sku: "BAS-RED-XL",
    });

    expect(variantId).toBeDefined();
    expect(typeof variantId).toBe("string");

    const variants = await getVariantsByProduct(productId);
    expect(variants).toHaveLength(1);
    expect(variants[0].size).toBe("XL");
    expect(variants[0].color).toBe("Red");
    expect(variants[0].sku).toBe("BAS-RED-XL");
  });

  it("should assign unique IDs to multiple variants", async () => {
    const id1 = await createVariant({ product_id: productId, size: "S", sku: "BAS-S" });
    const id2 = await createVariant({ product_id: productId, size: "M", sku: "BAS-M" });

    expect(id1).not.toBe(id2);

    const variants = await getVariantsByProduct(productId);
    expect(variants).toHaveLength(2);
  });

  it("should isolate variants per product", async () => {
    const product2Id = await createProduct({ name: "Second Product" });

    await createVariant({ product_id: productId, size: "S", sku: "BAS-S" });
    await createVariant({ product_id: product2Id, size: "L", sku: "SEC-L" });

    expect((await getVariantsByProduct(productId)).length).toBe(1);
    expect((await getVariantsByProduct(product2Id)).length).toBe(1);
  });
});