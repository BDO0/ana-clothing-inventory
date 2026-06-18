// Analytics Engine — derives business metrics from raw events.
// Read-only. Never writes to IndexedDB. Never mutates data.
// All data comes from inventory_events via the engine layer.

import { db } from "../db/database";
import { getStock } from "./stock-engine";
import { getAllProducts, getAllVariants } from "./queries";

// -----------------------------------------------------------------------
// 1. Daily Sales Summary
// -----------------------------------------------------------------------

export interface DailySales {
  date: string;
  totalSalesCount: number;
  totalQuantity: number;
  transactions: number;
}

/**
 * Get sales summary for a specific date (YYYY-MM-DD format).
 * Counts all SALE events that occurred on that date.
 */
export async function getDailySales(date: string): Promise<DailySales> {
  const dateStart = new Date(date).getTime();
  const dateEnd = dateStart + 86_400_000; // +24 hours

  const salesEvents = await db.inventory_events
    .where("type")
    .equals("SALE")
    .filter((e) => e.created_at >= dateStart && e.created_at < dateEnd)
    .toArray();

  return {
    date,
    totalSalesCount: salesEvents.length,
    totalQuantity: salesEvents.reduce((sum, e) => sum + e.quantity, 0),
    transactions: salesEvents.length,
  };
}

// -----------------------------------------------------------------------
// 2. Product Performance
// -----------------------------------------------------------------------

export interface ProductPerformance {
  productId: string;
  productName: string;
  totalSalesQuantity: number;
  totalSalesEvents: number;
}

/**
 * Get top-performing products based on SALE event volume.
 * Aggregates SALE events by product_id (via variants).
 */
export async function getTopProducts(limit = 10): Promise<ProductPerformance[]> {
  const [products, variants] = await Promise.all([
    getAllProducts(),
    getAllVariants(),
  ]);

  // Build variant → product mapping
  const productMap = new Map(products.map((p) => [p.id, p.name]));
  const variantToProduct = new Map(variants.map((v) => [v.id, v.product_id]));

  // Get all SALE events
  const saleEvents = await db.inventory_events
    .where("type")
    .equals("SALE")
    .toArray();

  // Aggregate by product
  const productSales = new Map<
    string,
    { qty: number; count: number }
  >();

  for (const event of saleEvents) {
    const productId = variantToProduct.get(event.variant_id);
    if (!productId) continue;

    const current = productSales.get(productId) ?? { qty: 0, count: 0 };
    current.qty += event.quantity;
    current.count += 1;
    productSales.set(productId, current);
  }

  // Sort by total quantity descending
  return [...productSales.entries()]
    .map(([productId, data]) => ({
      productId,
      productName: productMap.get(productId) ?? "Unknown Product",
      totalSalesQuantity: data.qty,
      totalSalesEvents: data.count,
    }))
    .sort((a, b) => b.totalSalesQuantity - a.totalSalesQuantity)
    .slice(0, limit);
}

// -----------------------------------------------------------------------
// 3. Stock Snapshot
// -----------------------------------------------------------------------

export interface StockSummary {
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
  lowStockItems: number;
  outOfStockItems: number;
  lowStockThreshold: number;
}

const LOW_STOCK_THRESHOLD = 5;

/**
 * Get a snapshot of current inventory levels across all variants.
 * Uses getStock() from stock-engine for consistency.
 */
export async function getStockSummary(): Promise<StockSummary> {
  const [products, variants] = await Promise.all([
    getAllProducts(),
    getAllVariants(),
  ]);

  const stockResults = await Promise.all(
    variants.map(async (v) => ({
      variantId: v.id,
      stock: await getStock(v.id),
    }))
  );

  const totalStock = stockResults.reduce((sum, r) => sum + r.stock, 0);
  const lowStockItems = stockResults.filter(
    (r) => r.stock > 0 && r.stock < LOW_STOCK_THRESHOLD
  ).length;
  const outOfStockItems = stockResults.filter((r) => r.stock <= 0).length;

  return {
    totalProducts: products.length,
    totalVariants: variants.length,
    totalStock,
    lowStockItems,
    outOfStockItems,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
  };
}

// -----------------------------------------------------------------------
// 4. Event Trends
// -----------------------------------------------------------------------

export interface TrendData {
  label: string;
  stockIn: number;
  sale: number;
  ratio: number;
}

/**
 * Get STOCK_IN vs SALE trends over a time range.
 * range: "7d" = 7 days, "30d" = 30 days.
 * Returns daily breakdown with ratio (stockIn/sale).
 */
export async function getEventTrends(
  range: "7d" | "30d" = "7d"
): Promise<TrendData[]> {
  const days = range === "7d" ? 7 : 30;
  const now = Date.now();
  const rangeStart = now - days * 86_400_000;

  const events = await db.inventory_events
    .where("created_at")
    .aboveOrEqual(rangeStart)
    .toArray();

  // Group by day
  const dayBuckets = new Map<
    string,
    { stockIn: number; sale: number }
  >();

  for (let i = 0; i < days; i++) {
    const d = new Date(now - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    dayBuckets.set(key, { stockIn: 0, sale: 0 });
  }

  for (const event of events) {
    const key = new Date(event.created_at).toISOString().slice(0, 10);
    const bucket = dayBuckets.get(key);
    if (!bucket) continue;

    if (event.type === "STOCK_IN") {
      bucket.stockIn += event.quantity;
    } else if (event.type === "SALE") {
      bucket.sale += event.quantity;
    }
  }

  return [...dayBuckets.entries()]
    .map(([label, data]) => ({
      label,
      stockIn: data.stockIn,
      sale: data.sale,
      ratio: data.sale > 0 ? data.stockIn / data.sale : 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}