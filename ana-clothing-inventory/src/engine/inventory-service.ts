// Inventory Event Creation Logic
// Wraps appendEvent() with domain validation.

import { appendEvent, db } from "../db/database";
import { getStock } from "./stock-engine";

/**
 * Record a STOCK_IN event — adds inventory to a variant.
 * Validates variant exists and quantity > 0.
 */
export async function stockIn(
  variant_id: string,
  quantity: number,
  note?: string,
  reference?: string
): Promise<void> {
  if (quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  const variant = await db.variants.get(variant_id);
  if (!variant) {
    throw new Error(`Variant not found: ${variant_id}`);
  }

  await appendEvent({
    variant_id,
    type: "STOCK_IN",
    quantity,
    note,
    reference,
  });
}

/**
 * Record a SALE event — removes inventory from a variant.
 * Validates variant exists, quantity > 0, and warns if stock goes negative.
 */
export async function recordSale(
  variant_id: string,
  quantity: number,
  note?: string,
  reference?: string
): Promise<void> {
  if (quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  const variant = await db.variants.get(variant_id);
  if (!variant) {
    throw new Error(`Variant not found: ${variant_id}`);
  }

  // Optional: warn but don't block negative stock
  const currentStock = await getStock(variant_id);
  if (currentStock - quantity < 0) {
    console.warn(
      `[Inventory] Sale of ${quantity} exceeds current stock (${currentStock}). ` +
        `Stock will go negative.`
    );
  }

  await appendEvent({
    variant_id,
    type: "SALE",
    quantity,
    note,
    reference,
  });
}

/**
 * Record a RETURN event — restocks inventory from a customer return.
 * Validates variant exists and quantity > 0.
 */
export async function recordReturn(
  variant_id: string,
  quantity: number,
  note?: string,
  reference?: string
): Promise<void> {
  if (quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  const variant = await db.variants.get(variant_id);
  if (!variant) {
    throw new Error(`Variant not found: ${variant_id}`);
  }

  await appendEvent({
    variant_id,
    type: "RETURN",
    quantity,
    note,
    reference,
  });
}

/**
 * Record an ADJUSTMENT event — adds or removes inventory for corrections.
 * Quantity can be positive (add) or negative (remove). Cannot be 0.
 * Validates variant exists.
 */
export async function recordAdjustment(
  variant_id: string,
  quantity: number,
  note?: string,
  reference?: string
): Promise<void> {
  if (quantity === 0) {
    throw new Error("Quantity must not be 0");
  }

  const variant = await db.variants.get(variant_id);
  if (!variant) {
    throw new Error(`Variant not found: ${variant_id}`);
  }

  await appendEvent({
    variant_id,
    type: "ADJUSTMENT",
    quantity,
    note,
    reference,
  });
}
