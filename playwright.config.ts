import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'cross-env TEST_MODE=true npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
