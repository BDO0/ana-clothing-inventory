// Stock Calculation Engine
// Follows /docs/05-stock-engine.md
// Stock is DERIVED, never stored. Always recompute from events.
//
// FUTURE: Performance upgrade for 10k+ events
// 1. Cached projections: store computed stock for each variant in a
//    separate table, updated only on new events (not full recompute).
// 2. Materialized snapshots: periodically save a snapshot of stock
//    at a given timestamp, then only compute delta from that point.
// 3. The current full-recompute approach is correct but O(n) per call.
//    For now (hundreds to low-thousands of events) this is fine.

import { db } from "../db/database";
import type { InventoryEvent } from "../db/models";

/**
 * Computes current stock for a variant by summing all its events.
 *
 * Formula:
 *   stock = sum(STOCK_IN) - sum(SALE) + sum(RETURN) - sum(ADJUSTMENT)
 *
 * Returns 0 if no events exist for the variant.
 */
export async function getStock(variant_id: string): Promise<number> {
  const events: InventoryEvent[] = await db.inventory_events
    .where("variant_id")
    .equals(variant_id)
    .toArray();

  let stock = 0;

  for (const event of events) {
    switch (event.type) {
      case "STOCK_IN":
        stock += event.quantity;
        break;
      case "RETURN":
        stock += event.quantity;
        break;
      case "SALE":
        stock -= event.quantity;
        break;
      case "ADJUSTMENT":
        stock -= event.quantity;
        break;
    }
  }

  return stock;
}

/**
 * Returns all inventory events for a variant, ordered by created_at.
 */
export async function getEventHistory(
  variant_id: string
): Promise<InventoryEvent[]> {
  return db.inventory_events
    .where("variant_id")
    .equals(variant_id)
    .sortBy("created_at");
}