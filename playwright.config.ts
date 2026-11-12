import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['browser.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.APP_URL ?? 'http://127.0.0.1:3000',
    viewport: { width: 1440, height: 1000 },
    headless: true,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
})
