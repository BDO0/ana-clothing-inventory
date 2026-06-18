// Analytics Queries — reusable event filters for analytics pages.
// Read-only. All data from inventory_events via the engine layer.

import { db } from "../db/database";
import type { InventoryEvent, EventType } from "../db/models";
import { getVariantsByProduct } from "./queries";

/**
 * Filter events by a date range (inclusive).
 * @param start Start date (YYYY-MM-DD or epoch timestamp)
 * @param end End date (YYYY-MM-DD or epoch timestamp)
 */
export async function filterEventsByDate(
  start: string | number,
  end: string | number
): Promise<InventoryEvent[]> {
  const startMs = typeof start === "string" ? new Date(start).getTime() : start;
  const endMs = typeof end === "string" ? new Date(end).getTime() + 86_400_000 : end;

  return db.inventory_events
    .where("created_at")
    .between(startMs, endMs)
    .toArray();
}

/**
 * Filter events by product ID.
 * Resolves all variants for the product and returns their events.
 */
export async function filterEventsByProduct(
  productId: string
): Promise<InventoryEvent[]> {
  const variants = await getVariantsByProduct(productId);
  if (variants.length === 0) return [];

  const variantIds = variants.map((v) => v.id);

  const events: InventoryEvent[] = [];
  for (const vid of variantIds) {
    const variantEvents = await db.inventory_events
      .where("variant_id")
      .equals(vid)
      .toArray();
    events.push(...variantEvents);
  }

  return events.sort((a, b) => b.created_at - a.created_at);
}

/**
 * Filter events by type (STOCK_IN, SALE, RETURN, ADJUSTMENT).
 */
export async function filterEventsByType(
  type: EventType
): Promise<InventoryEvent[]> {
  return db.inventory_events
    .where("type")
    .equals(type)
    .reverse()
    .sortBy("created_at");
}

/**
 * Get a combined summary count of events by type for a given variant.
 */
export async function getEventTypeCounts(
  variantId: string
): Promise<Record<EventType, number>> {
  const events = await db.inventory_events
    .where("variant_id")
    .equals(variantId)
    .toArray();

  return {
    STOCK_IN: events.filter((e) => e.type === "STOCK_IN").length,
    SALE: events.filter((e) => e.type === "SALE").length,
    RETURN: events.filter((e) => e.type === "RETURN").length,
    ADJUSTMENT: events.filter((e) => e.type === "ADJUSTMENT").length,
  };
}