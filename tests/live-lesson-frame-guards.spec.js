import { test, expect } from '@playwright/test'

// Вложенная в урок сторонняя активность (Wordwall) в настоящем браузере. Окна здесь настоящие и
// кросс-доменные: приложение (localhost) → страница урока (origin бэкенда) → виджет (третий origin).
// jsdom такое не воспроизводит, поэтому две вещи проверяются только здесь:
//  - подделка из виджета (он шлёт и в parent, и сразу в top) не доходит до окна приложения, а то, что
//    скрипт моста шлёт из самой страницы урока в window.parent, работает как прежде;
//  - право на полный экран доходит до виджета по всей цепочке рамок (allow у нашей рамки, у рамки
//    виджета его ставит страница урока).

test.skip(({ viewport }) => viewport.width < 1000, 'шапка со словарём и список тем — раскладка широкого экрана')

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const jwt = (role) => {
  const p = Buffer.from(JSON.stringify({ role, userId: 116 })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `h.${p}.s`
}

// Время урока — от «сейчас»: урок, кончившийся больше трёх часов назад, «Войти в класс» не держит
// (см. live-lesson-material-switch.spec.js).
const at = (minutes) => {
  const d = new Date(Date.now() + minutes * 60000)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`
}

const OCC = [
  { lessonId: 14, participantId: 14, lessonType: 'GROUP', scheduledAt: at(-10), durationMinutes: 60, teacherId: 112, teacherName: 'Test Teacher DEV', studentId: 116, studentName: 'Сабина', format: 'ONLINE', lessonStatus: 'IN_PROGRESS', participantStatus: 'SCHEDULED' },
]

const SECTIONS = [
  { id: 1, title: 'Раздел 1', position: 0, materials: [{ id: 5, materialId: 5, title: 'The family tree', materialType: 'INTERACTIVE_HTML', fileUrl: 'family-tree.html' }] },
]

const STAGES = ['Warm-up', 'Words', 'Practice', 'Wrap'].map((title, index) => ({ index, title, taskCount: 1 }))

// Как wordwall.net: чужой и для приложения, и для бэкенда. Адрес выдуманный — запрос перехватывает
// page.route, до сети дело не доходит.
const WIDGET_ORIGIN = 'https://widget.example'

// Рамка виджета — с теми же атрибутами, что ставит ей конструктор уроков: своя песочница и
// allow="fullscreen" (кнопка полного экрана самой активности).
const LESSON_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Lesson</title></head><body>
<h1>The family tree</h1>
<iframe src="${WIDGET_ORIGIN}/embed/1" title="Wordwall activity"
  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
  allow="fullscreen" allowfullscreen style="width:100%;height:200px;border:0"></iframe>
</body></html>`

const WIDGET_HTML = '<!doctype html><html><head><meta charset="utf-8"><title>Widget</title></head><body>widget</body></html>'

const lessonFrame = (page) => page.frames().find((frame) => frame.url().includes('/materials/5/render'))
const widgetFrame = (page) => page.frames().find((frame) => frame.url().startsWith(WIDGET_ORIGIN))

// Мост бэкенда говорит с приложением через window.parent страницы урока — единственный законный путь.
const fromLesson = (page, message) => lessonFrame(page).evaluate((m) => window.parent.postMessage(m, '*'), message)

// Виджет достаёт до приложения напрямую (top) и до страницы урока (parent), как любая сторонняя рамка.
const fromWidget = (page, message) => widgetFrame(page).evaluate((m) => {
  window.top.postMessage(m, '*')
  window.parent.postMessage(m, '*')
}, message)

// «Ничего не произошло» доказывается только ожиданием: сообщение между окнами доходит за миллисекунды.
const NOTHING_HAPPENS_MS = 400
const quiet = (page) => page.waitForTimeout(NOTHING_HAPPENS_MS)

async function openLesson(page) {
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), jwt('STUDENT'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сабина', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })))
  await page.route('**/admin/lessons/occurrences', (r) => r.fulfill(json(OCC)))
  await page.route('**/admin/lessons/summary', (r) => r.fulfill(json({ conducted: 0, remaining: 1, cancelled: 0, rescheduled: 0 })))
  await page.route('**/mobile/trial-request', (r) => r.fulfill(json({ requested: false, requestedAt: null, teacherAssigned: true, managerAssigned: false })))
  await page.route('**/mobile/saved-words**', (r) => r.fulfill(json([])))
  await page.route('**/admin/lessons/14/sections', (r) => r.fulfill(json(SECTIONS)))
  await page.route('**/admin/lessons/14', (r) => r.fulfill(json({ id: 14, status: 'IN_PROGRESS', engine: 'FILE', lessonType: 'GROUP', groupName: 'Elementary', teacherId: 112, teacherName: 'Test Teacher DEV', participants: [] })))
  await page.route('**/student/lessons/14/materials/5/lesson-view/stages', (r) => r.fulfill(json(STAGES)))
  await page.route('**/student/lessons/14/materials/5/progress', (r) => r.fulfill(json({})))
  await page.route('**/student/lessons/14/materials/5/render**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: LESSON_HTML }))
  await page.route(`${WIDGET_ORIGIN}/**`, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: WIDGET_HTML }))

  await page.goto('/')
  await page.getByText('Уроки', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Присоединиться к уроку' }).first().click()
  await expect(page.locator('.lw-material-iframe')).toBeVisible({ timeout: 15_000 })
  // В заглушке нет моста — лоадер снимается по своему потолку ожидания.
  await expect(page.locator('.lw-frame-cover')).toHaveClass(/is-hidden/, { timeout: 15_000 })
  await expect.poll(() => Boolean(widgetFrame(page)), { timeout: 15_000 }).toBe(true)
  await widgetFrame(page).waitForLoadState('load')
}

test('подделка стадии из виджета не двигает «Темы», стадия самой страницы урока — двигает', async ({ page }) => {
  await openLesson(page)
  const active = page.locator('.lv-topics__btn[aria-current="step"] .lv-topics__text')
  await expect(active).toHaveText('Warm-up')

  await fromWidget(page, { source: 'jts-lesson', type: 'stage', index: 3, total: 4 })
  await quiet(page)
  await expect(active).toHaveText('Warm-up')

  await fromLesson(page, { source: 'jts-lesson', type: 'stage', index: 2, total: 4 })
  await expect(active).toHaveText('Practice')
})

test('подделка «идёт проигрывание» из виджета не закрывает урок лоадером', async ({ page }) => {
  await openLesson(page)
  const cover = page.locator('.lw-frame-cover')

  await fromWidget(page, { source: 'jts-bridge', type: 'replay', busy: true, size: 40 })
  await quiet(page)
  await expect(cover).toHaveClass(/is-hidden/)

  // Контроль: тот же сигнал от страницы урока лоадер включает, а «свободен» — снимает.
  await fromLesson(page, { source: 'jts-bridge', type: 'replay', busy: true, size: 40 })
  await expect(cover).not.toHaveClass(/is-hidden/)
  await fromLesson(page, { source: 'jts-bridge', type: 'replay', busy: false, size: 0 })
  await expect(cover).toHaveClass(/is-hidden/)
})

test('слово от виджета в «Мои слова» не попадает, слово со страницы урока — попадает', async ({ page }) => {
  await openLesson(page)
  await page.getByRole('button', { name: 'Ваш словарь' }).click()
  // Личный список уже приехал: ответ сервера не затрёт слово, пришедшее сообщением.
  await expect(page.getByText(/Слова появятся здесь/)).toBeVisible()

  await fromWidget(page, { source: 'jts-lesson', type: 'vocab-add', word: 'forged', translation: 'подделка' })
  await quiet(page)
  await expect(page.getByText('forged')).toHaveCount(0)

  await fromLesson(page, { source: 'jts-lesson', type: 'vocab-add', word: 'serendipity', translation: 'везение' })
  await expect(page.getByText('serendipity')).toBeVisible()
  await expect(page.getByText('forged')).toHaveCount(0)
})

// fullscreenEnabled — ответ политики разрешений самого документа: true, только если право на полный
// экран выдано всеми рамками цепочки сверху вниз.
test('полный экран доходит до виджета: рамка урока и рамка активности его разрешают', async ({ page }) => {
  await openLesson(page)

  expect(await lessonFrame(page).evaluate(() => document.fullscreenEnabled)).toBe(true)
  expect(await widgetFrame(page).evaluate(() => document.fullscreenEnabled)).toBe(true)
})
