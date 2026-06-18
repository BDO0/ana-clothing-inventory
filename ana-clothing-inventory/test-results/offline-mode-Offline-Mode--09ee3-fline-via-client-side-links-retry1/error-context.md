# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: offline-mode.spec.ts >> Offline Mode >> should navigate between routes while offline via client-side links
- Location: tests\e2e\offline-mode.spec.ts:24:3

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
  - heading "Dashboard" [level=1]
  - text: Offline A
- main:
  - heading "Good morning." [level=2]
  - paragraph: Inventory healthy· Offline
  - text: 0 Products 0 Stock units 0 Pending sync Recent Activity (0) No events 7-Day Sales
  - application: Jun 12 Jun 13 Jun 14 Jun 15 Jun 16 Jun 17 Jun 18 0 1 2 3 4
```

# Test source

```ts
  1  | // E2E — Offline mode behavior test
  2  | import { test, expect } from '@playwright/test';
  3  | 
  4  | test.describe('Offline Mode', () => {
  5  |   test('should navigate client-side while offline (no reload needed)', async ({ page, context }) => {
  6  |     await page.goto('/');
  7  |     await expect(page.getByTestId('page-title')).toBeVisible();
  8  | 
  9  |     await context.setOffline(true);
  10 | 
  11 |     await page.getByRole('link', { name: 'Products' }).click();
  12 |     await expect(page.getByTestId('page-title')).toBeVisible();
  13 | 
  14 |     await page.getByRole('link', { name: 'History' }).click();
  15 |     await expect(page.getByTestId('page-title')).toBeVisible();
  16 |   });
  17 | 
  18 |   test('should show the page content when offline', async ({ page, context }) => {
  19 |     await page.goto('/');
  20 |     await context.setOffline(true);
  21 |     await expect(page.locator('h1, h2').first()).toBeVisible();
  22 |   });
  23 | 
  24 |   test('should navigate between routes while offline via client-side links', async ({ page, context }) => {
  25 |     await page.goto('/');
  26 |     await page.goto('/history');
  27 | 
  28 |     await context.setOffline(true);
  29 | 
  30 |     await page.getByRole('link', { name: 'Dashboard' }).click();
> 31 |     await expect(page.getByTestId('page-title')).toBeVisible();
     |                                                  ^ Error: expect(locator).toBeVisible() failed
  32 | 
  33 |     await page.getByRole('link', { name: 'Products' }).click();
  34 |     await expect(page.getByTestId('page-title')).toBeVisible();
  35 |   });
  36 | 
  37 |   test('should see seeded data while offline via client-side navigation', async ({ page, context }) => {
  38 |     // Reset DB
  39 |     await page.goto('/products');
  40 |     await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
  41 |     await page.reload();
  42 |     await page.waitForTimeout(200);
  43 |     await expect(page.getByTestId('page-title')).toBeVisible();
  44 | 
  45 |     // Seed product + variant
  46 |     await page.getByRole('button', { name: 'Add Product' }).click();
  47 |     await page.fill('input[placeholder="Product name"]', 'Offline Hoodie');
  48 |     await page.getByRole('button', { name: 'Create' }).click();
  49 |     await expect(page.getByText('Offline Hoodie')).toBeVisible();
  50 | 
  51 |     await page.click('text=Offline Hoodie');
  52 |     await page.getByRole('button', { name: 'Add Variant' }).click();
  53 |     await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'XL');
  54 |     await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Gray');
  55 |     await page.fill('input[placeholder="SKU"]', 'OFF-GRY-XL');
  56 |     await page.getByRole('button', { name: 'Save' }).click();
  57 | 
  58 |     // Go offline
  59 |     await context.setOffline(true);
  60 | 
  61 |     // Navigate via client-side link
  62 |     await page.getByRole('link', { name: 'Products' }).click();
  63 |     await expect(page.getByText('Offline Hoodie')).toBeVisible({ timeout: 5000 });
  64 | 
  65 |     // IndexedDB data persisted offline — product name visible proves it
  66 |     await expect(page.getByText(/Offline Hoodie/)).toBeVisible();
  67 | 
  68 |     // Go back online
  69 |     await context.setOffline(false);
  70 |     await page.goto('/');
  71 |     await expect(page.getByTestId('page-title')).toBeVisible();
  72 |   });
  73 | });
```