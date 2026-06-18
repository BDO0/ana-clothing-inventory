// Supabase Client — write-only wrapper for sync engine.
// UI NEVER calls Supabase directly. Only sync engine does.
// Uses fetch() directly — no Supabase SDK dependency.

import type { InventoryEventDTO } from "./dto";
import { getAuthToken } from "../auth/auth-service";

export type SyncErrorType =
  | "NETWORK"
  | "VALIDATION"
  | "SERVER"
  | "UNKNOWN";

export interface SupabaseResponse {
  ok: boolean;
  errorType: SyncErrorType;
  status: number;
  statusText: string;
}

export type SyncConfig = {
  supabaseUrl?: string;
  supabaseKey?: string;
  tableName?: string;
};

/**
 * Classify a fetch error into a SyncErrorType.
 */
export function classifyError(
  status: number,
  statusText: string
): SyncErrorType {
  if (status === 0 || status === 429 || status >= 500) {
    return "SERVER";
  }
  if (status === 400 || status === 422) {
    return "VALIDATION";
  }
  if (status >= 400 && status < 500) {
    return "UNKNOWN";
  }
  if (statusText.includes("network") || statusText.includes("Failed to fetch")) {
    return "NETWORK";
  }
  return "UNKNOWN";
}

export class SupabaseClient {
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  private getEndpoint(): string {
    const { supabaseUrl, tableName } = this.config;
    return `${supabaseUrl}/rest/v1/${tableName}`;
  }

  private getTableEndpoint(table: string): string {
    return `${this.config.supabaseUrl}/rest/v1/${table}`;
  }

  private headers(): Record<string, string> {
    const token = getAuthToken();
    return {
      "Content-Type": "application/json",
      apikey: this.config.supabaseKey!,
      Authorization: `Bearer ${token || this.config.supabaseKey!}`,
      Prefer: "return=minimal",
    };
  }

