import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { loginAsStudent } from './helpers/login.js'

// Жалоба 11.11.2026 с прода: карточки «Ситуаций» в Практике открывались голым
// роликом с «Отметить пройденной», а не экраном сценария. На прод-бэкенде
// ситуативки id 1–50 повторяют сценарии статики (slug situ-<уровень>-<NN>), и
// тестовому ученику админ закрыл всё, кроме B1 (src/practice/situations/backendMirrors.js).
// Ответ /mobile/situativki здесь собран из тех же данных уровней, что читает экран.

const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1']
const items = (code) =>
  JSON.parse(readFileSync(path.join(__dirname, '..', 'public', 'practice', 'situations', `${code}.json`), 'utf8')).items
const STATIC = Object.fromEntries(LEVELS.map((c) => [c, items(c)]))
const ru = (t) => (typeof t === 'object' ? t.ru || t.en : t)

const PROD = LEVELS.flatMap((code, li) =>
  STATIC[code].map((it, i) => {
    const locked = code !== 'b1'
    return {
      id: li * 10 + i + 1,
      slug: `situ-${code}-${String(it.id).padStart(2, '0')}`,
      level: code.toUpperCase(),
      title: typeof it.title === 'object' ? it.title.en : it.title,
      coverUrl: '',
      videoUrl: locked ? null : `/practice/situations/media/${code}-v${String(i + 1).padStart(2, '0')}.mp4`,
      completed: false,
      locked,
    }
  }),
)

test('прод-зеркала: «Ситуации» — сценарии B1 экраном сценария, без окна-ролика', async ({ page }) => {
  await loginAsStudent(page, { level: 'A2' })
  // Позже общего перехвата бэкенда — в Playwright выигрывает последний маршрут.
  await page.route('**/mobile/situativki**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PROD) }),
  )

  await page.goto('/?screen=practice')
  const speaking = page.locator('.pk-skill', { hasText: 'Говорение' })
  await expect(speaking).toBeVisible({ timeout: 60_000 })
  await speaking.click()
  await page.locator('#sec-situations').click()

  const titles = page.locator('.pk-situ__title')
  await expect(titles).toHaveText(STATIC.b1.map((s) => ru(s.title)), { timeout: 30_000 })

  // Экран сценария, а не окно ситуативки с роликом и «Отметить пройденной».
  await titles.first().click()
  const view = page.locator('.sit-view')
  await expect(view).toBeVisible({ timeout: 30_000 })
  await expect(view).toContainText('B1 · 1/10')
  await expect(page.getByRole('button', { name: 'Отметить пройденной' })).toHaveCount(0)
})
