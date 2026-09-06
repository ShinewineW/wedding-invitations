import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  workers: 2,
  reporter: [
    ['list'],
    ['json', { outputFile: 'release/validation/test-results.json' }],
  ],
  use: {
    baseURL: `${(process.env.TEST_URL || 'http://127.0.0.1:4175/wedding2').replace(/\/$/, '')}/`,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
