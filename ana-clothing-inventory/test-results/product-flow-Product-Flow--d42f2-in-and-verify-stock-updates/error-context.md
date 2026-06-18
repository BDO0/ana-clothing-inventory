# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: product-flow.spec.ts >> Product Flow >> should record a stock in and verify stock updates
- Location: tests\e2e\product-flow.spec.ts:37:3

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
  1   | // E2E — Full product creation → variant → stock in → sale flow
  2   | import { test, expect } from '@playwright/test';
  3   | 
  4   | test.describe('Product Flow', () => {
  5   |   test('should create a product and verify it appears', async ({ page }) => {
  6   |     await page.goto('/products');
  7   |     await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
  8   |     await page.reload();
  9   |     await page.waitForTimeout(200);
  10  |     await expect(page.getByTestId('page-title')).toBeVisible();
  11  | 
  12  |     await page.getByRole('button', { name: 'Add Product' }).click();
  13  |     await page.fill('input[placeholder="Product name"]', 'Premium Hoodie');
  14  |     await page.getByRole('button', { name: 'Create' }).click();
  15  |     await expect(page.getByText('Premium Hoodie')).toBeVisible();
  16  |   });
  17  | 
  18  |   test('should create a variant for a product', async ({ page }) => {
  19  |     await page.goto('/products');
  20  |     await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
  21  |     await page.reload();
  22  |     await page.waitForTimeout(200);
  23  |     await expect(page.getByTestId('page-title')).toBeVisible();
  24  | 
  25  |     await page.getByRole('button', { name: 'Add Product' }).click();
  26  |     await page.fill('input[placeholder="Product name"]', 'Classic Tee');
  27  |     await page.getByRole('button', { name: 'Create' }).click();
  28  |     await page.click('text=Classic Tee');
  29  |     await page.getByRole('button', { name: 'Add Variant' }).click();
  30  |     await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'M');
  31  |     await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Black');
  32  |     await page.fill('input[placeholder="SKU"]', 'CTE-BLK-M');
  33  |     await page.getByRole('button', { name: 'Save' }).click();
  34  |     await expect(page.getByText('M / Black')).toBeVisible();
  35  |   });
  36  | 
  37  |   test('should record a stock in and verify stock updates', async ({ page }) => {
  38  |     await page.goto('/products');
  39  |     await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
  40  |     await page.reload();
  41  |     await page.waitForTimeout(200);
> 42  |     await expect(page.getByTestId('page-title')).toBeVisible();
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  43  | 
  44  |     // Seed product + variant
  45  |     await page.getByRole('button', { name: 'Add Product' }).click();
  46  |     await page.fill('input[placeholder="Product name"]', 'Stock Test Tee');
  47  |     await page.getByRole('button', { name: 'Create' }).click();
  48  |     await page.click('text=Stock Test Tee');
  49  |     await page.getByRole('button', { name: 'Add Variant' }).click();
  50  |     await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'S');
  51  |     await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Green');
  52  |     await page.fill('input[placeholder="SKU"]', 'STT-GRN-S');
  53  |     await page.getByRole('button', { name: 'Save' }).click();
  54  | 
  55  |     // Stock in (stock-in page includes SKU in option label)
  56  |     await page.goto('/stock-in');
  57  |     await expect(page.getByTestId('page-title')).toBeVisible();
  58  |     await page.getByRole('combobox').first().selectOption({ label: 'Stock Test Tee' });
  59  |     await page.getByRole('combobox').nth(1).selectOption({ label: 'S / Green (STT-GRN-S)' });
  60  |     await page.fill('input[type="number"]', '50');
  61  |     await page.keyboard.press('Tab');
  62  |     await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
  63  |     await page.getByRole('button', { name: 'Confirm' }).click();
  64  |     await expect(page.getByText('Stocked in 50 units')).toBeVisible({ timeout: 5000 });
  65  |   });
  66  | 
  67  |   test('should complete full flow with stock verification', async ({ page }) => {
  68  |     await page.goto('/products');
  69  |     await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
  70  |     await page.reload();
  71  |     await page.waitForTimeout(200);
  72  |     await expect(page.getByTestId('page-title')).toBeVisible();
  73  | 
  74  |     // Create product + variant
  75  |     await page.getByRole('button', { name: 'Add Product' }).click();
  76  |     await page.fill('input[placeholder="Product name"]', 'Flow Hoodie');
  77  |     await page.getByRole('button', { name: 'Create' }).click();
  78  |     await expect(page.getByText('Flow Hoodie')).toBeVisible();
  79  |     await page.click('text=Flow Hoodie');
  80  |     await page.getByRole('button', { name: 'Add Variant' }).click();
  81  |     await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'L');
  82  |     await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Navy');
  83  |     await page.fill('input[placeholder="SKU"]', 'FFH-NVY-L');
  84  |     await page.getByRole('button', { name: 'Save' }).click();
  85  |     await expect(page.getByText('L / Navy')).toBeVisible();
  86  | 
  87  |     // Stock in 50 (stock-in page includes SKU in option label)
  88  |     await page.goto('/stock-in');
  89  |     await expect(page.getByTestId('page-title')).toBeVisible();
  90  |     await page.getByRole('combobox').first().selectOption({ label: 'Flow Hoodie' });
  91  |     await page.getByRole('combobox').nth(1).selectOption({ label: 'L / Navy (FFH-NVY-L)' });
  92  |     await page.fill('input[type="number"]', '50');
  93  |     await page.keyboard.press('Tab');
  94  |     await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
  95  |     await page.getByRole('button', { name: 'Confirm' }).click();
  96  |     await expect(page.getByText('Stocked in 50 units')).toBeVisible({ timeout: 5000 });
  97  | 
  98  |     // Sale of 5 (sales page includes SKU in option label)
  99  |     await page.goto('/sales');
  100 |     await expect(page.getByTestId('page-title')).toBeVisible();
  101 |     await page.getByRole('combobox').first().selectOption({ label: 'Flow Hoodie' });
  102 |     await page.getByRole('combobox').nth(1).selectOption({ label: 'L / Navy (FFH-NVY-L)' });
  103 |     await page.fill('input[type="number"]', '5');
  104 |     await page.keyboard.press('Tab');
  105 |     // Tab moves to Note input; blur on quantity advances step to confirm
  106 |     await expect(page.getByRole('button', { name: /Confirm Sale/ })).toBeVisible();
  107 |     await page.getByRole('button', { name: /Confirm Sale/ }).click();
  108 |     await expect(page.getByText('Sale of 5 units recorded')).toBeVisible({ timeout: 5000 });
  109 | 
  110 |     // Verify products page
  111 |     await page.goto('/products');
  112 |     await page.click('text=Flow Hoodie');
  113 |     await expect(page.getByText('L / Navy')).toBeVisible();
  114 | 
  115 |     // Verify history (history page does NOT include SKU in option label)
  116 |     await page.goto('/history');
  117 |     await expect(page.getByTestId('page-title')).toBeVisible();
  118 |     await page.getByRole('combobox').first().selectOption({ label: 'Flow Hoodie' });
  119 |     await page.getByRole('combobox').nth(1).selectOption({ label: 'L / Navy' });
  120 |     await expect.poll(() =>
  121 |       page.getByText(/events/).first().innerText()
  122 |     ).toContain('2');
  123 |   });
  124 | });
```