import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  reporter: 'list',
  use: { ...devices['Pixel 7'], baseURL: 'http://localhost:3100' },
  webServer: {
    // Production static export so the service worker and offline mode are testable.
    command: 'npm run build && npx serve out -l 3100 --no-clipboard',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
