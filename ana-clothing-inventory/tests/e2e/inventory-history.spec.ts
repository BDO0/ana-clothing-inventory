// E2E — Inventory History event log test with seeded data verification
import { test, expect } from '@playwright/test';

test.describe('Inventory History', () => {
  test('should load history page', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByTestId('page-title')).toBeVisible();
  });

  test('should show event filters (product, variant, type)', async ({ page }) => {
    await page.goto('/history');
    const selects = page.getByRole('combobox');
    const count = await selects.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should show a message when no variant selected', async ({ page }) => {
    await page.goto('/history');
    await expect(page.getByText('Select a product and variant')).toBeVisible();
  });

  test('should display event history after product/variant with events are selected', async ({ page }) => {
    await page.goto('/products');
    await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
    await page.reload();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('page-title')).toBeVisible();

    await page.getByRole('button', { name: 'Add Product' }).click();
    await page.fill('input[placeholder="Product name"]', 'History Test');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.click('text=History Test');
    await page.getByRole('button', { name: 'Add Variant' }).click();
    await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'S');
    await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Blue');
    await page.fill('input[placeholder="SKU"]', 'HST-BLU-S');
    await page.getByRole('button', { name: 'Save' }).click();

    // Stock in
    await page.goto('/stock-in');
    await expect(page.getByTestId('page-title')).toBeVisible();
    await page.getByRole('combobox').first().selectOption({ label: 'History Test' });
    await page.waitForTimeout(400); // wait for async getVariantsByProduct to complete
    await page.getByRole('combobox').nth(1).selectOption({ label: 'S / Blue (HST-BLU-S)' });
    await page.fill('input[type="number"]', '20');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Stocked in 20 units')).toBeVisible({ timeout: 5000 });

    // Sale
    await page.goto('/sales');
    await expect(page.getByTestId('page-title')).toBeVisible();
    await page.getByRole('combobox').first().selectOption({ label: 'History Test' });
    await page.waitForTimeout(400);
    await page.getByRole('combobox').nth(1).selectOption({ label: 'S / Blue (HST-BLU-S)' });
    await page.fill('input[type="number"]', '3');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /Confirm Sale/ })).toBeVisible();
    await page.getByRole('button', { name: /Confirm Sale/ }).click();
    await expect(page.getByText('Sale of 3 units recorded')).toBeVisible({ timeout: 5000 });

    // Verify history
    await page.goto('/history');
    await expect(page.getByTestId('page-title')).toBeVisible();
    await page.getByRole('combobox').first().selectOption({ label: 'History Test' });
    await page.waitForTimeout(400);
    await page.getByRole('combobox').nth(1).selectOption({ label: 'S / Blue' });
    await expect.poll(() =>
      page.getByText(/events/).first().innerText()
    ).toContain('2');
    await expect(page.getByText('Stock In').first()).toBeVisible();
    await expect(page.getByText('Sale').first()).toBeVisible();
  });

  test('should filter events by type', async ({ page }) => {
    await page.goto('/products');
    await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
    await page.reload();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('page-title')).toBeVisible();

    await page.getByRole('button', { name: 'Add Product' }).click();
    await page.fill('input[placeholder="Product name"]', 'Filter Test');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.click('text=Filter Test');
    await page.getByRole('button', { name: 'Add Variant' }).click();
    await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'M');
    await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Red');
    await page.fill('input[placeholder="SKU"]', 'FIL-RED-M');
    await page.getByRole('button', { name: 'Save' }).click();

    // Stock in 10 — wait for variant options to load before selecting
    await page.goto('/stock-in');
    await expect(page.getByTestId('page-title')).toBeVisible();
    await page.getByRole('combobox').first().selectOption({ label: 'Filter Test' });
    await expect(page.getByRole('combobox').nth(1).locator('option')).toHaveCount(2);
    await page.getByRole('combobox').nth(1).selectOption({ label: 'M / Red (FIL-RED-M)' });
    await page.fill('input[type="number"]', '10');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Stocked in 10 units')).toBeVisible({ timeout: 5000 });

    // Go to history, filter STOCK_IN
    await page.goto('/history');
    await expect(page.getByTestId('page-title')).toBeVisible();
    await page.getByRole('combobox').first().selectOption({ label: 'Filter Test' });
    await page.waitForTimeout(400);
    await page.getByRole('combobox').nth(1).selectOption({ label: 'M / Red' });
    await page.getByRole('combobox').nth(2).selectOption('STOCK_IN');
    await expect(page.getByText('Stock In').first()).toBeVisible({ timeout: 5000 });
  });
});