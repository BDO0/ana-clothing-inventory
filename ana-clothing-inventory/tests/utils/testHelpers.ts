// Test Helpers — mock creation, database reset, network simulation
import { db } from "../../src/db/database";
import type { InventoryEvent } from "../../src/db/models";

let idCounter = 1;
export function nextId(): string {
  return `test-id-${idCounter++}`;
}

export function now(): number {
  return Date.now();
}

// ---- Mock Data Factories ----

export function createMockProduct(overrides: Partial<{ id: string; name: string; description: string }> = {}) {
  return {
    id: overrides.id ?? nextId(),
    name: overrides.name ?? "Test Product",
    description: overrides.description ?? "A test product",
    created_at: now(),
  };
}

export function createMockVariant(
  product_id: string,
  overrides: Partial<{ id: string; size: string; color: string; sku: string }> = {}
) {
  return {
    id: overrides.id ?? nextId(),
    product_id,
    size: overrides.size ?? "M",
    color: overrides.color ?? "Black",
    sku: overrides.sku ?? `SKU-${nextId()}`,
  };
}

export function createStockInEvent(
  variant_id: string,
  quantity: number = 10,
  overrides: Partial<InventoryEvent> = {}
): Omit<InventoryEvent, "id" | "created_at" | "synced"> {
  return {
    variant_id,
    type: "STOCK_IN",
    quantity,
    reference: overrides.reference ?? "PO-001",
    note: overrides.note ?? "Initial stock",
  };
}

export function createSaleEvent(
  variant_id: string,
  quantity: number = 5,
  overrides: Partial<InventoryEvent> = {}
): Omit<InventoryEvent, "id" | "created_at" | "synced"> {
  return {
    variant_id,
    type: "SALE",
    quantity,
    reference: overrides.reference,
    note: overrides.note ?? "Walk-in sale",
  };
}

export function createReturnEvent(
  variant_id: string,
  quantity: number = 2,
  overrides: Partial<InventoryEvent> = {}
): Omit<InventoryEvent, "id" | "created_at" | "synced"> {
  return {
    variant_id,
    type: "RETURN",
    quantity,
    reference: overrides.reference ?? "RMA-001",
    note: overrides.note ?? "Customer return",
  };
}

export function createAdjustmentEvent(
  variant_id: string,
  quantity: number = 3,
  overrides: Partial<InventoryEvent> = {}
): Omit<InventoryEvent, "id" | "created_at" | "synced"> {
  return {
    variant_id,
    type: "ADJUSTMENT",
    quantity,
    reference: overrides.reference,
    note: overrides.note ?? "Stock adjustment",
  };
}

// ---- Database Helpers ----

export async function resetDatabase(): Promise<void> {
  await Promise.all([
    db.inventory_events.clear(),
    db.products.clear(),
    db.variants.clear(),
    db.sync_queue.clear(),
  ]);
}

// ---- Network Simulation ----

export function simulateOfflineMode(): void {
  Object.defineProperty(navigator, "onLine", {
    value: false,
    configurable: true,
    writable: true,
  });
  window.dispatchEvent(new Event("offline"));
}

export function simulateOnlineMode(): void {
  Object.defineProperty(navigator, "onLine", {
    value: true,
    configurable: true,
    writable: true,
  });
  window.dispatchEvent(new Event("online"));
}