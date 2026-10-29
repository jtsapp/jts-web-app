import { test, expect } from '@playwright/test'
import { openSection } from './helpers/nav.js'

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// Время урока — от «сейчас», а не датой: с 01.10.2026 урок «идёт», чей конец больше трёх часов назад, считается
// забытым (liveNow.js, LIVE_STALE_AFTER_MS) и «Войти в класс» не держит — фикстуры с датами из августа протухли.
const at = (minutes) => {
  const d = new Date(Date.now() + minutes * 60000)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

const OCCURRENCES = [
  { lessonId: 14, participantId: 14, lessonType: 'INDIVIDUAL_STANDARD', scheduledAt: at(-10), durationMinutes: 60, teacherId: 112, teacherName: 'Test Teacher DEV', studentId: 116, studentName: 'Сабина', format: 'ONLINE', lessonStatus: 'IN_PROGRESS', participantStatus: 'SCHEDULED' },
  { lessonId: 13, participantId: 13, lessonType: 'INDIVIDUAL_STANDARD', scheduledAt: at(2 * 24 * 60), durationMinutes: 60, teacherId: 112, teacherName: 'Test Teacher DEV', studentId: 116, studentName: 'Сабина', format: 'ONLINE', lessonStatus: 'SCHEDULED', participantStatus: 'SCHEDULED' },
]
const SUMMARY = { conducted: 3, remaining: 2, cancelled: 1, rescheduled: 0 }
const MEET = 'https://meet.google.com/abc-defg-hij'

test('schedule renders in Уроки and an in-progress lesson opens the live screen', async ({ page }) => {
  // Logged-in session: token in storage + /api/auth/me returns a student user.
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сабина', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })))
  await page.route('**/admin/lessons/occurrences', (r) => r.fulfill(json(OCCURRENCES)))
  await page.route('**/admin/lessons/summary', (r) => r.fulfill(json(SUMMARY)))
  // Экран сначала спрашивает, есть ли у человека преподаватель: без него вместо
  // расписания рисуется карточка «скоро с вами свяжется менеджер». Здесь ученик
  // с преподавателем — расписание остаётся расписанием.
  await page.route('**/mobile/trial-request', (r) => r.fulfill(json({ requested: false, requestedAt: null, teacherAssigned: true, managerAssigned: false })))
  // Карточка урока догружает ссылку на видеозвонок и тему из самого урока —
  // в списке occurrences их нет.
  await page.route('**/admin/lessons/14/sections', (r) => r.fulfill(json([
    { id: 1, title: 'Раздел 1', position: 0, materials: [{ id: 5, materialId: 5, title: 'Coffee—yes. Mondays—no. · 1-на-1' }] },
  ])))
  // The live screen (built out in #4) now fetches the lesson itself on open.
  await page.route('**/admin/lessons/14', (r) => r.fulfill(json({ id: 14, status: 'IN_PROGRESS', teacherName: 'Test Teacher DEV', meetingUrl: MEET, participants: [] })))

  await page.goto('/')

  // Раздел «Уроки» — как человек на этой ширине: на телефоне вкладкой нижней панели, на планшете через
  // бургер, на компьютере пунктом сайдбара (tests/helpers/nav.js).
  await openSection(page, 'Уроки')

  // Телефон — дизайн мобильного приложения: неделя и карточки уроков дня, без «Мой график» и счётчиков
  // (src/mobile/lessons.css). Вход в класс — кнопкой в карточке урока сегодняшнего дня.
  const phone = (page.viewportSize()?.width ?? 1440) <= 560
  if (phone) {
    await expect(page.locator('.cal--week')).toBeVisible()
    await expect(page.getByText('Мой график')).toBeHidden()
    await expect(page.locator('.sch-row').getByText('Test Teacher DEV')).toBeVisible()
    await expect(page.locator('.sch-row .sch-badge--inProgress')).toBeVisible()
    await expect(page.locator('.sch-row').getByRole('link', { name: 'Google Meet' })).toHaveAttribute('href', MEET)
    // Стрелка листает неделю: следующая неделя без уроков сегодняшнего дня.
    await page.getByRole('button', { name: 'Следующая неделя' }).click()
    await expect(page.getByText('В этот день занятий нет')).toBeVisible()
    await page.getByRole('button', { name: 'Предыдущая неделя' }).click()
    await page.locator('.sch-row').getByRole('button', { name: 'Войти в класс' }).click()
  } else {
    // Обе секции экрана: карточка идущего урока и календарь под ней.
    await expect(page.getByText('Мой график')).toBeVisible()
    await expect(page.getByText('Расписание')).toBeVisible()
    await expect(page.getByText('Test Teacher DEV').first()).toBeVisible()
    await expect(page.getByText('Урок начался')).toBeVisible()
    await expect(page.getByText('Coffee—yes. Mondays—no.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Google Meet' }).first()).toHaveAttribute('href', MEET)

    // Идущий урок открывается прямо из карточки «Мой график», а не только из дня в календаре.
    await page.getByRole('button', { name: 'Присоединиться к уроку' }).click()
  }
  await expect(page.getByText('Живой урок')).toBeVisible()
})
