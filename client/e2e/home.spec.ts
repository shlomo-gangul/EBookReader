import { test, expect } from '@playwright/test';

const MOCK_GUTENDEX_RESPONSE = {
  count: 2,
  results: [
    {
      id: 1342,
      title: 'Pride and Prejudice',
      authors: [{ name: 'Austen, Jane' }],
      subjects: ['Love stories'],
      languages: ['en'],
      formats: {
        'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/1342/1342-0.txt',
        'text/html': 'https://www.gutenberg.org/files/1342/1342-h/1342-h.htm',
      },
    },
    {
      id: 11,
      title: "Alice's Adventures in Wonderland",
      authors: [{ name: 'Carroll, Lewis' }],
      subjects: ['Fantasy fiction'],
      languages: ['en'],
      formats: {
        'text/plain; charset=utf-8': 'https://www.gutenberg.org/files/11/11-0.txt',
      },
    },
  ],
};

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows BookReader heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'BookReader' })).toBeVisible();
  });

  test('shows search input', async ({ page }) => {
    await expect(page.getByPlaceholder('Search for books...')).toBeVisible();
  });

  test('shows My Stats button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /My Stats/i })).toBeVisible();
  });

  test('shows Upload Book button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Upload Book/i })).toBeVisible();
  });

  test('shows at least one popular genre section', async ({ page }) => {
    // Mock gutendex API to avoid rate limiting in tests
    await page.route('https://gutendex.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GUTENDEX_RESPONSE),
      });
    });

    await page.reload();

    await expect(
      page.getByRole('heading', { name: /Popular in/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
