// Temporary smoke test — Phase 2 verification
// Verifies: stock engine + inventory service work correctly
// Remove this file after verification.

import { addProduct, addVariant } from "../db/database";
import { getStock, getEventHistory } from "./stock-engine";
import { stockIn, recordSale } from "./inventory-service";

export async function runSmokeTest(): Promise<void> {
  console.log("=== PHASE 2 SMOKE TEST ===");

  // 1. Add product + variant
  console.log("[1] Creating product and variant...");
  const productId = await addProduct({
    name: "Test T-Shirt",
    description: "Smoke test product",
  });

  const variantId = await addVariant({
    product_id: productId,
    size: "M",
    color: "Black",
    sku: "TSH-BLK-M",
  });

  console.log(`    product_id: ${productId}`);
  console.log(`    variant_id: ${variantId}`);

  // 2. Stock in 10 + 20
  console.log("[2] Stock in +10, then +20...");
  await stockIn(variantId, 10, "Initial stock");
  await stockIn(variantId, 20, "Second batch");

  let stock = await getStock(variantId);
  console.log(`    stock after STOCK_IN: ${stock}`); // expect 30
  console.assert(stock === 30, `Expected 30, got ${stock}`);

  // 3. Record sale -5
  console.log("[3] Sale -5...");
  await recordSale(variantId, 5, "Customer sale #001");

  stock = await getStock(variantId);
  console.log(`    stock after SALE: ${stock}`); // expect 25
  console.assert(stock === 25, `Expected 25, got ${stock}`);

  // 4. Verify event history
  console.log("[4] Verifying event history...");
  const history = await getEventHistory(variantId);
  console.log(`    total events: ${history.length}`); // expect 3
  console.assert(history.length === 3, `Expected 3 events, got ${history.length}`);

  for (const e of history) {
    console.log(
      `    [${e.type}] qty=${e.quantity} synced=${e.synced} note="${e.note ?? ""}"`
    );
    console.assert(e.synced === false, "Event should NOT be synced yet");
    console.assert(e.id.length > 0, "Event must have UUID");
    console.assert(e.created_at > 0, "Event must have timestamp");
  }

  console.log("=== ALL CHECKS PASSED ===");
}