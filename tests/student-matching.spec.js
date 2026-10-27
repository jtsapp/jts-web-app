import { test, expect } from '@playwright/test'

// Подбор учителя стороной ученика (ТЗ 08, спека 2026-10-26-student-teacher-matching-design.md): онбординг →
// формат → время → учителя → заявки → «Подтвердите расписание». Бэкенд JTS подменён: карточка подбора живёт в
// замыкании и меняется ответами на POST — проверяем экраны, а не сервер. POST ловим регэкспом по адресу (с 18.10 к
// части адресов дописывается ?jts_app=student, и глоб без ** мимо них проходит).

const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'STUDENT', sub: '7', userId: 7 })).toString('base64url'), 'sig'].join('.')
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// Пояс фиксирован: сетка и слоты считаются в поясе ученика, и тест не должен зависеть от машины.
test.use({ timezoneId: 'Asia/Almaty' })

const mon = { weekday: 1, start: '14:00:00' } // пн 19:00 в Алматы
const wed = { weekday: 3, start: '14:00:00' } // ср 19:00
const fri = { weekday: 5, start: '13:00:00' } // пт 18:00

const BASE_CARD = {
  apiVersion: 2, id: 10, studentId: 7, studentName: 'Аружан', matchStatus: 'self', status: 'STUDENT_CHOOSING',
  tariff: 'General', lessonDuration: 60, lessonsPerWeek: 2, packageLessons: 8, guarantee: false, tariffConfirmed: true,
  requests: [], availableSlots: [], interests: [], proposedSlots: [], finalSlots: [], history: [], teacherChangesLeft: 2,
  timezone: 'Asia/Almaty', responsibleManagerName: 'Динара',
}
const TEACHER = {
  id: 3, name: 'Айгерим Сапарова', hasPhoto: false, yearsExperience: 4, specializations: ['General English'],
  about: 'Помогаю заговорить тем, кто боится говорить.', interests: ['Аниме'], formats: ['platform', 'own'],
  sinceYear: 2023, isNew: false, ageGroup: '26–35', languages: ['Казахский'], levels: ['A0', 'A1–A2'], matchPercent: 86,
  slots: [mon, wed], suggestedSlots: [mon, wed],
}
const GRID = {
  lessonDuration: 60, lessonsPerWeek: 2, formats: { platform: 2, books: 1, own: 1 },
  slots: [{ ...mon, teacherIds: [3, 4] }, { ...wed, teacherIds: [3] }, { ...fri, teacherIds: [4] }],
}
const proposedCard = () => ({
  ...BASE_CARD, matchStatus: 'confirm', status: 'AWAITING_CONFIRMATION', assignedTeacherId: 3,
  assignedTeacherName: TEACHER.name, deadline: '2030-01-01T12:00:00', proposedSlots: [mon, wed], availableSlots: [mon, wed],
  requests: [{ id: 1, teacherId: 3, teacherName: TEACHER.name, priority: 1, status: 'schedule_proposed', source: 'student',
    proposedSlots: [mon, wed], availableSlots: [mon, wed], expiresAt: '2030-01-01T12:00:00' }],
})

async function setup(page, card) {
  const st = { card: { ...BASE_CARD, ...card }, sent: null, asked: null, confirmed: 0 }
  await page.addInitScript((token) => localStorage.setItem('jts_access_token', token), jwt)
  // телефон и дата рождения — иначе вход «как через Google» уводит на шаг «Остался один шаг»
  const me = { userId: 7, name: 'Аружан', role: 'STUDENT', languageLevel: 'A2', isDemoAccount: false, phone: '77001234567', birthDate: '2000-01-01', createdAt: '2025-01-01T10:00:00' }
  await page.route(/justtostudy\.kz/, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname
    const method = req.method()
    if (path.endsWith('/student/matching') && method === 'GET') return route.fulfill(json(st.card))
    if (path.endsWith('/student/matching/handoffs')) return route.fulfill(json([]))
    if (path.endsWith('/student/matching/grid')) return route.fulfill(json(GRID))
    if (path.endsWith('/student/matching/candidates')) return route.fulfill(json([TEACHER]))
    if (/\/student\/matching\/teachers\/\d+\/photo$/.test(path)) return route.fulfill({ status: 404, body: '' })
    if (/\/student\/matching\/teachers\/\d+$/.test(path)) {
      return route.fulfill(json({ card: TEACHER, experience: [], education: null, certificates: [], languages: [], focus: [], methods: [] }))
    }
    if (path.endsWith('/student/matching/preferences') && method === 'PUT') {
      const body = req.postDataJSON()
      st.card = { ...st.card, availableSlots: body.slots, interests: body.interests, format: body.format }
      return route.fulfill(json(st.card))
    }
    if (path.endsWith('/student/matching/interests')) return route.fulfill(json(st.card))
    if (path.endsWith('/student/matching/requests') && method === 'POST') {
      st.sent = req.postDataJSON().teacherIds
      st.card = { ...st.card, matchStatus: 'sent', status: 'STUDENT_CHOOSING', requests: [{ id: 1, teacherId: 3,
        teacherName: TEACHER.name, priority: 1, status: 'sent', source: 'student', expiresAt: '2030-01-01T12:00:00' }] }
      return route.fulfill(json(st.card))
    }
    if (path.endsWith('/student/matching/ask-manager') && method === 'POST') {
      st.asked = req.postDataJSON()
      st.card = { ...st.card, matchStatus: st.card.tariffConfirmed ? 'ask' : 'tariff', askedAt: '2026-10-26T12:00:00',
        wish: st.asked.wish, deadline: '2030-01-01T12:00:00' }
      return route.fulfill(json(st.card))
    }
    if (path.endsWith('/student/matching/confirm') && method === 'POST') {
      st.confirmed += 1
      st.card = { ...st.card, matchStatus: 'done', status: 'TEACHER_ASSIGNED', finalSlots: st.card.proposedSlots, format: 'platform' }
      return route.fulfill(json(st.card))
    }
    if (path.includes('/user/language-level')) return route.fulfill(json({ languageLevel: 'A2' }))
    if (path.includes('/user/me')) return route.fulfill(json(me))
    if (path.includes('/admin/lessons/occurrences') || path.includes('/admin/homework/my')) return route.fulfill(json([]))
    return route.fulfill(json({}))
  })
  await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: me })))
  return st
}

