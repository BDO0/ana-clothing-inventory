// Product & Variant creation — engine-level wrappers
// UI calls these, not the DB directly.
// These are thin proxies; validation happens in the DB layer.

import { 
  addProduct as dbAddProduct, 
  addVariant as dbAddVariant,
  updateProduct as dbUpdateProduct,
  deleteProduct as dbDeleteProduct,
  updateVariant as dbUpdateVariant,
  deleteVariant as dbDeleteVariant
} from "../db/database";
import type { Product, Variant } from "../db/models";

/**
 * Create a new product. Returns the product ID.
 */
export async function createProduct(
  product: Omit<Product, "id" | "created_at">
): Promise<string> {
  return dbAddProduct(product);
}

/**
 * Create a new variant. Returns the variant ID.
 */
export async function createVariant(
  variant: Omit<Variant, "id">
): Promise<string> {
  return dbAddVariant(variant);
}

/**
 * Edit an existing product.
 */
export async function editProduct(
  id: string,
  updates: Partial<Omit<Product, "id" | "created_at">>
): Promise<void> {
  return dbUpdateProduct(id, updates);
}

/**
 * Delete a product and its cascading variants/events.
 */
export async function removeProduct(id: string): Promise<void> {
  return dbDeleteProduct(id);
}

/**
 * Edit an existing variant.
 */
export async function editVariant(
  id: string,
  updates: Partial<Omit<Variant, "id" | "product_id">>
): Promise<void> {
  return dbUpdateVariant(id, updates);
}

/**
 * Delete a variant and its cascading events.
 */
export async function removeVariant(id: string): Promise<void> {
  return dbDeleteVariant(id);
}