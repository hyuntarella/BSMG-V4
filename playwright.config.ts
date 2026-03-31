import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3004',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx next dev -p 3004',
    port: 3004,
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      ...process.env,
      TEST_MODE: 'true',
      PORT: '3004',
    },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
