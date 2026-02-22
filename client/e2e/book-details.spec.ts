import { test, expect } from '@playwright/test';

// Pride & Prejudice — Gutenberg ID 1342
const BOOK_ID = '1342';
const BOOK = {
  id: BOOK_ID,
  title: 'Pride and Prejudice',
  authors: [{ name: 'Austen, Jane' }],
  source: 'gutenberg',
  coverUrl: `https://www.gutenberg.org/cache/epub/${BOOK_ID}/pg${BOOK_ID}.cover.medium.jpg`,
  formats: {
    text: `https://www.gutenberg.org/files/${BOOK_ID}/${BOOK_ID}-0.txt`,
    html: `https://www.gutenberg.org/files/${BOOK_ID}/${BOOK_ID}-h/${BOOK_ID}-h.htm`,
  },
};

test.describe('Book details page', () => {
  test.beforeEach(async ({ page }) => {
    // Seed localStorage with the book so BookDetailsPage can load it
    await page.goto('/');
    await page.evaluate((book) => {
      localStorage.setItem('current_book', JSON.stringify(book));
    }, BOOK);
    await page.goto(`/book/${BOOK_ID}`);
  });

  test('shows book title and Start Reading button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Pride and Prejudice/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Start Reading/i })).toBeVisible();
  });

  test('Add to List dropdown shows all 4 default collections', async ({ page }) => {
    await page.getByRole('button', { name: /Add to List/i }).click();

    await expect(page.getByRole('button', { name: 'Reading', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Want to Read', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finished', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Favourites', exact: true })).toBeVisible();
  });

  test('clicking Favourites adds book to that collection', async ({ page }) => {
    await page.getByRole('button', { name: /Add to List/i }).click();
    await page.getByText('Favourites').click();

    // Button label should now reflect the book is in 1 list
    await expect(page.getByRole('button', { name: /In 1 list/i })).toBeVisible();
  });
});
