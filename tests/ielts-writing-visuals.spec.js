import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'

// Эталоны визуала Task 1 (TaskVisual, ТЗ §4, разбор D1): по одному заданию на тип (line, bar, pie, table, multi,
// figure) в режимах full (страница задания) и thumb (карточка списка), плюс drill и pick (раунды тренировки) — в
// светлой и тёмной теме на 390 и 1280 px. Полный прогон по всем 137 заданиям — ручной скрипт, не CI.
// Проверяем и то, что ничего не выходит за экран: у страницы нет горизонтальной прокрутки, таблица прокручивается
// внутри своей рамки. Бэкенд подменён целиком: каталог Writing и документы — фикстуры ниже.

const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const FIGURE_SVG =
  '<svg viewBox="0 0 360 120" xmlns="http://www.w3.org/2000/svg" font-family="var(--font)"><rect x="4" y="30" width="100" height="60" rx="8" fill="var(--jts-bg-soft)" stroke="var(--jts-line-strong)"/><text x="54" y="64" text-anchor="middle" fill="var(--jts-ink)" font-size="12">Collect</text><line x1="106" y1="60" x2="128" y2="60" stroke="var(--jts-muted)"/><rect x="130" y="30" width="100" height="60" rx="8" fill="var(--jts-violet-soft)" stroke="var(--jts-violet)"/><text x="180" y="64" text-anchor="middle" fill="var(--jts-ink)" font-size="12">Filter</text><line x1="232" y1="60" x2="254" y2="60" stroke="var(--jts-muted)"/><rect x="256" y="30" width="100" height="60" rx="8" fill="var(--jts-green-soft)" stroke="var(--jts-green)"/><text x="306" y="64" text-anchor="middle" fill="var(--jts-ink)" font-size="12">Store</text></svg>'

const LINE = { type: 'line', title: 'Visitors to a city zoo, 2015–2023', unit: 'visitors', x: ['2015', '2017', '2019', '2021', '2023*'], series: [{ name: 'City zoo', values: [1240, 1810, 2100, 980, 2400] }, { name: 'Safari park', values: [600, 700, 900, 1000, 1500] }] }
const BAR = { type: 'bar', title: 'Household spending by category', unit: '%', yMax: 50, yStep: 10, x: ['Housing', 'Food and drink', 'Transport', 'Leisure and culture'], series: [{ name: '2000', values: [30, 22, 15, 10] }, { name: '2020', values: [38, 18, 14, 12] }] }
// pie и table — в старом формате банка (одна серия по x; серии по x), как W1-AC-103 / W1-AC-104
const PIE = { type: 'pie', unit: '%', title: 'Share of smartphone use by adults, 2022', x: ['Messaging', 'Social media', 'Video and music', 'Web browsing', 'Shopping and banking', 'Other'], series: [{ name: 'Share of use', values: [32, 24, 18, 11, 8, 7] }] }
const TABLE = { type: 'table', unit: 'hours', title: 'Average weekly hours of exercise', x: ['2000', '2005', '2010', '2015', '2020', '2025 (forecast)'], series: [{ name: '18–29', values: [6.5, 6.1, 5.8, 5, 4.6, 4.4] }, { name: '30–44', values: [4, 4.1, 4.2, 4.3, 4.4, 4.6] }, { name: '60 and over', values: [1.9, 2.4, 2.9, 3.4, 3.8, 4.1] }] }
const MULTI = { type: 'multi', alt: 'A line graph and a pie chart', charts: [{ ...LINE, title: 'Visitors' }, { ...PIE, title: 'Shares' }] }
const FIGURE = { type: 'figure', kind: 'process', alt: 'Rainwater is collected, filtered and stored.', svg: FIGURE_SVG }

const VISUALS = { line: LINE, bar: BAR, pie: PIE, table: TABLE, multi: MULTI, process: FIGURE }
const TASKS = Object.entries(VISUALS).map(([cat, chart], i) => ({
  row: { id: `W1-AC-9${i}0`, kind: 'task1', module: 'academic', category: cat, title: `Fixture ${cat}`, bandMin: 5, bandMax: 6, timeLimitSec: 1200, attemptCount: 0 },
  doc: { kind: 'task1', taskKind: 'task1_academic', question: `The chart below shows ${cat} data.\n\nSummarise the information.`, minWords: 150, timeLimitSec: 1200, chart },
}))

// Тренировка с визуалом в раунде (режим drill) и раундом «отметь точки» (режим pick), контракт §3
const DRILL = {
  id: 'WD-T1-FEATURES', skill: 'writing', kind: 'drill', module: 'academic', category: 'task1', part: 'T1', types: ['line'], title: 'Key features',
  name: { ru: 'Что стоит упомянуть', en: 'Key features', kk: 'Нені атап өту керек' }, show: 2,
  rounds: [
    { id: 'T1-FEATURES-001', kind: 'choice', ty: 'line', visual: LINE, text: 'Which is the main trend?', options: ['An overall rise', 'A steady fall'], key: 'A', why: { ru: 'Рост' } },
    { id: 'T1-FEATURES-002', kind: 'pick', ty: 'line', visual: LINE, answer: [2, 3], why: { ru: 'Пик и спад' } },
  ],
}