  /**
   * POST a single event to Supabase.
   */
  async postEvent(event: InventoryEventDTO): Promise<SupabaseResponse> {
    try {
      const response = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        return {
          ok: false,
          errorType: classifyError(response.status, response.statusText),
          status: response.status,
          statusText: response.statusText,
        };
      }

      return { ok: true, errorType: "NETWORK", status: 200, statusText: "OK" };
    } catch (err) {
      return {
        ok: false,
        errorType: "NETWORK",
        status: 0,
        statusText: err instanceof Error ? err.message : "Unknown network error",
      };
    }
  }

  /**
   * POST a single product to Supabase.
   */
  async postProduct(product: import("./dto").ProductDTO): Promise<SupabaseResponse> {
    try {
      const response = await fetch(this.getTableEndpoint("products"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(product),
      });
      if (!response.ok) {
        return { ok: false, errorType: classifyError(response.status, response.statusText), status: response.status, statusText: response.statusText };
      }
      return { ok: true, errorType: "NETWORK", status: 200, statusText: "OK" };
    } catch (err) {
      return { ok: false, errorType: "NETWORK", status: 0, statusText: err instanceof Error ? err.message : "Unknown network error" };
    }
  }

  /**
   * POST a single variant to Supabase.
   */
  async postVariant(variant: import("./dto").VariantDTO): Promise<SupabaseResponse> {
    try {
      const response = await fetch(this.getTableEndpoint("variants"), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(variant),
      });
      if (!response.ok) {
        return { ok: false, errorType: classifyError(response.status, response.statusText), status: response.status, statusText: response.statusText };
      }
      return { ok: true, errorType: "NETWORK", status: 200, statusText: "OK" };
    } catch (err) {
      return { ok: false, errorType: "NETWORK", status: 0, statusText: err instanceof Error ? err.message : "Unknown network error" };
    }
  }

  /**
   * PATCH a single product in Supabase.
   */
  async patchProduct(product: import("./dto").ProductDTO): Promise<SupabaseResponse> {
    try {
      const url = `${this.getTableEndpoint("products")}?id=eq.${product.id}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: this.headers(),
        body: JSON.stringify(product),
      });
      if (!response.ok) return { ok: false, errorType: classifyError(response.status, response.statusText), status: response.status, statusText: response.statusText };
      return { ok: true, errorType: "NETWORK", status: 200, statusText: "OK" };
    } catch (err) {
      return { ok: false, errorType: "NETWORK", status: 0, statusText: err instanceof Error ? err.message : "Unknown network error" };
    }
  }

  /**
   * DELETE a single product from Supabase.
   */
  async deleteProduct(id: string): Promise<SupabaseResponse> {
    try {
      const url = `${this.getTableEndpoint("products")}?id=eq.${id}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: this.headers(),
      });
      if (!response.ok) return { ok: false, errorType: classifyError(response.status, response.statusText), status: response.status, statusText: response.statusText };
      return { ok: true, errorType: "NETWORK", status: 200, statusText: "OK" };
    } catch (err) {
      return { ok: false, errorType: "NETWORK", status: 0, statusText: err instanceof Error ? err.message : "Unknown network error" };
    }
  }

  /**
   * PATCH a single variant in Supabase.
   */
  async patchVariant(variant: import("./dto").VariantDTO): Promise<SupabaseResponse> {
    try {
      const url = `${this.getTableEndpoint("variants")}?id=eq.${variant.id}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: this.headers(),
        body: JSON.stringify(variant),
      });
      if (!response.ok) return { ok: false, errorType: classifyError(response.status, response.statusText), status: response.status, statusText: response.statusText };
      return { ok: true, errorType: "NETWORK", status: 200, statusText: "OK" };
    } catch (err) {
      return { ok: false, errorType: "NETWORK", status: 0, statusText: err instanceof Error ? err.message : "Unknown network error" };
    }
  }

  /**
   * DELETE a single variant from Supabase.
   */
  async deleteVariant(id: string): Promise<SupabaseResponse> {
    try {
      const url = `${this.getTableEndpoint("variants")}?id=eq.${id}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: this.headers(),
      });
      if (!response.ok) return { ok: false, errorType: classifyError(response.status, response.statusText), status: response.status, statusText: response.statusText };
      return { ok: true, errorType: "NETWORK", status: 200, statusText: "OK" };
    } catch (err) {
      return { ok: false, errorType: "NETWORK", status: 0, statusText: err instanceof Error ? err.message : "Unknown network error" };
    }
  }

  /**
   * POST multiple events as a batch to Supabase.
   * All events in a single request succeed or fail atomically.
   */
  async postEvents(events: InventoryEventDTO[]): Promise<SupabaseResponse> {
    try {
      const response = await fetch(this.getEndpoint(), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(events),
      });

      if (!response.ok) {
        return {
          ok: false,
          errorType: classifyError(response.status, response.statusText),
          status: response.status,
          statusText: response.statusText,
        };
      }

      return { ok: true, errorType: "NETWORK", status: 200, statusText: "OK" };
    } catch (err) {
      return {
        ok: false,
        errorType: "NETWORK",
        status: 0,
        statusText: err instanceof Error ? err.message : "Unknown network error",
      };
    }
  }

  /**
   * GET events from Supabase.
   */
  async getEvents(variantId?: string): Promise<InventoryEventDTO[]> {
    try {
      let url = `${this.getTableEndpoint("inventory_events")}?select=id,variant_id,type,quantity,reference,note,created_at,synced&order=created_at.asc`;
      if (variantId) {
        url += `&variant_id=eq.${variantId}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: this.headers(),
      });

      if (!response.ok) {
        console.warn(`[Supabase] GET events failed: ${response.status}`);
        return [];
      }

      return (await response.json()) as InventoryEventDTO[];
    } catch (err) {
      console.warn("[Supabase] GET events error:", err);
      return [];
    }
  }

  /**
   * GET products from Supabase.
   */
  async getProducts(): Promise<import("./dto").ProductDTO[]> {
    try {
      const url = `${this.getTableEndpoint("products")}?select=id,name,category_id,description,created_at&order=created_at.asc`;
      const response = await fetch(url, { method: "GET", headers: this.headers() });
      if (!response.ok) return [];
      return (await response.json()) as import("./dto").ProductDTO[];
    } catch (err) {
      console.warn("[Supabase] GET products error:", err);
      return [];
    }
  }

  /**
   * GET variants from Supabase.
   */
  async getVariants(): Promise<import("./dto").VariantDTO[]> {
    try {
      const url = `${this.getTableEndpoint("variants")}?select=id,product_id,size,color,sku,barcode`;
      const response = await fetch(url, { method: "GET", headers: this.headers() });
      if (!response.ok) return [];
      return (await response.json()) as import("./dto").VariantDTO[];
    } catch (err) {
      console.warn("[Supabase] GET variants error:", err);
      return [];
    }
  }
}