// Unit tests for validateEvent() — pure function, no dependencies
import { describe, it, expect } from "vitest";
import { validateEvent } from "../../src/db/validators";

describe("validateEvent", () => {
  it("should accept a valid STOCK_IN event", () => {
    const result = validateEvent({
      variant_id: "variant-001",
      type: "STOCK_IN",
      quantity: 30,
    });
    expect(result.valid).toBe(true);
  });

  it("should accept a valid SALE event with optional reference and note", () => {
    const result = validateEvent({
      variant_id: "variant-002",
      type: "SALE",
      quantity: 5,
      reference: "INV-123",
      note: "Walk-in customer",
    });
    expect(result.valid).toBe(true);
  });

  it("should accept a RETURN event with reference", () => {
    const result = validateEvent({
      variant_id: "variant-003",
      type: "RETURN",
      quantity: 2,
      reference: "RMA-001",
    });
    expect(result.valid).toBe(true);
  });

  it("should accept an ADJUSTMENT event", () => {
    const result = validateEvent({
      variant_id: "variant-004",
      type: "ADJUSTMENT",
      quantity: 3,
      note: "Stock count correction",
    });
    expect(result.valid).toBe(true);
  });

  it("should reject an invalid event type", () => {
    // Cast through unknown to bypass TS type checking
    const result = validateEvent({
      variant_id: "variant-005",
      type: "PURCHASE",
      quantity: 10,
    } as unknown as Parameters<typeof validateEvent>[0]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("type must be one of");
    }
  });

  it("should reject missing variant_id", () => {
    const result = validateEvent({
      type: "STOCK_IN",
      quantity: 10,
    } as unknown as Parameters<typeof validateEvent>[0]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("variant_id");
    }
  });

  it("should reject quantity of 0", () => {
    const result = validateEvent({
      variant_id: "variant-006",
      type: "STOCK_IN",
      quantity: 0,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("positive integer");
    }
  });

  it("should reject negative quantity", () => {
    const result = validateEvent({
      variant_id: "variant-007",
      type: "STOCK_IN",
      quantity: -5,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("positive integer");
    }
  });

  it("should reject non-integer quantity", () => {
    const result = validateEvent({
      variant_id: "variant-008",
      type: "STOCK_IN",
      quantity: 3.5,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("positive integer");
    }
  });

  it("should reject reference that is not a string", () => {
    const result = validateEvent({
      variant_id: "variant-009",
      type: "SALE",
      quantity: 5,
      reference: 12345 as unknown as string,
    });
    // Validate still catches it — the cast only bypasses TS, runtime checks remain
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("reference must be a string");
    }
  });

  it("should reject note that is not a string", () => {
    const result = validateEvent({
      variant_id: "variant-010",
      type: "SALE",
      quantity: 5,
      note: 999 as unknown as string,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("note must be a string");
    }
  });
});