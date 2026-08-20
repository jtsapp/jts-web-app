import { test, expect } from '@playwright/test'

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const OCCURRENCES = [
  { lessonId: 14, participantId: 14, lessonType: 'INDIVIDUAL_STANDARD', scheduledAt: '2026-08-01T03:09:00', durationMinutes: 60, teacherId: 112, teacherName: 'Test Teacher DEV', studentId: 116, studentName: 'Сабина', format: 'ONLINE', lessonStatus: 'IN_PROGRESS', participantStatus: 'SCHEDULED' },
  { lessonId: 13, participantId: 13, lessonType: 'INDIVIDUAL_STANDARD', scheduledAt: '2026-08-10T11:30:00', durationMinutes: 60, teacherId: 112, teacherName: 'Test Teacher DEV', studentId: 116, studentName: 'Сабина', format: 'ONLINE', lessonStatus: 'SCHEDULED', participantStatus: 'SCHEDULED' },
]
const SUMMARY = { conducted: 3, remaining: 2, cancelled: 1, rescheduled: 0 }
const MEET = 'https://meet.google.com/abc-defg-hij'

test('schedule renders in Уроки and an in-progress lesson opens the live screen', async ({ page }) => {
  // Logged-in session: token in storage + /api/auth/me returns a student user.
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сабина', role: 'STUDENT', languageLevel: 'A1' } })))
  await page.route('**/admin/lessons/occurrences', (r) => r.fulfill(json(OCCURRENCES)))
  await page.route('**/admin/lessons/summary', (r) => r.fulfill(json(SUMMARY)))
  // Карточка урока догружает ссылку на видеозвонок и тему из самого урока —
  // в списке occurrences их нет.
  await page.route('**/admin/lessons/14/sections', (r) => r.fulfill(json([
    { id: 1, title: 'Раздел 1', position: 0, materials: [{ id: 5, materialId: 5, title: 'Coffee—yes. Mondays—no. · 1-на-1' }] },
  ])))
  // The live screen (built out in #4) now fetches the lesson itself on open.
  await page.route('**/admin/lessons/14', (r) => r.fulfill(json({ id: 14, status: 'IN_PROGRESS', teacherName: 'Test Teacher DEV', meetingUrl: MEET, participants: [] })))

  await page.goto('/')

  // On narrow viewports the sidebar (and its «Уроки» nav item) is off-canvas
  // behind a hamburger drawer (see tests/mobile-shell.spec.js) — open it first
  // so the nav item is actually actionable. On desktop `.mtop` stays hidden via
  // CSS, so the wait below times out and we just proceed to the static sidebar.
  // Session restore renders a spinner first, so `.mtop__menu` isn't mounted
  // immediately after goto() — an un-awaited isVisible() check would race it.
  const menuButton = page.locator('.mtop__menu')
  await menuButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  if (await menuButton.isVisible()) {
    await menuButton.click()
  }

  // Open the «Уроки» section from the nav.
  await page.getByText('Уроки', { exact: true }).first().click()

  // Обе секции экрана: карточка идущего урока и календарь под ней.
  await expect(page.getByText('Мой график')).toBeVisible()
  await expect(page.getByText('Расписание')).toBeVisible()
  await expect(page.getByText('Test Teacher DEV').first()).toBeVisible()
  await expect(page.getByText('Урок начался')).toBeVisible()
  await expect(page.getByText('Coffee—yes. Mondays—no.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Google Meet' }).first()).toHaveAttribute('href', MEET)

  // Идущий урок открывается прямо из карточки — какой бы день ни был выбран
  // в календаре (урок начался 1 августа, а открыт сегодняшний день).
  await page.getByRole('button', { name: 'Присоединиться к уроку' }).click()
  await expect(page.getByText('Живой урок')).toBeVisible()
})
