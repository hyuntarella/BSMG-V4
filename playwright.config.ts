import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3008',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx next dev -p 3008',
    port: 3008,
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      ...process.env,
      TEST_MODE: 'true',
      PORT: '3008',
    },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
