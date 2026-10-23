import { test, expect } from '@playwright/test'

// Урок-файл на телефоне (видео владельца 21.10.2026): рамка урока занимала
// полэкрана — выше шапка, ряд значков, плашка статуса и вкладки, ниже «Темы /
// Группа», — и урок прокручивался внутри маленького окна. Теперь рамка почти
// в высоту экрана, а «Во весь экран» оставляет на экране только урок.

test.skip(({ viewport }) => viewport.width > 1000, 'кнопка и раскладка — только на узком экране')

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const jwt = (role) => {
  const p = Buffer.from(JSON.stringify({ role, userId: 116 })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `h.${p}.s`
}

// Время урока — от «сейчас»: урок, кончившийся больше трёх часов назад,
// «Войти в класс» не держит (см. live-lesson-material-switch.spec.js).
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

// Страница урока как у файлов курса: липкая шапка и длинная лента заданий.
const LESSON_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font:16px system-ui}header{position:sticky;top:0;background:#fff;padding:12px 16px;border-bottom:1px solid #eee}
section{padding:16px;border-bottom:1px solid #f0f0f0;height:180px}</style></head><body>
<header><small>Unit 2 · People and days / Lesson 6</small><h1 style="margin:4px 0 0;font-size:20px">The family tree</h1></header>
${Array.from({ length: 12 }, (_, i) => `<section>${i + 1}. ___ name is Aisha. (she)</section>`).join('')}
</body></html>`

async function openLesson(page) {
  await page.addInitScript((tok) => localStorage.setItem('jts_access_token', tok), jwt('STUDENT'))
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ user: { id: 116, name: 'Сабина', role: 'STUDENT', phone: '77001234567', languageLevel: 'A1' } })))
  await page.route('**/admin/lessons/occurrences', (r) => r.fulfill(json(OCC)))
  await page.route('**/admin/lessons/summary', (r) => r.fulfill(json({ conducted: 0, remaining: 1, cancelled: 0, rescheduled: 0 })))
  await page.route('**/mobile/trial-request', (r) => r.fulfill(json({ requested: false, requestedAt: null, teacherAssigned: true, managerAssigned: false })))
  await page.route('**/admin/lessons/14/sections', (r) => r.fulfill(json(SECTIONS)))
  await page.route('**/admin/lessons/14', (r) => r.fulfill(json({ id: 14, status: 'IN_PROGRESS', engine: 'FILE', lessonType: 'GROUP', groupName: 'Elementary', teacherId: 112, teacherName: 'Test Teacher DEV', participants: [] })))
  await page.route('**/student/lessons/14/materials/5/lesson-view/stages', (r) => r.fulfill(json([])))
  await page.route('**/student/lessons/14/materials/5/progress', (r) => r.fulfill(json({})))
  await page.route('**/student/lessons/14/materials/5/render**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: LESSON_HTML }))

  await page.goto('/')
  const menuButton = page.locator('.mtop__menu')
  await menuButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  if (await menuButton.isVisible()) await menuButton.click()
  await page.getByText('Уроки', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Присоединиться к уроку' }).first().click()
  // Первый тест на холодном next dev ждёт компиляцию урока дольше 5 с.
  await expect(page.locator('.lw-material-iframe')).toBeVisible({ timeout: 15_000 })
  // В заглушке нет моста — лоадер снимается по своему потолку ожидания.
  await expect(page.locator('.lw-frame-cover')).toHaveClass(/is-hidden/, { timeout: 15_000 })
}

test('рамка урока почти в высоту экрана, а не полэкрана', async ({ page }, info) => {
  await openLesson(page)
  const viewport = page.viewportSize()
  const box = await page.locator('.lw-material-frame').boundingBox()
  expect(box.height).toBeGreaterThan(viewport.height * 0.85)
  await page.screenshot({ path: info.outputPath('normal.png') })
})

test('«Во весь экран» отдаёт уроку весь экран, «Свернуть» возвращает', async ({ page }, info) => {
  await openLesson(page)
  const viewport = page.viewportSize()

  await page.getByRole('button', { name: 'Урок во весь экран' }).click()
  const box = await page.locator('.lw-material-frame').boundingBox()
  expect(box).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height })
  // Шапка урока под рамкой: в точке, где она была, теперь сам урок.
  const topInFrame = await page.evaluate(() => Boolean(document.elementFromPoint(40, 40)?.closest('.lw-material-frame')))
  expect(topInFrame).toBe(true)
  await page.screenshot({ path: info.outputPath('expanded.png') })

  await page.getByRole('button', { name: 'Свернуть урок' }).click()
  await expect(page.locator('.lw-material-frame')).not.toHaveClass(/is-expanded/)
  await expect(page.getByRole('button', { name: 'Урок во весь экран' })).toBeFocused()
})
