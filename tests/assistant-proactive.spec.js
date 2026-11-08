import { test, expect } from '@playwright/test'
import { loginAsStudent } from './helpers/login.js'

// «Луна пишет первой» (ТЗ v2.0, 7.1–7.4; lib/assistant/useProactive.js, events.js): ученик пришёл — Луна сама пишет
// о плане дня, под ответом — кнопки события; перерыв — таймером у кнопки; «На сегодня всё» — итог по ответу сервера.
// Модель, план и ручки подменены: проверяется цепочка окна, а не Claude.
//
// В автотестах Луна первой не пишет, пока тест не попросит (window.__jtsProactive) — прежние спеки окна ждут закрытое
// окно. Часы страницы — Playwright clock: перерыв проматывается, а не ждётся пять минут.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const MORNING = new Date(2026, 10, 7, 10, 0)
// Трекер помнит приход по аккаунту (`user-<id>` из токена): нужен токен с userId, как у настоящего JWT. Подпись сайт не
// проверяет — это делает бэкенд, а он здесь подменён.
const TOKEN = `e2e.${Buffer.from(JSON.stringify({ userId: 7, role: 'STUDENT' })).toString('base64url')}.sig`

const PLAN = {
  state: 'ready',
  today: '2026-11-07',
  shortDay: null,
  stopDay: null,
  tasks: [
    { id: 1, date: '2026-11-07', kind: 'course', status: 'available', minutes: 30 },
    { id: 2, date: '2026-11-07', kind: 'practice', module: 'ai_tutor', status: 'available', minutes: 15, got: 0 },
  ],
}

async function setup(page, { level = null, reply = () => 'Привет, Айгерім! Сегодня 2 шага, около 45 минут. Начнём с урока курса.' } = {}) {
  await page.clock.install({ time: MORNING })
  await loginAsStudent(page, { level: 'A2' })
  await page.addInitScript(({ lvl, token }) => {
    window.__jtsProactive = true
    localStorage.setItem('jts_access_token', token)
    localStorage.setItem('lang', 'ru')
    localStorage.setItem('jts_assistant_met', '1')
    if (lvl) localStorage.setItem('jts_luna_proactive', lvl)
  }, { lvl: level, token: TOKEN })
  const calls = { chat: [], stop: 0, plan: 0 }
  await page.route(/\/mobile\/ge\/plan(\?|$)/, (r) => {
    calls.plan++
    return r.fulfill(json(PLAN))
  })
  await page.route(/\/mobile\/ge\/plan\/stop-day/, (r) => {
    calls.stop++
    return r.fulfill(json({ ...PLAN, stopDay: { moved: 2 }, stop: { done: 0, moved: 2 } }))
  })
  await page.route('**/api/assistant/chat', async (r) => {
    const body = JSON.parse(r.request().postData())
    calls.chat.push(body)
    await r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: reply(body) })
  })
  await page.route('**/api/assistant/speak', (r) => r.fulfill(json({ error: 'tts_failed' }, 502)))
  await page.route('**/api/tts?**', (r) => r.fulfill({ status: 502, body: '' }))
  return calls
}

const lastMark = (calls) => calls.chat.at(-1)?.messages.at(-1)?.content || ''

test('компьютер: пришёл — окно открывается само, начало дня с кнопками плана', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'на телефоне окно само не открывается — отдельный тест')
  const calls = await setup(page)
  await page.goto('/?screen=home')

  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog).toBeVisible({ timeout: 20_000 })
  await expect(dialog.getByText('Сегодня 2 шага')).toBeVisible()
  expect(lastMark(calls)).toMatch(/^\[событие: day_start; plan=ready; total=2; done=0; left=2; min=45; next=course; nmin=30\]$/)
  // Текстом: окно открылось без нажатия, звук без жеста ученика неуместен.
  expect(calls.chat.at(-1).voice).toBe(false)
  // Курсор не уведён в поле окна.
  expect(await page.evaluate(() => document.activeElement?.classList.contains('asst__input'))).toBe(false)

  const acts = dialog.locator('.asst__acts .asst__action')
  await expect(acts).toHaveText(['Начать: Урок курса', 'У меня мало времени'])

  // «У меня мало времени» — выбор минут без модели.
  await acts.nth(1).click()
  await expect(dialog.getByText('Сколько у тебя есть времени сегодня?')).toBeVisible()
  await expect(dialog.locator('.asst__acts').last().locator('.asst__action')).toHaveText(['10 мин', '20 мин', '30 мин'])
  expect(calls.chat).toHaveLength(1)
})

