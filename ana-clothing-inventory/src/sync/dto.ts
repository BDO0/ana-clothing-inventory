// DTO Layer — normalizes events for Supabase compatibility.
// All events sent to Supabase MUST pass through toDTO().
// Raw InventoryEvent objects are NEVER sent directly.

import type { InventoryEvent } from "../db/models";

/**
 * DTO structure that exactly matches the Supabase inventory_events table.
 * Timestamps are ISO 8601 strings (not epoch numbers).
 */
export interface InventoryEventDTO {
  id: string;
  variant_id: string;
  type: "STOCK_IN" | "SALE" | "RETURN" | "ADJUSTMENT";
  quantity: number;
  reference?: string;
  note?: string;
  created_at: string;
  synced: boolean;
  user_id?: string; // UUID of the user who created this event — for audit trail
}

/**
 * Transform a local InventoryEvent into a Supabase-safe DTO.
 *
 * Transformations:
 * - created_at: epoch number → ISO 8601 string
 * - Strip any UI-only fields (none currently)
 * - Ensure type is constrained to valid values
 */
export function toDTO(event: InventoryEvent): InventoryEventDTO {
  return {
    id: event.id,
    variant_id: event.variant_id,
    type: event.type,
    quantity: event.quantity,
    reference: event.reference || undefined,
    note: event.note || undefined,
    created_at: new Date(event.created_at).toISOString(),
    synced: event.synced,
    user_id: event.user_id || undefined,
  };
}

/**
 * Batch transform multiple events to DTOs.
 */
export function toDTOBatch(events: InventoryEvent[]): InventoryEventDTO[] {
  return events.map(toDTO);
}

/**
 * Product DTO
 */
export interface ProductDTO {
  id: string;
  name: string;
  category_id?: string;
  description?: string;
  created_at: string;
}

export function toProductDTO(product: import("../db/models").Product): ProductDTO {
  return {
    id: product.id,
    name: product.name,
    category_id: product.category_id || undefined,
    description: product.description || undefined,
    created_at: new Date(product.created_at).toISOString(),
  };
}

/**
 * Variant DTO
 */
export interface VariantDTO {
  id: string;
  product_id: string;
  size?: string;
  color?: string;
  sku?: string;
  barcode?: string;
}

export function toVariantDTO(variant: import("../db/models").Variant): VariantDTO {
  return {
    id: variant.id,
    product_id: variant.product_id,
    size: variant.size || undefined,
    color: variant.color || undefined,
    sku: variant.sku || undefined,
    barcode: variant.barcode || undefined,
  };
}

/**
 * Reverse Transformers: DTO -> Local Models
 * Used during Cloud Hydration (Phase 2)
 */

export function fromProductDTO(dto: ProductDTO): import("../db/models").Product {
  return {
    id: dto.id,
    name: dto.name,
    category_id: dto.category_id,
    description: dto.description,
    created_at: new Date(dto.created_at).getTime(),
    synced: true, // Data from cloud is already synced
  };
}

export function fromVariantDTO(dto: VariantDTO): import("../db/models").Variant {
  return {
    id: dto.id,
    product_id: dto.product_id,
    size: dto.size || undefined,
    color: dto.color || undefined,
    sku: dto.sku || undefined,
    barcode: dto.barcode || undefined,
    synced: true,
  };
}

export function fromEventDTO(dto: InventoryEventDTO): import("../db/models").InventoryEvent {
  return {
    id: dto.id,
    variant_id: dto.variant_id,
    type: dto.type as import("../db/models").EventType,
    quantity: dto.quantity,
    reference: dto.reference || undefined,
    note: dto.note || undefined,
    created_at: new Date(dto.created_at).getTime(),
    synced: true,
    user_id: dto.user_id || undefined,
  };
}