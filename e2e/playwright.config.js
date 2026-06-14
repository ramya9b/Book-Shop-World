// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/* Targets the LIVE site by default. Override with SITE_URL to test a preview/local. */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 12000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.SITE_URL || 'https://varalaxmibalajienterprises.vercel.app',
    navigationTimeout: 45000,
    actionTimeout: 15000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: { args: ['--disable-gpu'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