test('компьютер: «устала» — перерыв таймером у кнопки, по концу Луна пишет следующий шаг', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'перерыв проверяем на компьютере')
  const calls = await setup(page, {
    reply: (b) =>
      /устала/.test(b.messages.at(-1).content)
        ? 'Конечно, отдохни 5 минут.\n[[ASST_ACTION break 5 now]]'
        : /break_over/.test(b.messages.at(-1).content)
          ? 'Перерыв окончен. Дальше — урок курса.'
          : 'Привет! Сегодня 2 шага.',
  })
  await page.goto('/?screen=home')
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog.getByText('Сегодня 2 шага')).toBeVisible({ timeout: 20_000 })

  await dialog.locator('.asst__input').fill('я устала')
  await dialog.locator('.asst__input').press('Enter')
  // Перерыв начат: окно свернулось, у кнопки — таймер.
  const pill = page.locator('.asst__hint--break')
  await expect(pill).toBeVisible()
  await expect(pill).toContainText(/Перерыв · [45]:\d\d/)
  await expect(dialog).toHaveCount(0)

  await page.clock.fastForward('05:10')
  await expect(pill).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Луна' }).getByText('Перерыв окончен.')).toBeVisible({ timeout: 10_000 })
  expect(lastMark(calls)).toMatch(/^\[событие: break_over; plan=ready/)
  await expect(page.getByRole('dialog', { name: 'Луна' }).locator('.asst__acts').last().locator('.asst__action')).toHaveText([
    'Поехали: Урок курса',
    'Ещё 5 минут',
  ])
})

test('компьютер: «на сегодня всё» — день останавливает сервер, итог и «Нет, продолжу»', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'проверяем на компьютере')
  const calls = await setup(page, {
    reply: (b) =>
      /на сегодня всё/.test(b.messages.at(-1).content) ? 'Хорошо, засчитаю сделанное.\n[[ASST_ACTION stop now]]' : 'Привет! Сегодня 2 шага.',
  })
  await page.goto('/?screen=home')
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog.getByText('Сегодня 2 шага')).toBeVisible({ timeout: 20_000 })

  await dialog.locator('.asst__input').fill('на сегодня всё')
  await dialog.locator('.asst__input').press('Enter')
  await expect(dialog.getByText('Шагов плана сегодня не было — ничего страшного. Ещё 2 задачи перенесла на следующий учебный день.')).toBeVisible()
  expect(calls.stop).toBe(1)
  await expect(dialog.locator('.asst__acts').last().locator('.asst__action')).toHaveText(['Ок, до завтра', 'Нет, продолжу'])
  // Без обещаний напомнить.
  await expect(dialog).not.toContainText('напомню')
})

test('телефон: окно само не открывается — красная точка, а событие уходит, когда ученик откроет', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'телефонный вьюпорт')
  const calls = await setup(page)
  await page.goto('/?screen=home')
  const dot = page.locator('.asst__unread')
  await expect(dot).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('dialog', { name: 'Луна' })).toHaveCount(0)
  expect(calls.chat).toHaveLength(0)

  await page.getByRole('button', { name: 'Помощник' }).click()
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog.getByText('Сегодня 2 шага')).toBeVisible()
  expect(lastMark(calls)).toMatch(/^\[событие: day_start;/)
  await expect(dot).toHaveCount(0)
})

test('«Подсказки Луны: только по запросу» — первой не пишет', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'достаточно одного вьюпорта')
  const calls = await setup(page, { level: 'manual' })
  await page.goto('/?screen=home')
  await expect(page.getByRole('button', { name: 'Помощник' })).toBeVisible({ timeout: 20_000 })
  await page.clock.fastForward('00:15')
  await expect(page.getByRole('dialog', { name: 'Луна' })).toHaveCount(0)
  await expect(page.locator('.asst__unread')).toHaveCount(0)
  expect(calls.chat).toHaveLength(0)
})

