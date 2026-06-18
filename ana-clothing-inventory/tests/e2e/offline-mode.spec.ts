// E2E — Offline mode behavior test
import { test, expect } from '@playwright/test';

test.describe('Offline Mode', () => {
  test('should navigate client-side while offline (no reload needed)', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByTestId('page-title')).toBeVisible();

    await context.setOffline(true);

    await page.getByRole('link', { name: 'Products' }).click();
    await expect(page.getByTestId('page-title')).toBeVisible();

    await page.getByRole('link', { name: 'History' }).click();
    await expect(page.getByTestId('page-title')).toBeVisible();
  });

  test('should show the page content when offline', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should navigate between routes while offline via client-side links', async ({ page, context }) => {
    await page.goto('/');
    await page.goto('/history');

    await context.setOffline(true);

    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page.getByTestId('page-title')).toBeVisible();

    await page.getByRole('link', { name: 'Products' }).click();
    await expect(page.getByTestId('page-title')).toBeVisible();
  });

  test('should see seeded data while offline via client-side navigation', async ({ page, context }) => {
    // Reset DB
    await page.goto('/products');
    await page.evaluate(() => indexedDB.deleteDatabase('AnaClothingInventory'));
    await page.reload();
    await page.waitForTimeout(200);
    await expect(page.getByTestId('page-title')).toBeVisible();

    // Seed product + variant
    await page.getByRole('button', { name: 'Add Product' }).click();
    await page.fill('input[placeholder="Product name"]', 'Offline Hoodie');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('Offline Hoodie')).toBeVisible();

    await page.click('text=Offline Hoodie');
    await page.getByRole('button', { name: 'Add Variant' }).click();
    await page.fill('input[placeholder="Size (e.g. M, 32, XL)"]', 'XL');
    await page.fill('input[placeholder="Color (e.g. Black, Navy)"]', 'Gray');
    await page.fill('input[placeholder="SKU"]', 'OFF-GRY-XL');
    await page.getByRole('button', { name: 'Save' }).click();

    // Go offline
    await context.setOffline(true);

    // Navigate via client-side link
    await page.getByRole('link', { name: 'Products' }).click();
    await expect(page.getByText('Offline Hoodie')).toBeVisible({ timeout: 5000 });

    // IndexedDB data persisted offline — product name visible proves it
    await expect(page.getByText(/Offline Hoodie/)).toBeVisible();

    // Go back online
    await context.setOffline(false);
    await page.goto('/');
    await expect(page.getByTestId('page-title')).toBeVisible();
  });
});