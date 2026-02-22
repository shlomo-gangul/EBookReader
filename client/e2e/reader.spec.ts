import { test, expect } from '@playwright/test';

// Run reader tests serially to avoid parallel network load hitting Gutenberg
test.describe.configure({ mode: 'serial' });

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

test.describe('Reader', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((book) => {
      localStorage.setItem('current_book', JSON.stringify(book));
    }, BOOK);
    await page.goto(`/book/${BOOK_ID}`);
    await expect(page.getByRole('button', { name: /Start Reading/i })).toBeVisible();
    await page.getByRole('button', { name: /Start Reading/i }).click();
    await expect(page).toHaveURL(/\/read\//);

    // Wait for book content to load (toolbar becomes visible when reader is ready)
    await expect(page.getByRole('toolbar', { name: 'Reader controls' })).toBeVisible({
      timeout: 60_000,
    });
  });

  test('reader toolbar is visible', async ({ page }) => {
    await expect(page.getByRole('toolbar', { name: 'Reader controls' })).toBeVisible();
  });

  test('next page button advances the page', async ({ page }) => {
    // Wait for page counter to confirm reader is ready
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible({ timeout: 10_000 });

    // Navigate forward with keyboard (reliable across viewport sizes)
    await page.keyboard.press('ArrowRight');

    // Counter should have advanced past page 1
    await expect(page.getByText(/Page [2-9]\d* of \d+/)).toBeVisible({ timeout: 5_000 });
  });

  test('previous page navigation works after going forward', async ({ page }) => {
    // Wait for reader to show page 1
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible({ timeout: 10_000 });

    // Navigate forward
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(/Page [2-9]\d* of \d+/)).toBeVisible({ timeout: 5_000 });

    // Navigate back
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByText(/Page 1 of \d+/)).toBeVisible({ timeout: 5_000 });
  });

  test('bookmark button toggles aria-label', async ({ page }) => {
    const bookmarkBtn = page.getByRole('button', { name: /Add bookmark/i });
    await expect(bookmarkBtn).toBeVisible();
    await bookmarkBtn.click();
    await expect(
      page.getByRole('button', { name: /Remove bookmark/i })
    ).toBeVisible();
  });

  test('settings button opens modal with Font Size', async ({ page }) => {
    await page.getByRole('button', { name: /Reader settings/i }).click();
    await expect(page.getByText(/Font Size/i)).toBeVisible();
  });

  test('timer button shows dropdown with 5 min option', async ({ page }) => {
    await page.getByRole('button', { name: /Reading timer/i }).click();
    await expect(page.getByRole('button', { name: '5 min', exact: true })).toBeVisible();
  });

  test('close button navigates back to book details', async ({ page }) => {
    await page.getByRole('button', { name: /Close reader/i }).click();
    await expect(page).toHaveURL(/\/book\//);
  });
});
