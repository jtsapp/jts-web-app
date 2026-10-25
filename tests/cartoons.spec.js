import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Cartoon World (?screen=cartoons) без бэкенда: /mobile/cartoons отдаёт каталог
// урезанной копии прототипа (src/practice/cartoons/__fixtures__), миссии — по
// одной из missions.json, фоны — пиксель JPEG, YouTube заглушён (плеер покажет
// «не удалось загрузить», миссия под видео от этого не зависит). Движение
// выключено (prefers-reduced-motion): персонаж «печатает» мгновенно.

const DIR = path.join(__dirname, '..', 'src', 'practice', 'cartoons', '__fixtures__')
const INDEX = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'))
const MISSIONS = JSON.parse(fs.readFileSync(path.join(DIR, 'missions.json'), 'utf8'))
const ANSWER = 'I really think this is a good idea for all of us today, my friend and you too.'
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
// 1×1 JPEG
const PIXEL = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=', 'base64')

async function mockBackend(page, { indexStatus = 200, token = 'test-token' } = {}) {
  // Хранилище чистим один раз на вкладку: init-скрипт идёт и на перезагрузке, а тест проверяет, что прогресс её переживает.
  await page.addInitScript((tk) => {
    if (sessionStorage.getItem('e2e_cw_init')) return
    sessionStorage.setItem('e2e_cw_init', '1')
    const toursOff = localStorage.getItem('jts_tours_off')
    localStorage.clear()
    if (toursOff) localStorage.setItem('jts_tours_off', toursOff)
    if (tk) localStorage.setItem('jts_access_token', tk)
  }, token)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 1, name: 'Асель', phone: '77010001122', role: 'STUDENT', languageLevel: 'A2' } })))
  await page.route('**/mobile/cartoons', (r) => r.fulfill(indexStatus === 200 ? json(INDEX) : json({ messages: ['нет'] }, indexStatus)))
  await page.route('**/mobile/cartoons/missions/**', (r) => {
    const id = decodeURIComponent(new URL(r.request().url()).pathname.split('/').pop())
    return MISSIONS[id] ? r.fulfill(json(MISSIONS[id])) : r.fulfill(json({ messages: ['нет такой миссии'] }, 404))
  })
  await page.route('**/__cw-media/**', (r) => r.fulfill({ status: 200, contentType: 'image/jpeg', body: PIXEL }))
  await page.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: 'image/jpeg', body: PIXEL }))
  await page.route(/youtube(-nocookie)?\.com/, (r) => r.abort())
}

const host = (page) => page.locator('.cwp-host')

test('библиотека → видео → миссия до конца; «выполнено» переживает перезагрузку', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await mockBackend(page)
  await page.goto('/?screen=cartoons')
  await expect(host(page)).toHaveAttribute('data-release', '1', { timeout: 30000 })
  await expect(host(page).locator('.ct-shelf').first()).toBeVisible()
  // нерабочее видео с бэкенда не показывается
  await expect(host(page).locator(`a.ct-card__link[href="#watch/${encodeURIComponent(INDEX.unavailable[0].id)}"]`)).toHaveCount(0)

  const card = host(page).locator('a.ct-card__link').first()
  const id = decodeURIComponent((await card.getAttribute('href')).slice('#watch/'.length))
  await card.click()
  await expect(host(page).locator('#ct-ep-title')).not.toBeEmpty()
  await host(page).locator('#ct-ms-open').click()

  const turns = MISSIONS[id].chat.turns.length
  for (let i = 0; i < turns; i++) {
    await host(page).locator('#ct-ms-text').fill(ANSWER)
    await host(page).locator('#ct-ms-send').click()
  }
  await expect(host(page).locator('#ct-ms-done')).toBeVisible()

  await page.reload()
  await expect(host(page)).toHaveAttribute('data-release', '1', { timeout: 30000 })
  await expect(host(page).locator(`a.ct-card__link[href="#watch/${encodeURIComponent(id)}"] .ct-badge--ok`)).toBeVisible()
  expect(errors).toEqual([])
})

test('гость видит просьбу войти, без заливки — «Раздел готовится»', async ({ page }) => {
  await mockBackend(page, { token: null })
  await page.goto('/?screen=cartoons')
  await expect(page.locator('.cwp-state[data-status="guest"]')).toBeVisible({ timeout: 30000 })

  const page2 = await page.context().newPage()
  await mockBackend(page2, { indexStatus: 404 })
  await page2.goto('/?screen=cartoons')
  await expect(page2.locator('.cwp-state[data-status="missing"]')).toBeVisible({ timeout: 30000 })
})

test('360px: без горизонтальной прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await mockBackend(page)
  await page.goto('/?screen=cartoons')
  await expect(host(page)).toHaveAttribute('data-release', '1', { timeout: 30000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
