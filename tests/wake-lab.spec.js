import fs from 'node:fs'
import { test, expect } from '@playwright/test'

// Лаборатория позывного с НАСТОЯЩИМ Vosk: модель грузится, воркер стартует, «ухо»
// слушает фальшивый микрофон Chrome. Слышит ли модель «Привет, Луна» — замеряют
// люди на телефонах (шаг 0 спеки); здесь — что цепочка вообще живая.
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } })

const MODEL = 'public/assistant/wake/vosk-model-small-ru-0.22.tar.gz'

test('модель грузится, «ухо» слушает', async ({ page }) => {
  test.skip(!fs.existsSync(MODEL), 'нет модели: node scripts/fetch-wake-model.js')
  test.setTimeout(180_000)
  await page.goto('/wake-lab')
  await page.getByRole('button', { name: 'Старт' }).click()
  await expect(page.getByTestId('wake-state')).toContainText('listening', { timeout: 150_000 })
})

// «Ухо» Айзере (помощник при казахском интерфейсе) — своя, казахская модель.
const MODEL_KK = 'public/assistant/wake/vosk-model-small-kz-0.42.tar.gz'

test('«ухо» Айзере: казахская модель грузится, позывной — её имя', async ({ page }) => {
  test.skip(!fs.existsSync(MODEL_KK), 'нет модели: node scripts/fetch-wake-model.js')
  test.setTimeout(180_000)
  const models = []
  page.on('request', (r) => r.url().includes('/assistant/wake/') && models.push(new URL(r.url()).pathname))
  await page.goto('/wake-lab?persona=aizere')
  await expect(page.getByTestId('wake-phrases')).toContainText('«айзере»')
  await page.getByRole('button', { name: 'Старт' }).click()
  await expect(page.getByTestId('wake-state')).toContainText('listening', { timeout: 150_000 })
  expect(models).toContain('/assistant/wake/vosk-model-small-kz-0.42.tar.gz')
})
