// Event Model — TypeScript interfaces
// Follows /docs/02-event module.md and /docs/03-local-database.md

export type EventType = "STOCK_IN" | "SALE" | "RETURN" | "ADJUSTMENT";

export interface Product {
  id: string;
  name: string;
  category_id?: string;
  description?: string;
  created_at: number;
  synced?: boolean;
}

export interface Variant {
  id: string;
  product_id: string;
  size?: string;
  color?: string;
  sku?: string;
  barcode?: string;
  synced?: boolean;
}

export interface InventoryEvent {
  id: string;
  variant_id: string;
  type: EventType;
  quantity: number;
  reference?: string;
  note?: string;
  created_at: number;
  synced: boolean;
  user_id?: string; // UUID of the authenticated user who created this event (for audit trail)
}

export type SyncStatus = "PENDING" | "SYNCED" | "FAILED";

export interface SyncQueueItem {
  id?: number;
  type: "EVENT" | "PRODUCT" | "PRODUCT_UPDATE" | "PRODUCT_DELETE" | "VARIANT" | "VARIANT_UPDATE" | "VARIANT_DELETE";
  payload: unknown;
  status: SyncStatus;
  retries: number;
  created_at: number;
}