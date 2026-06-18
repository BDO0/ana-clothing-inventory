// Report Engine — structured business reports from analytics.
// Read-only. Calls analytics-engine internally; never accesses DB directly.

import { getDailySales, getTopProducts, getStockSummary } from "./analytics-engine";
import { getAllProducts, getAllVariants, getRecentEvents } from "./queries";
import { getStock } from "./stock-engine";
import type { Variant } from "../db/models";

// -----------------------------------------------------------------------
// 1. Inventory Report
// -----------------------------------------------------------------------

export interface InventoryReportItem {
  productId: string;
  productName: string;
  variants: {
    variantId: string;
    size?: string;
    color?: string;
    sku?: string;
    stock: number;
  }[];
  totalStock: number;
}

export interface InventoryReport {
  generatedAt: string;
  items: InventoryReportItem[];
  totalProducts: number;
  totalVariants: number;
  totalStock: number;
}

/**
 * Generate a full inventory report with product and variant breakdown.
 * Stock is computed via getStock() — never stored or cached.
 */
export async function generateInventoryReport(): Promise<InventoryReport> {
  const [products, variants] = await Promise.all([
    getAllProducts(),
    getAllVariants(),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Group variants by product
  const variantsByProduct = new Map<string, Variant[]>();
  for (const v of variants) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push(v);
    variantsByProduct.set(v.product_id, list);
  }

  let totalStock = 0;
  const items: InventoryReportItem[] = [];

  for (const [productId, productVariants] of variantsByProduct) {
    const product = productMap.get(productId);
    if (!product) continue;

    const variantStock = await Promise.all(
      productVariants.map(async (v) => ({
        variantId: v.id,
        size: v.size,
        color: v.color,
        sku: v.sku,
        stock: await getStock(v.id),
      }))
    );

    const productTotal = variantStock.reduce((sum, vs) => sum + vs.stock, 0);
    totalStock += productTotal;

    items.push({
      productId: product.id,
      productName: product.name,
      variants: variantStock,
      totalStock: productTotal,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    items,
    totalProducts: products.length,
    totalVariants: variants.length,
    totalStock,
  };
}

// -----------------------------------------------------------------------
// 2. Sales Report
// -----------------------------------------------------------------------

export interface SalesReportEntry {
  date: string;
  totalQuantity: number;
  transactions: number;
}

export interface SalesReport {
  generatedAt: string;
  startDate: string;
  endDate: string;
  totalSales: number;
  days: SalesReportEntry[];
  topProducts: { name: string; quantity: number }[];
}

/**
 * Generate a sales report for a date range.
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 */
export async function generateSalesReport(
  startDate: string,
  endDate: string
): Promise<SalesReport> {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime() + 86_400_000;

  // Get daily breakdown
  const days: SalesReportEntry[] = [];
  const cursor = new Date(start);
  let totalSales = 0;

  while (cursor.getTime() < end) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const day = await getDailySales(dateStr);
    if (day.totalQuantity > 0) {
      days.push({
        date: dateStr,
        totalQuantity: day.totalQuantity,
        transactions: day.transactions,
      });
      totalSales += day.totalQuantity;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Get top products
  const topProductsRaw = await getTopProducts(5);
  const topProducts = topProductsRaw.map((p) => ({
    name: p.productName,
    quantity: p.totalSalesQuantity,
  }));

  return {
    generatedAt: new Date().toISOString(),
    startDate,
    endDate,
    totalSales,
    days,
    topProducts,
  };
}

// -----------------------------------------------------------------------
// 3. Business Overview
// -----------------------------------------------------------------------

export interface BusinessOverview {
  generatedAt: string;
  products: { total: number };
  stock: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
  sales: {
    totalEvents: number;
    recentSales: number;
  };
}

/**
 * Generate a high-level business overview.
 */
export async function generateBusinessOverview(): Promise<BusinessOverview> {
  const [stockSummary, recentEvents] = await Promise.all([
    getStockSummary(),
    getRecentEvents(50),
  ]);

  const recentSalesCount = recentEvents.filter(
    (e) => e.type === "SALE"
  ).length;

  const salesEvents = recentEvents.filter((e) => e.type === "SALE");
  const totalSalesQuantity = salesEvents.reduce(
    (sum, e) => sum + e.quantity,
    0
  );

  return {
    generatedAt: new Date().toISOString(),
    products: {
      total: stockSummary.totalProducts,
    },
    stock: {
      total: stockSummary.totalStock,
      lowStock: stockSummary.lowStockItems,
      outOfStock: stockSummary.outOfStockItems,
    },
    sales: {
      totalEvents: stockSummary.totalVariants > 0 ? totalSalesQuantity : 0,
      recentSales: recentSalesCount,
    },
  };
}