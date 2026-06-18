// Event Validation Layer
// Every event must pass validation before being stored.
// A single bad event = corrupted stock forever.

import type { InventoryEvent, EventType } from "./models";

const VALID_EVENT_TYPES: Set<string> = new Set<EventType>([
  "STOCK_IN",
  "SALE",
  "RETURN",
  "ADJUSTMENT",
]);

export interface ValidationOk {
  valid: true;
}
export interface ValidationErr {
  valid: false;
  reason: string;
}
export type ValidationResult = ValidationOk | ValidationErr;

/**
 * Validate a partial event before storing.
 * Must pass ALL checks before appendEvent() is called.
 */
export function validateEvent(
  event: Partial<InventoryEvent>
): ValidationResult {
  // 1. variant_id must be a non-empty string
  if (!event.variant_id || typeof event.variant_id !== "string") {
    return { valid: false, reason: "variant_id is required and must be a string" };
  }

  // 2. type must be one of the 4 valid event types
  if (!event.type || !VALID_EVENT_TYPES.has(event.type)) {
    return {
      valid: false,
      reason: `type must be one of: ${[...VALID_EVENT_TYPES].join(", ")}`,
    };
  }

  // 3. quantity must be a positive integer
  if (
    typeof event.quantity !== "number" ||
    !Number.isInteger(event.quantity) ||
    event.quantity <= 0
  ) {
    return {
      valid: false,
      reason: "quantity must be a positive integer",
    };
  }

  // 4. reference, if provided, must be a string
  if (event.reference !== undefined && typeof event.reference !== "string") {
    return { valid: false, reason: "reference must be a string if provided" };
  }

  // 5. note, if provided, must be a string
  if (event.note !== undefined && typeof event.note !== "string") {
    return { valid: false, reason: "note must be a string if provided" };
  }

  return { valid: true };
}

/**
 * Assert that an event is valid. Throws on failure.
 * Used as the final gate in appendEvent().
 */
export function assertValidEvent(
  event: Partial<InventoryEvent>
): asserts event is Omit<InventoryEvent, "id" | "created_at" | "synced"> {
  const result = validateEvent(event);
  if (!result.valid) {
    throw new Error(`Event validation failed: ${result.reason}`);
  }
}