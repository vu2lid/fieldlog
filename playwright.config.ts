import { defineConfig, devices } from '@playwright/test';

const basePath = process.env.BASE_PATH ?? '/';
const baseURL = new URL(basePath, 'http://127.0.0.1:4173').toString();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'desktop' }, { name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