test('Профиль: выбор «Подсказки Луны» сохраняется на устройстве', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'окно Профиля на компьютере; на телефоне — свой экран')
  await setup(page, { level: 'manual' })
  await page.goto('/?screen=profile')
  const row = page.locator('[data-key="luna"]')
  await expect(row).toBeVisible({ timeout: 20_000 })
  await expect(row).toContainText('Только по запросу')
  await row.click()
  await page.locator('[data-luna="sometimes"]').click()
  await expect(row).toContainText('Иногда')
  expect(await page.evaluate(() => localStorage.getItem('jts_luna_proactive'))).toBe('sometimes')
})

// Кейс 12 ТЗ v2.0 (этап 5): не заходил 2+ дня — план облегчает сам сайт (gapLite.js), Луна говорит об этом, под ответом
// «Начать» и «Вернуть обычный план».
test('не заходил 3 дня: сайт сам облегчает план до 15 минут, кнопка «Вернуть обычный план»', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'окно само открывается только на компьютере')
  const calls = await setup(page, { reply: () => 'Привет, Айгерім! Рада видеть. План на сегодня лёгкий — около 15 минут.' })
  // Прошлый заход — 3 дня назад: трекер помнит его по аккаунту.
  await page.addInitScript(() => localStorage.setItem('jts_luna_seen:user-7', JSON.stringify({ lastDay: '2026-11-04', startDay: '2026-11-04', lastAt: 0 })))
  const replans = []
  await page.route(/\/mobile\/ge\/plan\/replan/, (r) => {
    replans.push(JSON.parse(r.request().postData()))
    const minutes = replans.at(-1).minutes
    return r.fulfill(json(minutes ? { ...PLAN, shortDay: { minutes }, tasks: [PLAN.tasks[1], { ...PLAN.tasks[0], deferred: true, date: '2026-11-09' }] } : PLAN))
  })
  await page.goto('/?screen=home')
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog).toBeVisible({ timeout: 20_000 })
  expect(replans[0]).toEqual({ minutes: 15 })
  expect(lastMark(calls)).toMatch(/^\[событие: return_after_gap; days=3; .*lite=1\]$/)
  const acts = dialog.locator('.asst__acts .asst__action')
  await expect(acts.nth(1)).toHaveText('Вернуть обычный план')
  await acts.nth(1).click()
  await expect.poll(() => replans.at(-1)).toEqual({ minutes: null })
})

// Кейс 24 ТЗ v2.0 (этап 5): новый ученик без теста — Луна знакомится и ведёт на тест; «Показать, что где» — карта разделов.
test('новый ученик без теста: знакомство, «Пройти тест уровня» и карта разделов', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'окно само открывается только на компьютере')
  await page.clock.install({ time: MORNING })
  // Тест не пройден (уровня нет), аккаунт заведён после выхода теста v16 — значит, новый ученик.
  await loginAsStudent(page, { level: null, createdAt: '2026-11-06T08:00:00Z' })
  await page.addInitScript((token) => {
    window.__jtsProactive = true
    localStorage.setItem('jts_access_token', token)
    localStorage.setItem('lang', 'ru')
    localStorage.setItem('jts_assistant_met', '1')
  }, TOKEN)
  const chat = []
  await page.route('**/api/assistant/chat', async (r) => {
    chat.push(JSON.parse(r.request().postData()))
    await r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'Привет! Я Луна. Начнём с теста уровня.' })
  })
  await page.route('**/api/assistant/speak', (r) => r.fulfill(json({ error: 'tts_failed' }, 502)))
  await page.goto('/?screen=home')
  const dialog = page.getByRole('dialog', { name: 'Луна' })
  await expect(dialog).toBeVisible({ timeout: 20_000 })
  expect(chat.at(-1).messages.at(-1).content).toBe('[событие: first_visit]')
  const acts = dialog.locator('.asst__acts .asst__action')
  await expect(acts).toHaveText(['Пройти тест уровня', 'Показать, что где'])
  await acts.nth(1).click()
  await expect(dialog.getByText('Где что на сайте:')).toBeVisible()
  await expect(dialog.locator('.asst__msg--bot').last()).toContainText('Практика —')
  expect(chat).toHaveLength(1)
})
