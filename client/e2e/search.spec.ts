import { test, expect } from '@playwright/test';

// Run serially to avoid hitting gutendex.com rate limits in parallel
test.describe('Search flow', () => {
  test.describe.configure({ mode: 'serial' });

  const MOCK_SEARCH_RESPONSE = {
    books: [
      {
        id: '1342',
        title: 'Pride and Prejudice',
        authors: [{ name: 'Austen, Jane' }],
        source: 'gutenberg',
        coverUrl: 'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
        subjects: ['Love stories'],
        language: 'en',
        formats: {
          text: 'https://www.gutenberg.org/files/1342/1342-0.txt',
        },
      },
    ],
    total: 1,
    page: 1,
    hasMore: false,
  };

  test.beforeEach(async ({ page }) => {
    // Mock backend search to avoid external rate limits
    await page.route('/api/books/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SEARCH_RESPONSE),
      });
    });
    await page.goto('/');
  });

  test('shows book cards after searching', async ({ page }) => {
    await page.getByPlaceholder('Search for books...').fill('pride and prejudice');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(
      page.getByRole('heading', { name: /Search Results/i })
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('[role="button"]').filter({ hasText: /Pride and Prejudice/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('navigates to book details on card click', async ({ page }) => {
    await page.getByPlaceholder('Search for books...').fill('pride and prejudice');
    await page.getByRole('button', { name: 'Search' }).click();

    const firstCard = page.locator('[role="button"]').filter({ hasText: /Pride and Prejudice/i }).first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });

    await firstCard.click();
    await expect(page).toHaveURL(/\/book\//);
  });

  test('clears results when clear button is clicked', async ({ page }) => {
    await page.getByPlaceholder('Search for books...').fill('pride and prejudice');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(
      page.getByRole('heading', { name: /Search Results/i })
    ).toBeVisible({ timeout: 10_000 });

    // The clear (X) button is type="button" inside the search form
    await page.locator('form button[type="button"]').click();

    await expect(
      page.getByRole('heading', { name: /Search Results/i })
    ).not.toBeVisible();
  });
});
