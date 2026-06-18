// E2E — Full product creation → variant → stock in → sale flow
import { test, expect } from '@playwright/test';

test.describe('Product Flow', () => {
  test('should create a product and verify it appears', async ({ page }) => {
    await page.goto('/products');
    await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
    await page.reload();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('page-title')).toBeVisible();

    await page.getByRole('button', { name: 'Add Product' }).click();
    await page.fill('input[placeholder="Product name"]', 'Premium Hoodie');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Premium Hoodie')).toBeVisible();
  });

  test('should create a variant for a product', async ({ page }) => {
    await page.goto('/products');
    await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
    await page.reload();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('page-title')).toBeVisible();

    await page.getByRole('button', { name: 'Add Product' }).click();
    await page.fill('input[placeholder="Product name"]', 'Classic Tee');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.click('text=Classic Tee');
    await page.getByRole('button', { name: 'Add Variant' }).click();
    await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'M');
    await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Black');
    await page.fill('input[placeholder="SKU"]', 'CTE-BLK-M');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('M / Black')).toBeVisible();
  });

  test('should record a stock in and verify stock updates', async ({ page }) => {
    await page.goto('/products');
    await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
    await page.reload();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Seed product + variant
    await page.getByRole('button', { name: 'Add Product' }).click();
    await page.fill('input[placeholder="Product name"]', 'Stock Test Tee');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.click('text=Stock Test Tee');
    await page.getByRole('button', { name: 'Add Variant' }).click();
    await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'S');
    await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Green');
    await page.fill('input[placeholder="SKU"]', 'STT-GRN-S');
    await page.getByRole('button', { name: 'Save' }).click();

    // Stock in (stock-in page includes SKU in option label)
    await page.goto('/stock-in');
    await expect(page.getByTestId('page-title')).toBeVisible();
    await page.getByRole('combobox').first().selectOption({ label: 'Stock Test Tee' });
    await page.getByRole('combobox').nth(1).selectOption({ label: 'S / Green (STT-GRN-S)' });
    await page.fill('input[type="number"]', '50');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Stocked in 50 units')).toBeVisible({ timeout: 5000 });
  });

  test('should complete full flow with stock verification', async ({ page }) => {
    await page.goto('/products');
    await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
    await page.reload();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Create product + variant
    await page.getByRole('button', { name: 'Add Product' }).click();
    await page.fill('input[placeholder="Product name"]', 'Flow Hoodie');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Flow Hoodie')).toBeVisible();
    await page.click('text=Flow Hoodie');
    await page.getByRole('button', { name: 'Add Variant' }).click();
    await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'L');
    await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Navy');
    await page.fill('input[placeholder="SKU"]', 'FFH-NVY-L');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('L / Navy')).toBeVisible();

    // Stock in 50 (stock-in page includes SKU in option label)
    await page.goto('/stock-in');
    await expect(page.getByTestId('page-title')).toBeVisible();
    await page.getByRole('combobox').first().selectOption({ label: 'Flow Hoodie' });
    await page.getByRole('combobox').nth(1).selectOption({ label: 'L / Navy (FFH-NVY-L)' });
    await page.fill('input[type="number"]', '50');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Stocked in 50 units')).toBeVisible({ timeout: 5000 });

    // Sale of 5 (sales page includes SKU in option label)
    await page.goto('/sales');
    await expect(page.getByTestId('page-title')).toBeVisible();
    await page.getByRole('combobox').first().selectOption({ label: 'Flow Hoodie' });
    await page.getByRole('combobox').nth(1).selectOption({ label: 'L / Navy (FFH-NVY-L)' });
    await page.fill('input[type="number"]', '5');
    await page.keyboard.press('Tab');
    // Tab moves to Note input; blur on quantity advances step to confirm
    await expect(page.getByRole('button', { name: /Confirm Sale/ })).toBeVisible();
    await page.getByRole('button', { name: /Confirm Sale/ }).click();
    await expect(page.getByText('Sale of 5 units recorded')).toBeVisible({ timeout: 5000 });

    // Verify products page
    await page.goto('/products');
    await page.click('text=Flow Hoodie');
    await expect(page.getByText('L / Navy')).toBeVisible();

    // Verify history (history page does NOT include SKU in option label)
    await page.goto('/history');
    await expect(page.getByTestId('page-title')).toBeVisible();
    await page.getByRole('combobox').first().selectOption({ label: 'Flow Hoodie' });
    await page.getByRole('combobox').nth(1).selectOption({ label: 'L / Navy' });
    await expect.poll(() =>
      page.getByText(/events/).first().innerText()
    ).toContain('2');
  });
});