async function mockBackend(page) {
  await page.route('**/mobile/ielts/plan/me', (r) => r.fulfill(json({ ieltsAccount: true, onboarded: true, access: true, track: 'academic' })))
  await page.route('**/mobile/ielts/tests?skill=writing**', (r) => r.fulfill(json([...TASKS.map((x) => x.row), { id: DRILL.id, kind: 'drill', module: 'academic', category: 'task1', title: DRILL.title }])))
  await page.route('**/mobile/ielts/tests?skill=**', (r) => r.fulfill(json([])))
  await page.route(/\/mobile\/ielts\/tests\/[^/?]+$/, (r) => {
    const id = decodeURIComponent(r.request().url().split('/').pop())
    if (id === DRILL.id) return r.fulfill(json({ test: { id }, document: DRILL }))
    const t = TASKS.find((x) => x.row.id === id)
    return t ? r.fulfill(json({ test: t.row, document: t.doc })) : r.fulfill({ status: 404, body: '{}' })
  })
  await page.route('**/mobile/ielts/drills/progress**', (r) => r.fulfill(json([])))
  await page.route('**/mobile/ielts/review**', (r) => r.fulfill(json([])))
  await page.route('**/mobile/ielts/writing/works**', (r) => r.fulfill(json([])))
}

const THEMES = ['light', 'dark']
const WIDTHS = [390, 1280]

async function open(page, theme, width, query) {
  await page.setViewportSize({ width, height: 900 })
  await page.addInitScript((th) => localStorage.setItem('jts_theme', th), theme)
  await page.goto(`/?screen=ielts&ieltsTab=learn&${query}`)
}

// у страницы нет горизонтальной прокрутки: визуал не шире экрана (таблица прокручивается внутри рамки)
async function noOverflow(page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(over).toBeLessThanOrEqual(1)
}

test.describe('IELTS Writing — визуалы Task 1', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page)
    await mockBackend(page)
  })

  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      test(`thumb: карточки списка Task 1 · ${theme} · ${width}`, async ({ page }) => {
        await open(page, theme, width, 'ieltsView=writing-task1')
        const cards = page.locator('.ih-wcat__card')
        await expect(cards).toHaveCount(TASKS.length, { timeout: 60_000 })
        for (let i = 0; i < TASKS.length; i++) {
          const card = cards.nth(i)
          await card.scrollIntoViewIfNeeded()
          await expect(card.locator('.ih-tv--thumb')).toBeVisible()
          await card.screenshot({ path: `test-results/writing-visuals/thumb-${TASKS[i].row.category}-${theme}-${width}.png` })
        }
        await noOverflow(page)
      })

      for (const t of TASKS) {
        test(`full: ${t.row.category} · ${theme} · ${width}`, async ({ page }) => {
          await open(page, theme, width, `ieltsView=writing-task1&ieltsTest=${t.row.id}`)
          const vis = page.locator('.ih-tv--full').first()
          await expect(vis).toBeVisible({ timeout: 60_000 })
          await vis.screenshot({ path: `test-results/writing-visuals/full-${t.row.category}-${theme}-${width}.png` })
          // подписи осей и легенды внутри viewBox: ни один текст svg не выходит за рамку графика
          const out = await vis.evaluate((root) => {
            const bad = []
            for (const svg of root.querySelectorAll('svg.ih-tv__svg')) {
              const box = svg.getBoundingClientRect()
              for (const tx of svg.querySelectorAll('text')) {
                const r = tx.getBoundingClientRect()
                if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1) bad.push(tx.textContent)
              }
            }
            return bad
          })
          expect(out).toEqual([])
          await noOverflow(page)
        })
      }

      test(`drill и pick: раунды тренировки · ${theme} · ${width}`, async ({ page }) => {
        await open(page, theme, width, `ieltsView=writing-drills&ieltsTest=${DRILL.id}&ieltsType=line`)
        await page.getByRole('button', { name: /Начать|Start/ }).first().click({ timeout: 60_000 })
        for (let i = 0; i < 2; i++) {
          const vis = page.locator('.ih-tv--drill, .ih-tv--pick').first()
          await expect(vis).toBeVisible()
          const mode = (await vis.getAttribute('class')).includes('ih-tv--pick') ? 'pick' : 'drill'
          if (mode === 'pick') {
            // точки отмечаются с клавиатуры: Tab до точки, пробел
            const dot = vis.locator('[role="checkbox"]').nth(2)
            await dot.focus()
            await page.keyboard.press('Space')
            await expect(dot).toHaveAttribute('aria-checked', 'true')
          }
          await vis.screenshot({ path: `test-results/writing-visuals/${mode}-${theme}-${width}.png` })
          await noOverflow(page)
          // дальше — к следующему раунду: ответ и «Дальше» (форма — у плеера тренировок)
          if (mode === 'drill') await page.getByRole('button', { name: 'An overall rise' }).click().catch(() => {})
          else await page.getByRole('button', { name: /Проверить|Check/ }).click().catch(() => {})
          await page.getByRole('button', { name: /Дальше|Next|Далее/ }).click({ timeout: 5_000 }).catch(() => {})
        }
      })
    }
  }
})
