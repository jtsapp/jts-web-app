import { defineConfig, devices } from '@playwright/test'

// E2E-проверки адаптивной оболочки (мобильная шапка + сайдбар-drawer).
// Запуск: `npm run test:e2e`. Сервер поднимается сам (или переиспользуется,
// если dev уже слушает 3100).
const PORT = 3100
const BASE = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  use: { baseURL: BASE },
  projects: [
    // Мобилку эмулируем chromium'ом с узким вьюпортом — так тест не тянет
    // отдельный webkit-браузер и запускается на любой машине с chromium.
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: false },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: BASE,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
