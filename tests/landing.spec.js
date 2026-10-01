import { test, expect } from '@playwright/test'

// Лендинг /landing: серверная страница рядом с SPA. Проверяем то, что на ней
// живое — вкладки разделов, лента преподавателей, вопросы и форма заявки.

test.beforeEach(async ({ page }) => {
  await page.goto('/landing')
})

test('первый экран и кнопки входа ведут в приложение', async ({ page }) => {
  await expect(page.locator('h1')).toContainText('по цене групповых')
  // На телефоне кнопки живут в нижней панели, на десктопе — в шапке.
  const start = page.locator('a:visible', { hasText: 'Начать обучение' }).first()
  await expect(start).toHaveAttribute('href', '/?screen=chat')
  const login = page.locator('a:visible', { hasText: 'Войти' }).first()
  await expect(login).toHaveAttribute('href', '/?screen=login-password')
})

test('раздел выбирается руками, и таймер больше не листает', async ({ page }) => {
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(7)
  await tabs.filter({ hasText: 'Шэдоуинг' }).click()
  await expect(tabs.filter({ hasText: 'Шэдоуинг' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.ld-lib__panel.is-on h3')).toHaveText('Повторяй за знаменитостями — звучи как носитель')
  await expect(page.locator('.ld-lib__caption b')).toHaveText('04 / 07')
  // Выбор руками снимает автолистание: через срок таймера раздел тот же.
  await page.waitForTimeout(6500)
  await expect(tabs.filter({ hasText: 'Шэдоуинг' })).toHaveAttribute('aria-selected', 'true')
})

test('разделы листаются сами, пока блок на экране', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'в мобильном макете таймера нет — разделы листают только руками')
  await page.locator('.ld-lib').scrollIntoViewIfNeeded()
  const tabs = page.getByRole('tab')
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true', { timeout: 9000 })
})

test('вопросы: открыт один, второй закрывает первый', async ({ page }) => {
  const items = page.locator('.ld-qa')
  await expect(items.nth(0)).toHaveAttribute('open', '')
  await items.nth(2).locator('summary').click()
  await expect(items.nth(2)).toHaveAttribute('open', '')
  await expect(items.nth(0)).not.toHaveAttribute('open', '')
})

test('форма: маска телефона, ошибки и заявка в WhatsApp', async ({ page }) => {
  const form = page.locator('.ld-form')
  await form.scrollIntoViewIfNeeded()
  // window.open перехватываем: настоящий WhatsApp тесту не нужен.
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null } })

  await form.getByRole('button', { name: 'Отправить заявку' }).click()
  await expect(form.locator('.ld-field__error')).toHaveCount(2)

  await form.getByPlaceholder('Как вас зовут?').fill('Алия')
  const phone = form.locator('input[name="phone"]')
  await phone.click()
  await expect(phone).toHaveValue('+7 (')
  await phone.pressSequentially('7471634118')
  await expect(phone).toHaveValue('+7 (747) 163-41-18')
  await form.getByText('IELTS', { exact: true }).click()

  await form.getByRole('button', { name: 'Отправить заявку' }).click()
  await expect(form.locator('.ld-field__error')).toHaveCount(0)
  const opened = await page.evaluate(() => window.__opened)
  expect(opened).toHaveLength(1)
  const text = decodeURIComponent(new URL(opened[0]).searchParams.get('text'))
  expect(opened[0]).toMatch(/^https:\/\/wa\.me\/77471634118\?text=/)
  expect(text).toContain('Имя: Алия')
  expect(text).toContain('+7 (747) 163-41-18')
  expect(text).toContain('Цель: IELTS')
  await expect(form.getByRole('status')).toBeVisible()
})

test('лента преподавателей листается кнопкой', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'на телефоне кнопок нет — лента свайпается')
  const track = page.locator('.ld-teach__track')
  await track.scrollIntoViewIfNeeded()
  const prev = page.getByRole('button', { name: 'Предыдущие преподаватели' })
  await expect(prev).toBeDisabled()
  await page.getByRole('button', { name: 'Следующие преподаватели' }).click()
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100)
  await expect(prev).toBeEnabled()
})

test('без горизонтальной прокрутки страницы', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
