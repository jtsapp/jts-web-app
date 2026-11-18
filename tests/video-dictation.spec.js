import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { loginAsStudent } from './helpers/login.js'

// Видеодиктант (?screen=video-dictation) без бэкенда и без YouTube: вход и замки кабинета — loginAsStudent (бэкенд
// подменён целиком), ручки /mobile/video-dictation… отдают фикстуру раздела, превью — пиксель, а IFrame API YouTube
// подменён заглушкой YT.Player (seekTo, playVideo, pauseVideo, getCurrentTime, getPlayerState, setPlaybackRate, destroy,
// onReady): она ничего не рисует, время «видео» идёт в SPEED раз быстрее часов, вызовы API копятся
// в window.__yt.calls, а ролик gone0000000 отвечает onError(150).

const FIX = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'practice', 'video-dictation', '__fixtures__', 'lessons.json'), 'utf8'),
)
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
// 1×1 JPEG
const PIXEL = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=', 'base64')

const FAKE_YT = `(() => {
  const SPEED = 8
  class Player {
    constructor(el, opts) {
      this.opts = opts
      this.t = 0
      this.at = 0
      this.rate = 1
      this.playing = false
      const node = typeof el === 'string' ? document.getElementById(el) : el
      const frame = document.createElement('div')
      frame.className = 'yt-fake'
      frame.dataset.video = opts.videoId
      node.replaceWith(frame)
      window.__yt = { calls: [] }
      setTimeout(() => {
        if (opts.videoId === 'gone0000000') opts.events?.onError?.({ data: 150, target: this })
        else opts.events?.onReady?.({ target: this })
      }, 0)
    }
    now() { return this.playing ? this.t + ((performance.now() - this.at) / 1000) * SPEED * this.rate : this.t }
    log(...call) { window.__yt.calls.push(call) }
    getCurrentTime() { return this.now() }
    getPlayerState() { return this.playing ? 1 : this.started ? 2 : -1 }
    seekTo(s) { this.t = s; this.at = performance.now(); this.log('seekTo', s) }
    playVideo() { this.t = this.now(); this.at = performance.now(); this.playing = true; this.started = true; this.log('playVideo'); this.opts.events?.onStateChange?.({ data: 1, target: this }) }
    pauseVideo() { this.t = this.now(); this.playing = false; this.log('pauseVideo'); this.opts.events?.onStateChange?.({ data: 2, target: this }) }
    setPlaybackRate(r) { this.t = this.now(); this.at = performance.now(); this.rate = r; this.log('setPlaybackRate', r) }
    destroy() {}
  }
  window.YT = { Player, PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 } }
  if (typeof window.onYouTubeIframeAPIReady === 'function') window.onYouTubeIframeAPIReady()
})()`

async function mockBackend(page, { indexStatus = 200 } = {}) {
  await loginAsStudent(page, { level: 'A1' })
  // Прогресс чистим один раз на вкладку: init-скрипт идёт и на перезагрузке, а тест проверяет, что её переживает урок.
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e_vd_init')) return
    sessionStorage.setItem('e2e_vd_init', '1')
    localStorage.removeItem('jts_video_dictation_v1')
  })
  // Маршруты ниже поставлены после общего перехвата бэкенда loginAsStudent — в Playwright выигрывает последний.
  await page.route('**/mobile/video-dictation', (r) =>
    r.fulfill(indexStatus === 200 ? json(FIX.index) : json({ messages: ['нет'] }, indexStatus)))
  await page.route('**/mobile/video-dictation/*', (r) => {
    const slug = decodeURIComponent(new URL(r.request().url()).pathname.split('/').pop())
    return FIX.lessons[slug] ? r.fulfill(json(FIX.lessons[slug])) : r.fulfill(json({ messages: ['нет'] }, 404))
  })
  await page.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: 'image/jpeg', body: PIXEL }))
  await page.route('https://www.youtube.com/iframe_api', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_YT }))
}

const calls = (page) => page.evaluate(() => window.__yt?.calls || [])
const input = (page) => page.locator('.jl-cells__input')

