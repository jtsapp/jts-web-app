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
