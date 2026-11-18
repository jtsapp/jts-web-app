import { test, expect } from '@playwright/test'
import { gateReply } from './helpers/login.js'

// Профиль ученика на компьютере и планшете — задача 214 доски (ТЗ и прототип 18.11.2026). Критерии приёмки ТЗ:
// на 1440×900 первый экран показывает шапку, учителя, цели и настройки занятий; высота страницы ≤ 1300 px при нуле
// интересов; уровень в содержимом профиля — один раз; больше пяти интересов выбрать нельзя; на планшете 820 пары карточек
// стоят рядом. Бэкенд JTS подменён целиком; подбор учителя — карточкой «учитель закреплён».

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'STUDENT', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
const SHOTS = process.env.PROFILE_SHOTS || ''
test.use({ timezoneId: 'Asia/Almaty' })

const CARD = {
  apiVersion: 2, id: 10, studentId: 7, studentName: 'Аружан', matchStatus: 'done', status: 'ASSIGNED',
  tariff: 'General', lessonDuration: 60, lessonsPerWeek: 2, packageLessons: 8, guarantee: false, tariffConfirmed: true,
  assignedTeacherId: 3, assignedTeacherName: 'Айгерим Сапарова', format: 'platform',
  requests: [], availableSlots: [], interests: [], proposedSlots: [], finalSlots: [{ weekday: 4, start: '13:00:00' }],
  history: [], teacherChangesLeft: 2, timezone: 'Asia/Almaty',
}

async function setup(page, { interests = [], level = 'A2' } = {}) {
  const st = { card: { ...CARD, interests }, saved: null }
  await page.addInitScript((token) => localStorage.setItem('jts_access_token', token), jwt)
  const me = { userId: 7, id: 7, name: 'Аружан', role: 'STUDENT', languageLevel: level, isDemoAccount: false, phone: '77001234567', birthDate: '2000-01-01', createdAt: '2025-01-01T10:00:00' }
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: me })))
  await page.route('**/api/profile?**', (r) => (r.request().method() === 'GET' ? r.fulfill(json({ profile: null })) : r.fallback()))
  await page.route(/justtostudy\.kz/, async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    const gate = gateReply(req.url())
    if (gate) return route.fulfill(json(gate))
    if (path.endsWith('/student/matching') && req.method() === 'GET') return route.fulfill(json(st.card))
    if (path.endsWith('/student/matching/handoffs')) return route.fulfill(json([]))
    if (/\/student\/matching\/teachers\/\d+\/photo$/.test(path)) return route.fulfill({ status: 404, body: '' })
    if (/\/student\/matching\/teachers\/\d+$/.test(path)) return route.fulfill(json({ card: { id: 3, name: 'Айгерим Сапарова', hasPhoto: false } }))
    if (path.endsWith('/student/matching/interests')) {
      st.saved = req.postDataJSON()
      st.card = { ...st.card, interests: st.saved.interests ?? st.saved }
      return route.fulfill(json(st.card))
    }
    if (path.endsWith('/user/language-level')) return route.fulfill(json({ languageLevel: level }))
    if (path.endsWith('/user/me')) return route.fulfill(json(me))
    if (path.includes('/mobile/profile-stats')) return route.fulfill(json({ streak: 4, lessonsPassed: 7 }))
    if (path.includes('/mobile/lesson-modules')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  return st
}

test.describe('профиль на компьютере', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) <= 560, 'на телефоне профиль — дизайн приложения (ProfilePhone)')

  test('1440×900: первый экран — шапка, учитель, цели, занятия; страница ≤ 1300 px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await setup(page)
    await page.goto('/?screen=profile')
    await expect(page.locator('.pf2-name')).toHaveText('Аружан', { timeout: 60_000 })
    await expect(page.locator('[data-section="teacher"]')).toContainText('Айгерим Сапарова')
    // уровень — один раз
    await expect(page.locator('.pf2-chip[data-chip="rank"]')).toHaveText('Рыцарь · A2')
    for (const sel of ['.pf2-hero', '[data-section="teacher"]', '[data-section="goals"]', '[data-section="lessons"]']) {
      const box = await page.locator(sel).boundingBox()
      expect(box.y + box.height, sel).toBeLessThanOrEqual(900)
    }
    const height = await page.locator('.pf2').evaluate((el) => el.getBoundingClientRect().height)
    expect(height).toBeLessThanOrEqual(1300)
    // шапка в одну строку: имя, цифры и «Редактировать» на одной высоте
    const who = await page.locator('.pf2-who').boundingBox()
    const edit = await page.locator('.pf2-edit').boundingBox()
    expect(Math.abs(who.y + who.height / 2 - (edit.y + edit.height / 2))).toBeLessThan(20)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/profile-1440.png`, fullPage: true })
  })

  test('820: пары карточек рядом, «Редактировать» в первой строке шапки, без прокрутки вбок', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 })
    await setup(page)
    await page.goto('/?screen=profile')
    await expect(page.locator('.pf2-name')).toBeVisible({ timeout: 60_000 })
    const teacher = await page.locator('[data-section="teacher"]').boundingBox()
    const interests = await page.locator('[data-section="interests"]').boundingBox()
    expect(Math.abs(teacher.y - interests.y)).toBeLessThan(1)
    expect(Math.abs(teacher.height - interests.height)).toBeLessThan(1)
    const name = await page.locator('.pf2-who').boundingBox()
    const edit = await page.locator('.pf2-edit').boundingBox()
    expect(edit.y).toBeLessThan(name.y + name.height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/profile-820.png`, fullPage: true })
  })

  test('интересы: пусто — предупреждение и выбор окном; шестой не выбрать; сохранение уходит на сервер', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const st = await setup(page)
    await page.goto('/?screen=profile')
    const card = page.locator('[data-section="interests"]')
    await expect(card.locator('.pf2-empty--warn')).toBeVisible({ timeout: 60_000 })
    await card.getByRole('button', { name: 'Выбрать до 5' }).click()
    const dialog = page.getByRole('dialog', { name: 'Мои интересы' })
    for (const name of ['Аниме', 'Музыка', 'Футбол', 'Книги', 'Наука']) await dialog.getByRole('button', { name, exact: true }).click()
    await expect(dialog.getByRole('button', { name: 'История', exact: true })).toBeDisabled()
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/profile-interests.png` })
    await dialog.getByRole('button', { name: 'Сохранить' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(card.locator('.pf2-pill.is-on')).toHaveCount(5)
    expect(JSON.stringify(st.saved)).toContain('Аниме')
  })

  test('подсказки Луны — переключатель в строке, выбор сохраняется на устройстве', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await setup(page)
    await page.goto('/?screen=profile')
    const manual = page.locator('[data-luna="manual"]')
    await expect(manual).toBeVisible({ timeout: 60_000 })
    await manual.click()
    await expect(manual).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => localStorage.getItem('jts_luna_proactive'))).toBe('manual')
  })
})
