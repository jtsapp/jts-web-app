import { test, expect } from '@playwright/test'

// Лендинг /landing: серверная страница рядом с SPA. Проверяем то, что на ней
// живое — вкладки разделов, лента преподавателей, вопросы и форма заявки.

test.beforeEach(async ({ page }) => {
  await page.goto('/landing')
})

test('первый экран и кнопки входа ведут в приложение', async ({ page }) => {
  await expect(page.locator('h1')).toContainText('по цене групповых')
  // На телефоне кнопки живут в нижней панели, на десктопе — в шапке.
  // from=landing — чтобы регистрация в приложении ушла в amoCRM с тегом «Лендинг».
  const start = page.locator('a:visible', { hasText: 'Начать обучение' }).first()
  await expect(start).toHaveAttribute('href', '/?screen=chat&from=landing')
  const login = page.locator('a:visible', { hasText: 'Войти' }).first()
  await expect(login).toHaveAttribute('href', '/?screen=login-password&from=landing')
})

test('кнопка «Начать обучение» → регистрация уходит с меткой лендинга и рекламы', async ({ page }) => {
  // Бэкенд замокан: проверяем, что приложение донесло метку до запроса
  // регистрации, а не то, что с ней сделает amoCRM.
  let initiate = null
  await page.route('**/registration/initiate', (r) => {
    initiate = r.request().postDataJSON()
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{"messages":["OTP sent"]}' })
  })

  await page.goto('/landing?utm_source=instagram&utm_campaign=autumn')
  const start = page.locator('a:visible', { hasText: 'Начать обучение' }).first()
  await expect(start).toHaveAttribute('href', '/?screen=chat&from=landing&utm_source=instagram&utm_campaign=autumn')
  await start.click()

  // Метка запомнена, а из адреса убрана — поделись им человек, она метила бы других.
  await expect(page.locator('.chat__input input')).toBeVisible({ timeout: 20000 })
  expect(page.url()).not.toContain('from=')

  await page.locator('.chat__input input').fill('Алия')
  await page.locator('.chat__input input').press('Enter')
  await page.locator('.auth-primary').click({ timeout: 15_000 })
  await page.locator('.phone-field input').fill('7471634118')
  await page.locator('.form-primary').click()
  await page.locator('.email-field').fill('aliya@example.com')
  await page.locator('.form-primary').click()
  await page.locator('.dob-field__part--day').fill('15')
  await page.locator('.dob-field__part--month').fill('03')
  await page.locator('.dob-field__part--year').fill('2000')
  await page.locator('.form-primary').click()

  await expect.poll(() => initiate).not.toBeNull()
  expect(initiate).toMatchObject({ from: 'landing', utmSource: 'instagram', utmCampaign: 'autumn' })
})

test('ҚАЗ переключает страницу на казахский с сервера', async ({ page }) => {
  await page.getByRole('link', { name: 'ҚАЗ' }).click()
  await expect(page).toHaveURL(/\?lang=kz$/)
  await expect(page.locator('h1')).toContainText('топтық бағамен')
  await expect(page.locator('.ld')).toHaveAttribute('lang', 'kk')
  await expect(page).toHaveTitle(/жеке сабақтар/)
  await page.getByRole('link', { name: 'РУС' }).click()
  await expect(page.locator('h1')).toContainText('по цене групповых')
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

test('форма: маска, ошибки, заявка — и сразу шаг почты в регистрации', async ({ page }) => {
  const form = page.locator('.ld-form')
  await form.scrollIntoViewIfNeeded()

  await form.getByRole('button', { name: 'Отправить заявку' }).click()
  await expect(form.locator('.ld-field__error')).toHaveCount(2)

  await form.getByPlaceholder('Как вас зовут?').fill('Алия')
  const phone = form.locator('input[name="phone"]')
  await phone.click()
  await expect(phone).toHaveValue('+7 (')
  await phone.pressSequentially('7471634118')
  await expect(phone).toHaveValue('+7 (747) 163-41-18')
  await form.getByText('IELTS', { exact: true }).click()

  const sent = page.waitForRequest((r) => r.url().endsWith('/api/landing/lead') && r.method() === 'POST')
  await form.getByRole('button', { name: 'Отправить заявку' }).click()
  expect((await sent).postDataJSON()).toMatchObject({ name: 'Алия', phone: '7471634118', goal: 'IELTS', lang: 'ru', website: '' })

  // Имя и номер уже даны — регистрация открывается на шаге почты, а код
  // передачи из адреса уже убран.
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 20000 })
  expect(page.url()).not.toContain('handoff')
  // Заявка в CRM могла не уйти — тогда тег «Лендинг» принесёт сама регистрация.
  expect(page.url()).not.toContain('from=')
  const attribution = await page.evaluate(() => JSON.parse(localStorage.getItem('jts_attribution')))
  expect(attribution?.from).toBe('landing')
})

test('битый код передачи — регистрация с начала', async ({ page }) => {
  await page.goto('/?screen=reg-email&handoff=broken')
  await expect(page.locator('.reg-header')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('input[type="email"]')).toHaveCount(0)
  expect(page.url()).not.toContain('handoff')
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
