// Event Validation Layer
// Every event must pass validation before being stored.
// A single bad event = corrupted stock forever.
//
// Length limits here MUST match the maxLength attributes on form inputs.
// This layer is the last defence — it runs even if the UI is bypassed
// (e.g. calling appendEvent() directly from the browser console).

import type { InventoryEvent, EventType } from "./models";

const VALID_EVENT_TYPES: Set<string> = new Set<EventType>([
  "STOCK_IN",
  "SALE",
  "RETURN",
  "ADJUSTMENT",
]);

// String length limits — keep in sync with UI maxLength attributes
const MAX_VARIANT_ID_LENGTH = 36;   // UUID length
const MAX_REFERENCE_LENGTH  = 100;
const MAX_NOTE_LENGTH       = 500;

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
  // 1. variant_id must be a non-empty string within UUID length
  if (!event.variant_id || typeof event.variant_id !== "string") {
    return { valid: false, reason: "variant_id is required and must be a string" };
  }
  if (event.variant_id.length > MAX_VARIANT_ID_LENGTH) {
    return { valid: false, reason: `variant_id must be at most ${MAX_VARIANT_ID_LENGTH} characters` };
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

  // 4. quantity must not be unreasonably large (prevents integer overflow exploits)
  if (event.quantity > 1_000_000) {
    return { valid: false, reason: "quantity must not exceed 1,000,000" };
  }

  // 5. reference, if provided, must be a string within the length limit
  if (event.reference !== undefined) {
    if (typeof event.reference !== "string") {
      return { valid: false, reason: "reference must be a string if provided" };
    }
    if (event.reference.length > MAX_REFERENCE_LENGTH) {
      return { valid: false, reason: `reference must be at most ${MAX_REFERENCE_LENGTH} characters` };
    }
  }

  // 6. note, if provided, must be a string within the length limit
  if (event.note !== undefined) {
    if (typeof event.note !== "string") {
      return { valid: false, reason: "note must be a string if provided" };
    }
    if (event.note.length > MAX_NOTE_LENGTH) {
      return { valid: false, reason: `note must be at most ${MAX_NOTE_LENGTH} characters` };
    }
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