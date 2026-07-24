import { test, expect } from '@playwright/test'
import path from 'node:path'

// a real (small) mp3 clip to serve for any audio request so load()/currentSrc work.
// Playwright runs from the project root, so resolve from cwd.
const SAMPLE_MP3 = path.resolve(process.cwd(), 'public/practice/listening/audio/a2/01-15__20p25-21p64.mp3')

// E2E for the native Аудирование trainer: routing from the banner, the intro
// synced to the user's level, and a full answer→feedback→coin cycle with the
// single requeue on a wrong answer. Content is mocked for determinism.

const CHOICE = {
  id: 'a1_x',
  type: 'listen_choice',
  audio: 'x.mp3',
  prompt: 'Where is Li now?',
  options: ['In Shanghai', 'In Beijing', 'In Tokyo'],
  answer: 'In Shanghai',
  explanation: '«I’m a student in <b>Shanghai</b>.»',
}

async function boot(page, { level = 'A1', content = [CHOICE] } = {}) {
  await page.route('**/api/auth/me', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { userId: 1, name: 'Тест', phone: '7', role: 'USER', languageLevel: level } }),
    }),
  )
  await page.route('**/practice/listening/content/*.json', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(content) }),
  )
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('jts_access_token', 'faketoken'))
}

test.describe('Практика — тренажёр «Аудирование»', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 760, 'десктопный дизайн')

  test('кнопка баннера открывает интро тренажёра', async ({ page }) => {
    await boot(page)
    await page.goto('/?screen=practice')
    await page.locator('.pp-listen').waitFor({ state: 'visible', timeout: 15000 })
    await page.locator('.pp-listen__cta').click()
    await expect(page.locator('.lt-intro')).toBeVisible({ timeout: 10000 })
  })

  test('интро показывает уровень пользователя', async ({ page }) => {
    await boot(page, { level: 'B1' })
    await page.goto('/?screen=listening')
    await expect(page.locator('.lt-intro')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.lt-intro__level')).toHaveText('Уровень B1')
  })

  test('верный ответ: монета +10 и переход к результату', async ({ page }) => {
    await boot(page)
    await page.goto('/?screen=listening')
    await page.getByRole('button', { name: 'Начать тренировку' }).click()

    await expect(page.locator('.lt-heading')).toHaveText('Where is Li now?')
    await page.getByRole('button', { name: 'In Shanghai', exact: true }).click()
    await page.getByRole('button', { name: 'Проверить' }).click()

    const fb = page.locator('.lt-fb')
    await expect(fb).toHaveClass(/lt-fb--ok/)
    await expect(fb.locator('.lt-fb__title')).toHaveText('Молодец!')
    await expect(fb.locator('.lt-fb__coin')).toContainText('+10')

    await page.getByRole('button', { name: 'Продолжить' }).click()
    await expect(page.locator('.lt-result')).toBeVisible()
    await expect(page.locator('.lt-result__stats')).toContainText('монет')
  })

  test('каждое задание проигрывает своё аудио (нет залипания прошлого клипа)', async ({ page }) => {
    const A = { id: 'a', type: 'listen_choice', audio: 'clipA.mp3', prompt: 'Вопрос А', options: ['A1', 'A2'], answer: 'A1', explanation: '' }
    const B = { id: 'b', type: 'listen_choice', audio: 'clipB.mp3', prompt: 'Вопрос Б', options: ['B1', 'B2'], answer: 'B1', explanation: '' }
    await boot(page, { content: [A, B] })
    // serve a real mp3 for any audio request so <audio>.currentSrc resolves
    await page.route('**/practice/listening/audio/**', (r) => r.fulfill({ path: SAMPLE_MP3, contentType: 'audio/mpeg' }))
    await page.goto('/?screen=listening')
    await page.getByRole('button', { name: 'Начать тренировку' }).click()
    await expect(page.locator('.lt-heading')).toBeVisible()

    // helper: the audio the browser has actually loaded must match the current task
    const expectAudioMatchesHeading = async () => {
      const heading = await page.locator('.lt-heading').textContent()
      const wantFile = heading?.includes('А') ? 'clipA.mp3' : 'clipB.mp3'
      await expect
        .poll(async () => page.locator('.lt-audio audio').evaluate((el) => el.currentSrc))
        .toContain(wantFile)
      return heading
    }

    const first = await expectAudioMatchesHeading()
    // answer correctly and advance to the second task
    await page.getByRole('button', { name: first.includes('А') ? 'A1' : 'B1', exact: true }).click()
    await page.getByRole('button', { name: 'Проверить' }).click()
    await page.getByRole('button', { name: 'Продолжить' }).click()

    await expect(page.locator('.lt-heading')).not.toHaveText(first)
    await expectAudioMatchesHeading() // the SECOND task's own clip, not the first
  })

  test('неверный ответ: «вернётся в конце» и повтор задания', async ({ page }) => {
    await boot(page)
    await page.goto('/?screen=listening')
    await page.getByRole('button', { name: 'Начать тренировку' }).click()
    await expect(page.locator('.lt-heading')).toBeVisible()

    await page.getByRole('button', { name: 'In Beijing', exact: true }).click()
    await page.getByRole('button', { name: 'Проверить' }).click()

    const fb = page.locator('.lt-fb')
    await expect(fb).toHaveClass(/lt-fb--no/)
    await expect(fb.locator('.lt-fb__title')).toHaveText('Неверный ответ')
    await expect(fb).toContainText('Это задание вернётся в конце')

    // requeued: продолжаем и снова видим то же задание (не результат)
    await page.getByRole('button', { name: 'Продолжить' }).click()
    await expect(page.locator('.lt-heading')).toHaveText('Where is Li now?')
  })
})
