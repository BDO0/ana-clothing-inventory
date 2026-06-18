// Read-only query helpers for UI consumption.
// UI calls these — NOT the DB directly.
// These only read, never mutate. No business logic.

import { db } from "../db/database";
import type { Product, Variant, InventoryEvent } from "../db/models";

/**
 * Get all products, sorted by created_at descending.
 */
export async function getAllProducts(): Promise<Product[]> {
  return db.products.orderBy("created_at").reverse().toArray();
}

/**
 * Get a single product by ID.
 */
export async function getProductById(id: string): Promise<Product | undefined> {
  return db.products.get(id);
}

/**
 * Get all variants, sorted by SKU.
 */
export async function getAllVariants(): Promise<Variant[]> {
  return db.variants.orderBy("sku").toArray();
}

/**
 * Get all variants for a specific product.
 */
export async function getVariantsByProduct(
  product_id: string
): Promise<Variant[]> {
  return db.variants.where("product_id").equals(product_id).toArray();
}

/**
 * Get a single variant by ID.
 */
export async function getVariantById(id: string): Promise<Variant | undefined> {
  return db.variants.get(id);
}

/**
 * Get recent inventory events across all variants, newest first.
 * @param limit max number of events to return
 */
export async function getRecentEvents(limit = 20): Promise<InventoryEvent[]> {
  return db.inventory_events
    .orderBy("created_at")
    .reverse()
    .limit(limit)
    .toArray();
}