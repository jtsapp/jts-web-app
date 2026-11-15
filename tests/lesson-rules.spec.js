import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'

// Вкладка «Правила» в «Уроках» — правила обучения школы. Вход учеником без
// бэкенда (loginAsStudent подменяет его целиком): правилам сервер не нужен.
async function openRules(page, lang) {
  await loginAsStudent(page)
  if (lang) await page.addInitScript((l) => localStorage.setItem('lang', l), lang)
  await page.goto('/?screen=lessons&tab=rules')
}

test('ссылка открывает правила целиком, без горизонтальной прокрутки', async ({ page }) => {
  await openRules(page)
  await expect(page.getByRole('heading', { name: 'Правила обучения' })).toBeVisible()
  await expect(page.locator('.ls-tab--active')).toHaveText('Правила')
  await expect(page.locator('[data-rules-section]')).toHaveCount(11)
  await expect(page.locator('.lr-table tbody tr')).toHaveCount(13)
  // Цель диплинка одноразовая — из адреса она уходит сразу.
  await expect.poll(() => new URL(page.url()).searchParams.has('tab')).toBe(false)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('оглавление доводит до раздела и не меняет адрес', async ({ page }) => {
  await openRules(page)
  // Адрес сверяем после того, как приложение само убрало одноразовый `tab`.
  await expect.poll(() => new URL(page.url()).searchParams.has('tab')).toBe(false)
  const before = page.url()
  await page.getByRole('button', { name: 'Заморозка обучения' }).click()
  await expect(page.locator('[data-rules-section="freeze"]')).toBeInViewport()
  expect(page.url()).toBe(before)
})

test('в казахском интерфейсе правила по-казахски', async ({ page }) => {
  await openRules(page, 'kk')
  await expect(page.getByRole('heading', { name: 'Оқу ережелері' })).toBeVisible()
  await expect(page.locator('.ls-tab--active')).toHaveText('Ережелер')
})
