import { test, expect } from '@playwright/test'

// Раздел «Караоке» в Практике. Бэкенд подставной: проверяем то, что зависит от
// клиента — раздел появляется только с контентом, разметка доспрашивается
// отдельным запросом (в каталоге её нет), битый трек не роняет экран.
//
// Контракт: docs/superpowers/specs/2026-09-03-karaoke-api-contract.md

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const TRACK = {
  id: 1,
  slug: 'rainy-monday',
  title: 'Rainy Monday',
  artist: 'JTS Originals',
  level: 'A2',
  bpm: 92,
  durationSec: 20,
  tags: ['past-simple', 'weather'],
  coverUrl: 'https://files.example/cover.webp',
  audioUrl: 'https://files.example/rainy.mp3',
  lineCount: 2,
  description: { ru: 'Про дождливый понедельник', en: '', kk: '' },
}

const LYRICS = {
  version: 1,
  duration: 20,
  vocab: [
    { w: 'umbrella', ru: 'зонт', line: 1 },
    { w: 'bus', ru: 'автобус', line: 2 },
  ],
  lines: [
    { id: 1, start: 1, end: 4, text: 'I woke up on a rainy Monday', ru: 'Я проснулся дождливым понедельником' },
    { id: 2, start: 5, end: 8, text: 'And the bus was late again', ru: 'И автобус снова опоздал' },
  ],
}

async function signIn(page, tracks, lyrics = LYRICS) {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/mobile/karaoke', (r) => r.fulfill(json(tracks)))
  // Карточка каталога разметку не несёт — она приезжает только по одному треку.
  await page.route('**/mobile/karaoke/1', (r) => r.fulfill(json({ ...TRACK, lyrics })))
}

test.beforeEach(async ({ page }) => {
  // Каталог кэшируется в localStorage (stale-while-revalidate), а тесты
  // подменяют ответ — чужой кэш от соседнего теста показал бы прошлый каталог.
  await page.addInitScript(() => localStorage.clear())
})

test('раздел появляется только вместе с контентом', async ({ page }) => {
  await signIn(page, [])
  await page.goto('/?screen=practice')
  await expect(page.locator('#sec-karaoke')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Караоке', exact: true })).toHaveCount(0)
})

test('каталог показывает трек, а карточка — режимы', async ({ page }) => {
  await signIn(page, [TRACK])
  await page.goto('/?screen=practice')

  const section = page.locator('#sec-karaoke')
  await expect(section).toBeVisible()
  await expect(section.getByText('Rainy Monday')).toBeVisible()
  await expect(section.getByText('JTS Originals')).toBeVisible()

  await section.getByText('Rainy Monday').click()

  // Разметка приезжает отдельным запросом — до неё экран показывает загрузку.
  await expect(page.getByText('Спеть целиком')).toBeVisible()
  await expect(page.getByText('Разогрев')).toBeVisible()
  await expect(page.locator('.kk__facts')).toContainText('строк: 2')
  // Обещание про микрофон обязано быть на экране до запроса разрешения.
  await expect(page.locator('.kk__privacy')).toContainText('никуда не сохраняется')
})

test('битая разметка не роняет экран', async ({ page }) => {
  // Пересекающиеся строки — фатальная ошибка по контракту §3.
  await signIn(page, [TRACK], {
    duration: 20,
    lines: [
      { id: 1, start: 1, end: 6, text: 'one' },
      { id: 2, start: 4, end: 8, text: 'two' },
    ],
  })
  await page.goto('/?screen=practice')
  await page.locator('#sec-karaoke').getByText('Rainy Monday').click()

  await expect(page.locator('.kk__empty')).toContainText('битая разметка')
})

test('разогрев показывает слова из песни', async ({ page }) => {
  await signIn(page, [TRACK])
  await page.goto('/?screen=practice')
  await page.locator('#sec-karaoke').getByText('Rainy Monday').click()

  await page.getByText('Разогрев').click()
  await expect(page.locator('.kk__cardWord')).toHaveText('umbrella')
  await expect(page.locator('.kk__cardTr')).toHaveText('зонт')
  await expect(page.locator('.kk__cardLine')).toContainText('rainy Monday')
})

test('трек без разметки помечается недоступным, а не грузится вечно', async ({ page }) => {
  await signIn(page, [TRACK], null)
  await page.goto('/?screen=practice')
  await page.locator('#sec-karaoke').getByText('Rainy Monday').click()

  await expect(page.locator('.kk__empty')).toContainText('битая разметка')
})
