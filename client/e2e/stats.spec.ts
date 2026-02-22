import { test, expect } from '@playwright/test';

test.describe('Stats modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens stats modal with Reading Stats heading', async ({ page }) => {
    await page.getByRole('button', { name: /My Stats/i }).click();
    await expect(page.getByRole('heading', { name: 'Reading Stats' })).toBeVisible();
  });

  test('shows 4 stat cards', async ({ page }) => {
    await page.getByRole('button', { name: /My Stats/i }).click();

    const dialog = page.getByRole('dialog', { name: 'Reading statistics' });
    await expect(dialog).toBeVisible();

    // 4 stat cards are always rendered
    await expect(dialog.getByText('Total Reading Time')).toBeVisible();
    await expect(dialog.getByText('Pages This Week')).toBeVisible();
    await expect(dialog.getByText('Current Streak')).toBeVisible();
    await expect(dialog.getByText('Total Pages Read')).toBeVisible();
  });

  test('close button dismisses the modal', async ({ page }) => {
    await page.getByRole('button', { name: /My Stats/i }).click();
    await expect(page.getByRole('dialog', { name: 'Reading statistics' })).toBeVisible();

    await page.getByRole('button', { name: 'Close stats' }).click();
    await expect(page.getByRole('dialog', { name: 'Reading statistics' })).not.toBeVisible();
  });
});
