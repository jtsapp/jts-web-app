import { test, expect } from '@playwright/test'

// Ролевой гейт диплинков живьём.
//
// `?screen=` до сих пор попадал в состояние без единой сверки с ролью, и
// преподаватель проваливался в ученический раздел, которого нет в его меню:
// выйти оттуда можно было только кнопкой «Назад» самого экрана. Юнит-тесты
// (src/lib/screenAccess.test.js) проверяют правило, а этот файл — что оно
// вообще ПОДКЛЮЧЕНО: и эффект-страж, и зажим на рендере живут в App.jsx.
//
// Проверяем по адресу, а не по разметке: приложение само пишет текущий экран в
// `?screen=` (PERSISTABLE_SCREENS в App.jsx), поэтому итоговый адрес — прямое
// свидетельство того, на каком экране человек оказался, и не зависит от того,
// успели ли догрузиться данные раздела.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

/** JWT с ролью в payload: подпись никто не проверяет (см. tests/live-lesson.spec.js). */
const jwt = (role) => {
  const p = Buffer.from(JSON.stringify({ role, userId: 1 })).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `h.${p}.s`
}

async function signIn(page, role) {
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), jwt(role))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 1, name: 'U', role, languageLevel: 'A1' } })))
  // Экран «Уроки» — домашний у преподавателя, и он гейтит рендер на Promise.all
  // из трёх запросов. Без заглушек тест ждал бы живой бэкенд (тот же приём и
  // та же причина, что в tests/live-lesson.spec.js).
  await page.route('**/admin/lessons/occurrences', (r) => r.fulfill(json([])))
  await page.route('**/admin/lessons/summary', (r) => r.fulfill(json({ conducted: 0, remaining: 0, cancelled: 0, rescheduled: 0 })))
  await page.route('**/mobile/trial-request', (r) => r.fulfill(json({ requested: false, requestedAt: null, teacherAssigned: true, managerAssigned: false })))
}

test('преподавателя с ученического экрана уводит на «Уроки»', async ({ page }) => {
  await signIn(page, 'TEACHER')

  await page.goto('/?screen=kingdom')

  // Адрес переписан стражем: на карте королевств преподаватель не остался.
  await expect(page).toHaveURL(/screen=lessons/)
  await expect(page).not.toHaveURL(/screen=kingdom/)
})

test('преподаватель остаётся в своей «Практике»', async ({ page }) => {
  await signIn(page, 'TEACHER')

  // Это его раздел в сайдбаре и цель кнопки «Открыть» из админки — гейт не
  // должен трогать ни его, ни разделы, куда та кнопка ведёт.
  await page.goto('/?screen=practice')

  await expect(page).toHaveURL(/screen=practice/)
})

test('ученика гейт не трогает: карта королевств — его экран', async ({ page }) => {
  await signIn(page, 'STUDENT')

  await page.goto('/?screen=kingdom')

  await expect(page).toHaveURL(/screen=kingdom/)
})
