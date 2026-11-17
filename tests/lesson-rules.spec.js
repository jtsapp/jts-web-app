import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'

// Вкладка «Правила» в «Уроках» — правила обучения школы. Вход учеником без
// бэкенда (loginAsStudent подменяет его целиком): правилам сервер не нужен.
async function openRules(page, lang) {
  await loginAsStudent(page)
  if (lang) await page.addInitScript((l) => localStorage.setItem('lang', l), lang)
  await page.goto('/?screen=lessons&tab=rules')
}

const noHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

test('ссылка открывает правила целиком, без горизонтальной прокрутки', async ({ page }) => {
  await openRules(page)
  await expect(page.getByRole('heading', { name: 'Правила обучения JTS' })).toBeVisible()
  await expect(page.locator('.ls-tab--active')).toHaveText('Правила')
  // Порядок — как в PDF школы, свои три раздела (школа, техника, таблица) — в конце.
  await expect(page.locator('[data-rules-section]')).toHaveCount(12)
  await expect(page.locator('[data-rules-section]').first()).toHaveAttribute('data-rules-section', 'general')
  await expect(page.locator('[data-rules-section]').last()).toHaveAttribute('data-rules-section', 'table')
  await expect(page.locator('.lr-table tbody tr')).toHaveCount(10)
  // Цель диплинка одноразовая — из адреса она уходит сразу.
  await expect.poll(() => new URL(page.url()).searchParams.has('tab')).toBe(false)
  expect(await noHorizontalScroll(page)).toBe(true)
})

test('лимит переносов — по тарифу, групповой — «нельзя»', async ({ page }) => {
  await openRules(page)
  const tariffs = page.locator('.lr-tariff')
  await expect(tariffs).toHaveCount(4)
  await expect(page.locator('[data-tariff="sub"] .lr-tariff__v')).toHaveText('3 раза')
  await expect(page.locator('[data-tariff="ind"] .lr-tariff__v')).toHaveText('4 раза')
  await expect(page.locator('[data-tariff="pair"] .lr-tariff__v')).toHaveText('3 раза')
  await expect(page.locator('[data-tariff="group"]')).toHaveClass(/lr-tariff--none/)
  await expect(page.locator('.lr-stat__num').nth(1)).toHaveText('3–4 раза')
})

test('возврат ведёт на ту же оферту, что подвал', async ({ page }) => {
  await openRules(page)
  const link = page.locator('[data-rules-section="refund"] a', { hasText: 'Публичной оферте' })
  await expect(link).toHaveAttribute('href', /\/legal\/[\d-]+\/offer-ru\.pdf$/)
  await expect(link).toHaveAttribute('target', '_blank')
})

test('оглавление доводит до раздела и не меняет адрес', async ({ page }) => {
  await openRules(page)
  // Адрес сверяем после того, как приложение само убрало одноразовый `tab`.
  await expect.poll(() => new URL(page.url()).searchParams.has('tab')).toBe(false)
  const before = page.url()
  await page.getByRole('button', { name: 'Заморозка', exact: true }).click()
  await expect(page.locator('[data-rules-section="freeze"]')).toBeInViewport()
  expect(page.url()).toBe(before)
})

test('на телефоне 390 px — без горизонтальной прокрутки', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openRules(page)
  await expect(page.locator('.lr-tariff')).toHaveCount(4)
  expect(await noHorizontalScroll(page)).toBe(true)
  // Колонки «индивидуальный / групповой» на телефоне — в столбик.
  const cols = page.locator('[data-rules-section="late"] .lr-split__col')
  const [a, b] = [await cols.nth(0).boundingBox(), await cols.nth(1).boundingBox()]
  expect(b.y).toBeGreaterThan(a.y + a.height - 1)
})

test('в казахском интерфейсе правила по-казахски', async ({ page }) => {
  await openRules(page, 'kk')
  await expect(page.getByRole('heading', { name: 'JTS оқу ережелері' })).toBeVisible()
  await expect(page.locator('.ls-tab--active')).toHaveText('Ережелер')
  await expect(page.locator('[data-rules-section="refund"] a')).toHaveAttribute('href', /offer-kk\.pdf$/)
})
