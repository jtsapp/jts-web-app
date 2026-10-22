import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Prepositions World (?screen=prepositions) без бэкенда: /mobile/prepositions
// отдаёт бандл урезанной копии прототипа (src/practice/prepositions/__fixtures__),
// медиа /__prep-media/* — пиксель webp и тихий mp3, /api/tts — тихий mp3.
// Верный ответ тест из сессии движка узнать не может (правильный вариант не
// выдаётся наружу — для теста так же, как для ученика) — поэтому отвечает
// первым вариантом и проверяет только ход сессии и итог, а правильность наборов
// — оракул (engine.test.js).

const BUNDLE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'practice', 'prepositions', '__fixtures__', 'bundle.json'), 'utf8'))
const LESSON = BUNDLE.course.cats[0].lessons[0]
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
function silentMp3(frames = 20) {
  const frame = Buffer.alloc(417)
  frame.set([0xff, 0xfb, 0x90, 0xc0])
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}
// 1×1 webp
const PIXEL = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=', 'base64')

async function mockBackend(page, { bundleStatus = 200, token = 'test-token' } = {}) {
  // Чистим хранилище один раз на вкладку: init-скрипт идёт и на перезагрузке,
  // а тест как раз проверяет, что прогресс её переживает.
  await page.addInitScript((tk) => {
    if (sessionStorage.getItem('e2e_prep_init')) return
    sessionStorage.setItem('e2e_prep_init', '1')
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
    if (tk) localStorage.setItem('jts_access_token', tk)
  }, token)
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', phone: '77010001122', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/mobile/prepositions', (r) => r.fulfill(bundleStatus === 200 ? json(BUNDLE) : json({ messages: ['нет'] }, bundleStatus)))
  await page.route('**/__prep-media/**', (r) =>
    r.fulfill(r.request().url().endsWith('.mp3') ? { status: 200, contentType: 'audio/mpeg', body: silentMp3() } : { status: 200, contentType: 'image/webp', body: PIXEL }))
  await page.route(/\/api\/tts\?/, (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: silentMp3() }))
}

const shadow = (page) => page.locator('.prp-host')

test('урок → практика урока → итог; прогресс переживает перезагрузку', async ({ page }) => {
  // Гидратация ломается тихо — только pageerror её и показывает.
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await mockBackend(page)
  await page.goto('/?screen=prepositions')
  const host = shadow(page)
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  await expect(host.locator('.hero h1')).toContainText('prepositions')

  await host.locator(`a[href="#/learn/${LESSON.id}"]`).click()
  for (let i = 0; i < LESSON.screens.length; i++) await host.locator('#nextBtn').click()
  await expect(host.locator('.ls-mis')).toBeVisible()
  await host.locator(`a[href="#/practice/lesson/${LESSON.id}"]`).click()

  for (let i = 0; i < LESSON.practice.length; i++) {
    await expect(host.locator('.gt small')).toContainText(`Question ${i + 1} of`)
    const passage = host.locator('.opt.small')
    if (await passage.count()) {
      const gaps = await host.locator('.pg').count()
      for (let g = 0; g < gaps; g++) await host.locator(`.opt.small[data-g="${g}"]`).first().click()
    } else {
      await host.locator('.opt').first().click()
    }
    await host.locator('#nxt').click()
  }
  await expect(host.locator('.end .score')).toContainText(`of ${LESSON.practice.length} correct`)

  await page.reload()
  await expect(host).toHaveAttribute('data-release', '1', { timeout: 30000 })
  await expect(host.locator(`a.lcard.done[href="#/learn/${LESSON.id}"]`)).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('гость видит просьбу войти, без заливки — «Раздел готовится»', async ({ page }) => {
  await mockBackend(page, { token: null })
  await page.goto('/?screen=prepositions')
  await expect(page.locator('.prp-state[data-status="guest"]')).toBeVisible({ timeout: 30000 })

  const page2 = await page.context().newPage()
  await mockBackend(page2, { bundleStatus: 404 })
  await page2.goto('/?screen=prepositions')
  await expect(page2.locator('.prp-state[data-status="missing"]')).toBeVisible({ timeout: 30000 })
})

test('360px: без горизонтальной прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await mockBackend(page)
  await page.goto('/?screen=prepositions')
  await expect(shadow(page)).toHaveAttribute('data-release', '1', { timeout: 30000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
