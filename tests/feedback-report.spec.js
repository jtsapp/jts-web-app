import { test, expect } from '@playwright/test'

// Отчёты о прогрессе: ссылка из мессенджера без входа и вкладка «Отчёты» в
// «Уроках». Бэкенда ручек ещё нет — отвечаем за него через page.route.
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const REPORT = {
  id: 2, periodNo: 2, lang: 'ru', studentName: 'Айша Тестова', teacherName: 'Test Teacher', level: 'A1',
  format: 'individual', unitsText: 'Unit 2 — Lessons 1–6', attendance: { done: 8, planned: 9 }, homeworkPct: 85,
  skills: [
    { key: 'speaking', score: 4, prev: 3 }, { key: 'listening', score: 3, prev: 3 }, { key: 'reading', score: 4, prev: 3 },
    { key: 'writing', score: 3, prev: 2 }, { key: 'grammar', score: 3, prev: 3 }, { key: 'vocabulary', score: 4, prev: 3 },
  ],
  strengths: ['Активен на уроке'], improvements: ['Времена глаголов'], motivation: 'Так держать!',
  badges: [{ type: 'skills_growth', n: 4 }], pastGoals: [{ text: 'Выучить числа до 100', result: 'achieved' }],
  nextGoals: ['Выучить 30 новых слов'], plan: 'Unit 3.', publishedAt: '2026-10-02T10:15:00+05:00',
}

test('ссылка из мессенджера открывает отчёт без входа и отмечает «открыт» один раз', async ({ page }) => {
  let opened = 0
  await page.route('**/feedback-reports/link/tok-123', (r) => r.fulfill(json(REPORT)))
  await page.route('**/feedback-reports/link/tok-123/opened', (r) => { opened += 1; return r.fulfill({ status: 204 }) })

  await page.goto('/report/tok-123')
  await expect(page.getByRole('heading', { name: 'Айша Тестова' })).toBeVisible()
  await expect(page.getByText('Отчёт о прогрессе · 2-й месяц (дни 31–60)')).toBeVisible()
  await expect(page.getByText('Рост в 4 навыках')).toBeVisible()
  await expect.poll(() => opened).toBe(1)
  // Без горизонтальной прокрутки и на телефоне.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('неизвестная ссылка — «недействительна»', async ({ page }) => {
  await page.route('**/feedback-reports/link/nope', (r) => r.fulfill(json({ messages: ['not found'] }, 404)))
  await page.goto('/report/nope')
  await expect(page.getByText('Ссылка недействительна. Попросите школу прислать отчёт ещё раз.')).toBeVisible()
})

test('образец /report/sample рисуется без бэкенда', async ({ page }) => {
  let calls = 0
  await page.route('**/feedback-reports/**', (r) => { calls += 1; return r.abort() })
  await page.goto('/report/sample')
  await expect(page.getByRole('heading', { name: 'Айша Тестова' })).toBeVisible()
  expect(calls).toBe(0)
})

test('вкладка «Отчёты»: список → отчёт → «просмотрен»', async ({ page }) => {
  let seen = 0
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Айша', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })))
  await page.route('**/mobile/feedback-reports', (r) => r.fulfill(json([
    { id: 2, periodNo: 2, level: 'A1', teacherName: 'Test Teacher', publishedAt: '2026-10-02T10:15:00+05:00', seenAt: null },
  ])))
  await page.route('**/mobile/feedback-reports/2', (r) => r.fulfill(json(REPORT)))
  await page.route('**/mobile/feedback-reports/2/seen', (r) => { seen += 1; return r.fulfill({ status: 204 }) })

  await page.goto('/?screen=lessons&tab=reports')
  // По классам, а не по тексту: заголовок карточки вместе с меткой — «2-й
  // месяцНовый», а слово «Новый» может встретиться где угодно на экране.
  const item = page.locator('.fbl__item', { hasText: '2-й месяц' })
  await expect(item.locator('.fbl__new')).toBeVisible()
  await item.click()
  await expect(page.getByRole('heading', { name: 'Айша Тестова' })).toBeVisible()
  await expect.poll(() => seen).toBe(1)
  await page.getByText('← Все отчёты').click()
  await expect(item).toBeVisible()
  await expect(page.locator('.fbl__new')).toHaveCount(0)
})
