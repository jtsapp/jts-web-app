import { test, expect } from '@playwright/test'

// Just to Listen (?screen=listen) без бэкенда: оглавление и набор из двух слов
// подменены, /api/tts отвечает тихим mp3 — пройти задание можно набором, звук
// проверен юнитами (voice.test.js). Слово задания тест узнаёт по числу ячеек:
// у mother их 6, у book — 4 (колода перемешана).

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// MPEG-1 Layer III: заголовок кадра и нули — декодер читает тишину.
function silentMp3(frames = 20) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0xc0])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}

const INDEX = {
  release: 1,
  uploadedAt: '2026-10-21T12:00:00',
  levels: [{ id: 'A0', name: 'Beginner', units: 1, lessons: 1, words: 2 }],
  fields: [{ id: 'business', name: 'Business', ru: 'Бизнес', icon: '💼', group: 'Business', premium: true, units: 1, lessons: 1, words: 1 }],
}
const A0 = {
  id: 'A0',
  kind: 'level',
  name: 'Beginner',
  units: [{ u: 1, title: 'You and me', lessons: [{ l: 1, t: 'My family', g: '', w: [
    ['mother', 'мама', 'My mother is a teacher.', 'Моя мама — учитель.', ''],
    ['book', 'книга', 'This is my book.', 'Это моя книга.', ''],
  ] }] }],
}
const ANSWERS = { 6: ['mother', 'My mother is a teacher.'], 4: ['book', 'This is my book.'] }

async function mockBackend(page, credits) {
  await page.addInitScript(() => {
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
    localStorage.setItem('jts_access_token', 'test-token')
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', phone: '77010001122', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/mobile/listen', (r) => r.fulfill(json(INDEX)))
  await page.route('**/mobile/listen/sets/A0', (r) => r.fulfill(json(A0)))
  // Регэкспы, а не глобы: «?» в глобе Playwright — не буквальный знак вопроса.
  await page.route(/\/api\/tts\?/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: silentMp3() }))
  await page.route(/\/mobile\/lesson-modules\/complete\?/, (r) => {
    credits.push(Number(new URL(r.request().url()).searchParams.get('xp')))
    return r.fulfill(json({}))
  })
}

// Одно задание без ошибок: слово по ячейкам, предложение, «Дальше».
async function answer(page) {
  const n = await page.locator('.jl-cell').count()
  const [word, sentence] = ANSWERS[n]
  await page.locator('.jl-cells__input').fill(word)
  await expect(page.locator('.jl-stage').first().locator('.jl-fb--ok')).toBeVisible()
  await page.locator('.jl-sent').fill(sentence)
  await page.getByRole('button', { name: 'Проверить' }).click()
  await expect(page.locator('.jl-stage').nth(1).locator('.jl-fb--ok')).toBeVisible()
  await page.locator('.jl-foot .jl-btn').click()
}

test('урок без ошибок — 50 монет в баланс; повтор не даёт ничего сверх лучшего', async ({ page }) => {
  const credits = []
  await mockBackend(page, credits)
  await page.goto('/?screen=listen')
  await expect(page.locator('.jl-lv').first()).toContainText('A0', { timeout: 30000 })
  await expect(page.locator('.jl-fld')).toContainText('Business')
  await page.locator('.jl-lv').first().click()
  await page.locator('.jl-topic', { hasText: 'My family' }).getByRole('button', { name: 'Начать' }).click()

  await answer(page)
  await answer(page)
  await expect(page.locator('.jl-result h2')).toContainText('+50')
  await expect(page.locator('.jl-result')).toContainText('В баланс: +50')
  await expect.poll(() => credits).toEqual([50])

  await page.getByRole('button', { name: 'Пройти заново' }).click()
  await answer(page)
  await answer(page)
  await expect(page.locator('.jl-result')).toContainText('Лучший результат не превышен')
  expect(credits).toEqual([50])

  await page.getByRole('button', { name: 'К темам A0' }).click()
  await expect(page.locator('.jl-topic', { hasText: 'My family' }).locator('.jl-best')).toContainText('50 · 2/2')
})

test('две ошибки в слове — показан ответ, за слово 0 монет', async ({ page }) => {
  await mockBackend(page, [])
  await page.goto('/?screen=listen&set=A0')
  await page.locator('.jl-topic', { hasText: 'My family' }).getByRole('button', { name: 'Начать' }).click({ timeout: 30000 })
  const n = await page.locator('.jl-cell').count()
  const input = page.locator('.jl-cells__input')
  await input.fill('z'.repeat(n))
  await expect(page.locator('.jl-fb--bad')).toContainText('Неверно, попробуй ещё раз')
  await input.fill('y'.repeat(n))
  await expect(page.locator('.jl-fb--bad')).toContainText(`Правильно: ${ANSWERS[n][0]}`)
  await expect(page.locator('.jl-coins')).toContainText('0')
  await expect(page.locator('.jl-sent')).toBeVisible()
})

test('раздел не загружен — сообщение, а не белый лист', async ({ page }) => {
  await mockBackend(page, [])
  await page.route('**/mobile/listen', (r) => r.fulfill(json({ messages: ['Just to Listen ещё не загружен'] }, 404)))
  await page.goto('/?screen=listen')
  await expect(page.locator('.jl-notice')).toContainText('Раздел готовится', { timeout: 30000 })
})

test('360px: меню и задание без горизонтальной прокрутки', async ({ page }) => {
  await mockBackend(page, [])
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/?screen=listen')
  await expect(page.locator('.jl-lv').first()).toBeVisible({ timeout: 30000 })
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(await overflow()).toBeLessThanOrEqual(0)
  await page.locator('.jl-lv').first().click()
  await page.locator('.jl-topic', { hasText: 'My family' }).getByRole('button', { name: 'Начать' }).click()
  await expect(page.locator('.jl-cell').first()).toBeVisible()
  expect(await overflow()).toBeLessThanOrEqual(0)
})
