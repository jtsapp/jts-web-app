import { defineConfig, devices } from '@playwright/test'

// E2E-проверки клиентских экранов (регистрация/вход, адаптивная оболочка).
// Запуск: `npm run test:e2e`. Сервер поднимается сам (или переиспользуется,
// если dev уже слушает 3100). Порт переопределяется через E2E_PORT — иначе,
// если 3100 занят чужим dev-сервером, reuseExistingServer молча прогонит
// тесты по чужому коду.
const PORT = Number(process.env.E2E_PORT) || 3100
const BASE = `http://localhost:${PORT}`

// Онбординг-тур экранов выходит сам при первом заходе и перехватывает клики
// (модалка поверх страницы) — любой тест про другое застревал бы на нём. Гасим
// отметками в localStorage для всего прогона; device-id фиксируем тем же
// снимком, иначе ключ отметки случайный (см. tourKeyFor в OnboardingTour.jsx).
// Тесты самого тура берут чистый профиль через test.use(FRESH_PROFILE).
const TOUR_SCOPES = ['dash', 'learn', 'practice', 'lessons', 'homework', 'vocab']
const noTours = {
  cookies: [],
  origins: [
    {
      origin: BASE,
      localStorage: [
        { name: 'jts_device_id', value: 'e2e-device' },
        ...TOUR_SCOPES.map((scope) => ({ name: `jts_tour_${scope}:e2e-device`, value: '1' })),
      ],
    },
  ],
}

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  use: { baseURL: BASE, storageState: noTours },
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
