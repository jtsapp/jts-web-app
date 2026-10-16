import { test, expect } from '@playwright/test'

// Размер и место окна Луны (lib/assistant/placement.js): на компьютере окно
// компактное, разворачивается до размера телефона, кнопку и окно можно
// перетащить, место переживает перезагрузку. На телефоне — лист снизу, как был.
// Модель подменена: проверяется окно, а не ответы.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const SHOTS = process.env.SHOT_DIR

async function setup(page) {
  await page.addInitScript(() => {
    localStorage.setItem('jts_access_token', 'test-token')
    localStorage.setItem('lang', 'ru')
  })
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 7, name: 'Айгерім', role: 'STUDENT', phone: '77001234567', languageLevel: 'A2' } })),
  )
  await page.route('**/api/assistant/chat', (r) =>
    r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'Вы на Главной. Начните с домашки — она на сегодня.' }),
  )
}

const box = (loc) => loc.boundingBox()
// Окно появляется со сдвигом в 8px (asst-in) — мерить его можно только после.
const settled = (page) =>
  page.waitForFunction(() => {
    const p = document.querySelector('.asst__panel')
    return p && p.getAnimations().every((a) => a.playState === 'finished')
  })

test('компьютер: компактное окно, «телефон», перетаскивание и место после перезагрузки', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'перетаскивание — только на компьютере')
  await setup(page)
  await page.goto('/?screen=home')
  const launcher = page.getByRole('button', { name: 'Помощник' })
  await expect(launcher).toBeVisible({ timeout: 30000 })
  const vp = page.viewportSize()
  const b = await box(launcher)
  expect(Math.round(b.width)).toBe(48)
  expect(Math.round(vp.width - b.x - b.width)).toBe(24)

  await launcher.click()
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Начните с домашки')
  await settled(page)
  const small = await box(dialog)
  expect(Math.round(small.width)).toBe(320)
  expect(Math.round(small.height)).toBe(480)
  // Окно встало на место кнопки, сама кнопка спрятана.
  expect(Math.round(vp.width - small.x - small.width)).toBe(24)
  await expect(launcher).toBeHidden()
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/1-compact.png` })

  await dialog.getByRole('button', { name: 'Развернуть до размера телефона' }).click()
  const phone = await box(dialog)
  expect(Math.round(phone.width)).toBe(390)
  expect(Math.round(phone.height)).toBe(Math.min(844, vp.height - 68 - 12))
  // Верх окна — ниже группы «?, язык, колокольчик» кабинета.
  expect(phone.y).toBeGreaterThanOrEqual(68)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/2-phone.png` })
  await dialog.getByRole('button', { name: 'Сделать окно компактным' }).click()

  // Тянем за шапку (за аватар — середину узкой шапки занимают кнопки) в левый верхний угол.
  const head = dialog.locator('.asst__head')
  const h = await box(head)
  await page.mouse.move(h.x + 28, h.y + 24)
  await page.mouse.down()
  await page.mouse.move(400, 300, { steps: 8 })
  await page.mouse.move(200, 100, { steps: 8 })
  await page.mouse.up()
  const moved = await box(dialog)
  expect(moved.x).toBeLessThan(vp.width / 2)
  expect(moved.y).toBeLessThan(vp.height / 2)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/3-moved.png` })

  // Закрыли — кнопка встала в тот же угол; после перезагрузки там же.
  await dialog.getByRole('button', { name: 'Закрыть' }).click()
  const parked = await box(launcher)
  expect(Math.round(parked.x)).toBe(Math.round(moved.x))
  expect(Math.round(parked.y)).toBe(Math.round(moved.y))
  await page.reload()
  await expect(launcher).toBeVisible({ timeout: 30000 })
  const again = await box(launcher)
  expect(Math.round(again.x)).toBe(Math.round(moved.x))

  // Саму кнопку тоже можно утащить — и это не открывает окно.
  await page.mouse.move(again.x + 24, again.y + 24)
  await page.mouse.down()
  await page.mouse.move(vp.width - 100, vp.height - 100, { steps: 10 })
  await page.mouse.up()
  await expect(dialog).toHaveCount(0)
  const dropped = await box(launcher)
  expect(dropped.x).toBeGreaterThan(vp.width / 2)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/4-launcher-moved.png` })
})

test('телефон: окно — лист снизу, без перетаскивания и «телефона»', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'лист снизу — только на телефоне')
  await setup(page)
  await page.goto('/?screen=home')
  const launcher = page.getByRole('button', { name: 'Помощник' })
  await expect(launcher).toBeVisible({ timeout: 30000 })
  await launcher.click()
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog).toBeVisible()
  await settled(page)
  const vp = page.viewportSize()
  const d = await box(dialog)
  // Лист снизу во всю ширину (полпикселя — округление браузера).
  expect(Math.abs(d.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(d.width - vp.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(d.y + d.height - vp.height)).toBeLessThanOrEqual(1)
  await expect(dialog.getByRole('button', { name: 'Развернуть до размера телефона' })).toHaveCount(0)
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/5-mobile.png` })
})