async function openLesson(page, title) {
  await expect(page.locator('.vd-card').first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('radio', { name: 'Все' }).click()
  await page.locator('.vd-card', { hasText: title }).click()
}

test('список → урок → набор → итог; лучший результат в списке; F5 посреди урока остаётся в уроке', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await mockBackend(page)
  await page.goto('/?screen=video-dictation')
  await openLesson(page, 'Rainy Day')
  await expect(page).toHaveURL(/lesson=rainy-day-k3f9q/)

  await page.reload()
  await expect(page.locator('.jl-crumb')).toHaveText('Rainy Day', { timeout: 30_000 })

  await page.getByRole('button', { name: 'Начать' }).click()
  await expect.poll(() => calls(page)).toEqual(expect.arrayContaining([['seekTo', 1], ['playVideo']]))
  // фраза доиграла до конца и встала на паузу
  await expect.poll(async () => (await calls(page)).some((c) => c[0] === 'pauseVideo')).toBe(true)

  await page.getByRole('button', { name: 'Медленнее' }).click()
  await expect(page.getByRole('button', { name: 'Медленнее' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => calls(page)).toEqual(expect.arrayContaining([['setPlaybackRate', 0.75]]))

  await expect(input(page)).toHaveAttribute('aria-label', 'Фраза 1: напиши услышанное по буквам')
  await input(page).fill('lovemuddy')
  await input(page).press('Enter')
  await expect(page.locator('.jl-cells.is-ok')).toBeVisible()
  await expect(page.locator('.vd-verdict')).toContainText('Верно с первого раза!')
  await expect(page.locator('.vd-full')).toHaveText('I love jumping in muddy puddles!')
  await page.getByRole('button', { name: 'Дальше' }).click()

  await expect(page.locator('.vd-count')).toHaveText('Фраза 2 из 2')
  await expect.poll(() => calls(page)).toEqual(expect.arrayContaining([['seekTo', 4]]))
  await input(page).fill('Where is my teddy')
  await input(page).press('Enter')
  await page.getByRole('button', { name: 'Итог' }).click()
  await expect(page.locator('.vd-result h2')).toHaveText('С первого раза: 2 из 2')

  await page.getByRole('button', { name: 'К списку' }).last().click()
  await expect(page).not.toHaveURL(/lesson=/)
  await expect(page.locator('.vd-card', { hasText: 'Rainy Day' }).locator('.vd-card__best')).toHaveText('С первого раза: 2 из 2')
  expect(errors).toEqual([])
})

test('две неудачи — фраза показана; «Пройти ошибки заново» не меняет лучший результат', async ({ page }) => {
  await mockBackend(page)
  await page.goto('/?screen=video-dictation')
  await openLesson(page, 'Lost Kite')
  await page.getByRole('button', { name: 'Начать' }).click()

  await input(page).fill('zzzzzzz')
  await input(page).press('Enter')
  await expect(page.locator('.vd-verdict')).toContainText('Не совсем')
  await input(page).fill('qqqqqqq')
  await input(page).press('Enter')
  await expect(page.locator('.jl-cells.is-shown')).toBeVisible()
  await expect(page.locator('.vd-verdict')).toHaveAttribute('data-assistant-expected', "Let's fly the kite together.")
  await page.getByRole('button', { name: 'Итог' }).click()
  await expect(page.locator('.vd-result h2')).toHaveText('С первого раза: 0 из 1')

  await page.getByRole('button', { name: 'Пройти ошибки заново' }).click()
  await input(page).fill('flykite')
  await input(page).press('Enter')
  await page.getByRole('button', { name: 'Итог' }).click()
  await expect(page.locator('.vd-result')).toContainText('Повтор ошибок не меняет лучший результат урока.')
  await page.getByRole('button', { name: 'К списку' }).last().click()
  await expect(page.locator('.vd-card', { hasText: 'Lost Kite' }).locator('.vd-card__best')).toHaveText('С первого раза: 0 из 1')
})

test('ролик недоступен — плашка со ссылкой на YouTube и «К списку»', async ({ page }) => {
  await mockBackend(page)
  await page.goto('/?screen=video-dictation')
  await openLesson(page, 'Gone Video')
  const plate = page.locator('.vd-gone')
  await expect(plate).toContainText('Видео недоступно')
  await expect(page.getByRole('link', { name: 'Смотреть на YouTube' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=gone0000000&t=1s')
  await plate.getByRole('button', { name: 'К списку' }).click()
  await expect(page.locator('.vd-card').first()).toBeVisible()
})

test('ручки ещё нет (404) — «Раздел готовится»', async ({ page }) => {
  await mockBackend(page, { indexStatus: 404 })
  await page.goto('/?screen=video-dictation')
  await expect(page.locator('[data-status="missing"]')).toHaveText('Раздел готовится: уроков пока нет.', { timeout: 30_000 })
})

test('360px: урок без горизонтальной прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await mockBackend(page)
  await page.goto('/?screen=video-dictation&lesson=rainy-day-k3f9q')
  await page.getByRole('button', { name: 'Начать' }).click({ timeout: 30_000 })
  await expect(input(page)).toBeFocused()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('320px: длинное слово в пропуске — урок без горизонтальной прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await mockBackend(page)
  const lesson = { ...FIX.lessons['rainy-day-k3f9q'], slug: 'long-gap-x1', title: 'Long Gap', segments: [[1.0, 3.0, '[extraordinarily] good']] }
  await page.route('**/mobile/video-dictation/long-gap-x1', (r) => r.fulfill(json(lesson)))
  await page.goto('/?screen=video-dictation&lesson=long-gap-x1')
  await page.getByRole('button', { name: 'Начать' }).click({ timeout: 30_000 })
  await expect(input(page)).toBeFocused()
  await input(page).fill('extraordinarily')
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
})
