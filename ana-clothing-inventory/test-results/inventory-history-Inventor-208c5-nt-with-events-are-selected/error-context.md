# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: inventory-history.spec.ts >> Inventory History >> should display event history after product/variant with events are selected
- Location: tests\e2e\inventory-history.spec.ts:22:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('page-title')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('page-title')

```

```yaml
- complementary:
  - text: A ANA Inventory
  - navigation:
    - link "Dashboard":
      - /url: /
    - link "Products":
      - /url: /products
    - link "Stock In":
      - /url: /stock-in
    - link "Sales":
      - /url: /sales
    - link "Analytics":
      - /url: /analytics
    - link "Reports":
      - /url: /reports
    - link "History":
      - /url: /history
  - text: v0.1.0
- banner:
  - heading "Products" [level=1]
  - text: Local only A
- main:
  - heading "Products" [level=2]
  - paragraph: 0 products
  - button "Add Product"
  - text: No products yet. Add your first product.
```

# Test source

```ts
  1   | // E2E — Inventory History event log test with seeded data verification
  2   | import { test, expect } from '@playwright/test';
  3   | 
  4   | test.describe('Inventory History', () => {
  5   |   test('should load history page', async ({ page }) => {
  6   |     await page.goto('/history');
  7   |     await expect(page.getByTestId('page-title')).toBeVisible();
  8   |   });
  9   | 
  10  |   test('should show event filters (product, variant, type)', async ({ page }) => {
  11  |     await page.goto('/history');
  12  |     const selects = page.getByRole('combobox');
  13  |     const count = await selects.count();
  14  |     expect(count).toBeGreaterThanOrEqual(3);
  15  |   });
  16  | 
  17  |   test('should show a message when no variant selected', async ({ page }) => {
  18  |     await page.goto('/history');
  19  |     await expect(page.getByText('Select a product and variant')).toBeVisible();
  20  |   });
  21  | 
  22  |   test('should display event history after product/variant with events are selected', async ({ page }) => {
  23  |     await page.goto('/products');
  24  |     await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
  25  |     await page.reload();
  26  |     await page.waitForTimeout(200);
> 27  |     await expect(page.getByTestId('page-title')).toBeVisible();
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  28  | 
  29  |     await page.getByRole('button', { name: 'Add Product' }).click();
  30  |     await page.fill('input[placeholder="Product name"]', 'History Test');
  31  |     await page.getByRole('button', { name: 'Create' }).click();
  32  |     await page.click('text=History Test');
  33  |     await page.getByRole('button', { name: 'Add Variant' }).click();
  34  |     await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'S');
  35  |     await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Blue');
  36  |     await page.fill('input[placeholder="SKU"]', 'HST-BLU-S');
  37  |     await page.getByRole('button', { name: 'Save' }).click();
  38  | 
  39  |     // Stock in
  40  |     await page.goto('/stock-in');
  41  |     await expect(page.getByTestId('page-title')).toBeVisible();
  42  |     await page.getByRole('combobox').first().selectOption({ label: 'History Test' });
  43  |     await page.waitForTimeout(400); // wait for async getVariantsByProduct to complete
  44  |     await page.getByRole('combobox').nth(1).selectOption({ label: 'S / Blue (HST-BLU-S)' });
  45  |     await page.fill('input[type="number"]', '20');
  46  |     await page.keyboard.press('Tab');
  47  |     await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
  48  |     await page.getByRole('button', { name: 'Confirm' }).click();
  49  |     await expect(page.getByText('Stocked in 20 units')).toBeVisible({ timeout: 5000 });
  50  | 
  51  |     // Sale
  52  |     await page.goto('/sales');
  53  |     await expect(page.getByTestId('page-title')).toBeVisible();
  54  |     await page.getByRole('combobox').first().selectOption({ label: 'History Test' });
  55  |     await page.waitForTimeout(400);
  56  |     await page.getByRole('combobox').nth(1).selectOption({ label: 'S / Blue (HST-BLU-S)' });
  57  |     await page.fill('input[type="number"]', '3');
  58  |     await page.keyboard.press('Tab');
  59  |     await expect(page.getByRole('button', { name: /Confirm Sale/ })).toBeVisible();
  60  |     await page.getByRole('button', { name: /Confirm Sale/ }).click();
  61  |     await expect(page.getByText('Sale of 3 units recorded')).toBeVisible({ timeout: 5000 });
  62  | 
  63  |     // Verify history
  64  |     await page.goto('/history');
  65  |     await expect(page.getByTestId('page-title')).toBeVisible();
  66  |     await page.getByRole('combobox').first().selectOption({ label: 'History Test' });
  67  |     await page.waitForTimeout(400);
  68  |     await page.getByRole('combobox').nth(1).selectOption({ label: 'S / Blue' });
  69  |     await expect.poll(() =>
  70  |       page.getByText(/events/).first().innerText()
  71  |     ).toContain('2');
  72  |     await expect(page.getByText('Stock In').first()).toBeVisible();
  73  |     await expect(page.getByText('Sale').first()).toBeVisible();
  74  |   });
  75  | 
  76  |   test('should filter events by type', async ({ page }) => {
  77  |     await page.goto('/products');
  78  |     await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
  79  |     await page.reload();
  80  |     await page.waitForTimeout(200);
  81  |     await expect(page.getByTestId('page-title')).toBeVisible();
  82  | 
  83  |     await page.getByRole('button', { name: 'Add Product' }).click();
  84  |     await page.fill('input[placeholder="Product name"]', 'Filter Test');
  85  |     await page.getByRole('button', { name: 'Create' }).click();
  86  |     await page.click('text=Filter Test');
  87  |     await page.getByRole('button', { name: 'Add Variant' }).click();
  88  |     await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'M');
  89  |     await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Red');
  90  |     await page.fill('input[placeholder="SKU"]', 'FIL-RED-M');
  91  |     await page.getByRole('button', { name: 'Save' }).click();
  92  | 
  93  |     // Stock in 10 — wait for variant options to load before selecting
  94  |     await page.goto('/stock-in');
  95  |     await expect(page.getByTestId('page-title')).toBeVisible();
  96  |     await page.getByRole('combobox').first().selectOption({ label: 'Filter Test' });
  97  |     await expect(page.getByRole('combobox').nth(1).locator('option')).toHaveCount(2);
  98  |     await page.getByRole('combobox').nth(1).selectOption({ label: 'M / Red (FIL-RED-M)' });
  99  |     await page.fill('input[type="number"]', '10');
  100 |     await page.keyboard.press('Tab');
  101 |     await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
  102 |     await page.getByRole('button', { name: 'Confirm' }).click();
  103 |     await expect(page.getByText('Stocked in 10 units')).toBeVisible({ timeout: 5000 });
  104 | 
  105 |     // Go to history, filter STOCK_IN
  106 |     await page.goto('/history');
  107 |     await expect(page.getByTestId('page-title')).toBeVisible();
  108 |     await page.getByRole('combobox').first().selectOption({ label: 'Filter Test' });
  109 |     await page.waitForTimeout(400);
  110 |     await page.getByRole('combobox').nth(1).selectOption({ label: 'M / Red' });
  111 |     await page.getByRole('combobox').nth(2).selectOption('STOCK_IN');
  112 |     await expect(page.getByText('Stock In').first()).toBeVisible({ timeout: 5000 });
  113 |   });
  114 | });
```