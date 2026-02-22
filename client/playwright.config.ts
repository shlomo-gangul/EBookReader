import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  workers: process.env.CI ? 1 : 2,
  use: { baseURL: 'http://localhost:3000', headless: true },
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      cwd: '.',
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !process.env.CI,
      cwd: '../server',
    },
  ],
});
