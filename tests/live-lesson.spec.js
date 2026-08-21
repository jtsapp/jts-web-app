import { test, expect } from '@playwright/test'

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// JWT with a role claim (header.payload.sig); payload = base64url({role})
const jwt = (role) => {
  const p = Buffer.from(JSON.stringify({ role, userId: 1 })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `h.${p}.s`
}

const OCC = (status) => ([
  { lessonId: 14, participantId: 14, lessonType: 'INDIVIDUAL_STANDARD', scheduledAt: '2026-08-02T03:00:00', durationMinutes: 60, teacherId: 112, teacherName: 'Test Teacher DEV', studentId: 116, studentName: 'Сабина', format: 'ONLINE', lessonStatus: status, participantStatus: 'SCHEDULED' },
])
const SUMMARY = { conducted: 0, remaining: 1, cancelled: 0, rescheduled: 0 }

// `liveStatus` defaults to the occurrence's status but can diverge: the schedule join
// gate only shows «Войти в класс» for IN_PROGRESS/PAUSED occurrences, so a SCHEDULED
// live screen (Start button) is reached by keeping the occurrence IN_PROGRESS while the
// live screen's own `/admin/lessons/14` load reports SCHEDULED — set from the first
// request, so there is no race with an already-loaded lesson.
async function enterLesson(page, { role, lessonStatus, liveStatus = lessonStatus }) {
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), jwt(role))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 1, name: 'U', role, languageLevel: 'A1' } })))
  await page.route('**/admin/lessons/occurrences', (r) => r.fulfill(json(OCC(lessonStatus))))
  await page.route('**/admin/lessons/summary', (r) => r.fulfill(json(SUMMARY)))
  await page.route('**/admin/lessons/14', (r) => r.fulfill(json({ id: 14, status: liveStatus, teacherName: 'Test Teacher DEV', participants: [] })))
  await page.goto('/')

  // On narrow viewports the sidebar (and its «Уроки» nav item) is off-canvas behind
  // a hamburger drawer — open it first so the nav item is actionable. On desktop
  // `.mtop` stays hidden via CSS, so the wait below times out and we proceed to the
  // static sidebar (see tests/lessons-schedule.spec.js for the same pattern).
  const menuButton = page.locator('.mtop__menu')
  await menuButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  if (await menuButton.isVisible()) {
    await menuButton.click()
  }

  await page.getByText('Уроки', { exact: true }).first().click()
  // «Войти в класс» (schedule.join) живёт в строке расписания — она видна лишь
  // после выбора дня, и тест падал здесь по таймауту ещё до этой ветки
  // (проверено прогоном на cf92e1f). На самом экране сразу доступна карточка
  // ближайшего урока с «Присоединиться к уроку» (schedule.joinLesson) — вход в
  // тот же живой урок, и именно им пользуется человек.
  await page.getByRole('button', { name: 'Присоединиться к уроку' }).first().click()
  // Признак, что мы в уроке, — кнопка выхода: заголовка «Живой урок» в шапке
  // больше нет, там теперь «уровень · урок» из каталога.
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()
}

test('teacher on an in-progress lesson sees lifecycle controls', async ({ page }) => {
  await enterLesson(page, { role: 'TEACHER', lessonStatus: 'IN_PROGRESS' })
  await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Завершить' })).toBeVisible()
})

// Значка состояния («Идёт») в шапке больше нет — владелец просил убрать, в
// макете «Онлайн-уроки» его тоже нет. Поэтому проверяем не значок, а то, что
// осталось наблюдаемым: ученик попал в урок и управления жизненным циклом у
// него нет. Именно отсутствие кнопок и было смыслом теста.
test('student on an in-progress lesson has no lifecycle controls', async ({ page }) => {
  await enterLesson(page, { role: 'STUDENT', lessonStatus: 'IN_PROGRESS' })
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Пауза' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Завершить' })).toHaveCount(0)
})

// Раньше здесь проверялся значок состояния — его в шапке больше нет. Что урок
// пошёл, видно по управлению: «Начать урок» сменяется парой «Пауза» /
// «Завершить», которых до старта не было.
test('teacher can start a scheduled lesson and gets lifecycle controls', async ({ page }) => {
  await enterLesson(page, { role: 'TEACHER', lessonStatus: 'IN_PROGRESS', liveStatus: 'SCHEDULED' })
  await page.route('**/admin/lessons/14/start', (r) => r.fulfill(json({ id: 14, status: 'IN_PROGRESS', teacherName: 'Test Teacher DEV', participants: [] })))
  await expect(page.getByRole('button', { name: 'Начать урок' })).toBeVisible()
  await page.getByRole('button', { name: 'Начать урок' }).click()
  await expect(page.getByRole('button', { name: 'Пауза' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Завершить' })).toBeVisible()
})
