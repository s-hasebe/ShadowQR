import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const API_URL  = process.env.API_URL  ?? 'http://localhost:8000'

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 180_000,          // 3分（パイプライン完了待ちを考慮）
  expect: { timeout: 10_000 },
  fullyParallel: false,      // 結合テストと同じサーバーを共有するため直列
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

export { API_URL }
