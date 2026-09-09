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
// на весь прогон тумблером `jts_tours_off`: отметки о показе привязаны к id
// профиля, а он приезжает с бэкенда, и снаружи такой ключ не угадать.
// Тесты самого тура берут чистый профиль через test.use(FRESH_PROFILE).
const noTours = {
  cookies: [],
  origins: [{ origin: BASE, localStorage: [{ name: 'jts_tours_off', value: '1' }] }],
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