test('ученик сам выбирает учителя: формат → время → учитель → заявки → расписание', async ({ page }) => {
  const st = await setup(page, {})
  await page.goto('/?screen=teacher-pick')
  await expect(page.getByText('Последний шаг — выберите своего учителя')).toBeVisible()
  await page.getByRole('button', { name: 'Выбрать учителя →' }).click()

  await page.getByRole('button', { name: /По программе платформы/ }).click()
  await page.getByRole('button', { name: 'Дальше: время →' }).click()

  await page.getByRole('button', { name: 'Пн 19:00: свободно 2' }).click()
  await expect(page.getByText(/нужно минимум 2 разных дня/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Показать учителей/ })).toBeDisabled()
  await page.getByRole('button', { name: 'Ср 19:00: свободно 1' }).click()
  await page.getByRole('button', { name: 'Показать учителей (1) →' }).click()

  await expect(page.getByText('Выберите до 3 учителей')).toBeVisible()
  await expect(page.getByText('(2 из 2)')).toBeVisible()
  await page.getByRole('button', { name: 'Выбрать', exact: true }).click()
  await page.getByRole('button', { name: 'Отправить заявки' }).click()

  await expect(page.getByText('Статус заявок')).toBeVisible()
  expect(st.sent).toEqual([3])
  expect(st.card.availableSlots).toEqual([mon, wed])

  st.card = proposedCard()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Подтвердите расписание' })).toBeVisible()
  await page.getByRole('button', { name: 'Подтвердить расписание' }).click()
  await expect(page.getByText(/Ваш учитель — Айгерим Сапарова/).first()).toBeVisible()
  expect(st.confirmed).toBe(1)
})

test('тариф не подтверждён: выбрать нельзя, а попросить менеджера — можно', async ({ page }) => {
  const st = await setup(page, { matchStatus: 'tariff', tariffConfirmed: false, status: 'ACTION_REQUIRED' })
  await page.goto('/?screen=teacher-pick')
  await expect(page.getByText('Ваш менеджер подтверждает тариф, обычно до 2 часов.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Выбрать учителя →' })).toBeDisabled()
  await page.getByRole('button', { name: 'Пусть менеджер подберёт' }).click()
  await page.getByPlaceholder(/учителя-мужчину/).fill('Хочу готовиться к собеседованию')
  await page.getByRole('button', { name: 'Отправить менеджеру' }).click()
  await expect(page.getByText('Менеджер подбирает учителя').first()).toBeVisible()
  expect(st.asked.wish).toBe('Хочу готовиться к собеседованию')
})

test('пункт «Мой учитель» в меню с цифрой, когда ждут действия', async ({ page }) => {
  await setup(page, proposedCard())
  await page.goto('/?screen=lessons')
  const item = page.locator('.sb__nav [data-nav="my-teacher"]')
  await expect(item).toBeVisible()
  await expect(item.locator('.sb__badge')).toHaveText('1')
})

test('360 px: сетка времени скроллится внутри блока, страница вбок не уезжает', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await setup(page, { format: 'platform' })
  await page.goto('/?screen=teacher-wizard')
  await page.getByRole('button', { name: 'Дальше: время →' }).click()
  await expect(page.getByRole('button', { name: 'Пн 19:00: свободно 2' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

// У .learn__main своих полей нет: до 1160 px (колонка подбора — 1120) заголовок и карточки ложились к краю окна.
test('узкий экран: у «Мой учитель» и мастера поле 16 px по бокам', async ({ page }) => {
  const gaps = (sel) => page.locator(sel).first().evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, right: document.documentElement.clientWidth - r.right }
  })
  for (const width of [375, 700]) {
    await page.setViewportSize({ width, height: 800 })
    await setup(page, proposedCard())
    await page.goto('/?screen=my-teacher')
    await expect(page.getByRole('heading', { name: 'Мой учитель' })).toBeVisible()
    expect((await gaps('.mt-wrap .mt-h1')).left).toBeGreaterThanOrEqual(16)
    const card = await gaps('.mt-wrap .mt-card')
    expect(card.left).toBeGreaterThanOrEqual(16)
    expect(card.right).toBeGreaterThanOrEqual(16)

    // мастер с чистой карточкой — с шага формата (поздний page.route перекрывает ранний)
    await setup(page, {})
    await page.goto('/?screen=teacher-wizard')
    await expect(page.getByRole('heading', { name: 'Как вы хотите заниматься?' })).toBeVisible()
    const opt = await gaps('.mt-wrap .mt-opt')
    expect(opt.left).toBeGreaterThanOrEqual(16)
    expect(opt.right).toBeGreaterThanOrEqual(16)
  }
})
