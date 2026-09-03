import { test, expect } from '@playwright/test'

// Старт записи в шэдоуинге — не мгновенное действие: до создания MediaRecorder
// уходит запрос о праве на раздел (/api/practice/entitlement) и запрос
// микрофона. Кнопки при этом не disabled, а видимого отклика на первый тап нет
// (индикатор записи включается только после этих await'ов), поэтому второй тап
// по той же кнопке — обычное поведение пользователя, а не экзотика. Гард по
// recTargetRef его не ловил: ref заполняется уже после ожиданий, и второй тап
// заводил ВТОРОЙ MediaRecorder — первый оставался писать в никуда до ухода с
// экрана, плюс лишний round-trip к серверу.
//
// Микрофон и MediaRecorder подменяем: настоящие в headless-браузере не завести,
// а проверяем мы не запись, а число заведённых рекордеров.
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const QUOTA_DELAY_MS = 500

test.describe('Шэдоуинг: двойной тап по микрофону', () => {
  test('заводит ровно один MediaRecorder и один запрос о праве', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('jts_access_token', 'test-token')
      window.__recorders = 0
      class FakeRecorder {
        static isTypeSupported() { return true }
        constructor() {
          window.__recorders += 1
          this.state = 'inactive'
          this.mimeType = 'audio/webm'
        }
        start() { this.state = 'recording' }
        stop() { this.state = 'inactive'; this.onstop?.() }
      }
      window.MediaRecorder = FakeRecorder
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: async () => ({ active: true, getTracks: () => [] }) },
      })
    })
    await page.route('**/api/auth/me', (r) =>
      r.fulfill(json({ user: { id: 1, name: 'Асель', role: 'STUDENT', languageLevel: 'A1' } })))
    await page.route('**/api/practice/state', (r) => r.fulfill(json({ configured: true, ok: true })))
    // Право есть, но ответ медленный — это и есть окно между двумя тапами.
    let asked = 0
    await page.route('**/api/practice/entitlement**', async (r) => {
      asked += 1
      await new Promise((resolve) => setTimeout(resolve, QUOTA_DELAY_MS))
      await r.fulfill(json({ configured: true, allowed: true, limit: 12, completed: 0 }))
    })

    await page.goto('/?screen=shadowing')
    const record = page.getByRole('button', { name: 'Записать фразу' }).first()
    await expect(record).toBeVisible()
    // Ждём, пока отстреляется запрос при монтировании: считать нас интересует
    // только то, что добавили тапы.
    await page.waitForTimeout(QUOTA_DELAY_MS * 2)
    const askedBeforeTaps = asked

    // Два тапа в одном тике — до того, как первый успел дойти до рекордера.
    await record.evaluate((el) => { el.click(); el.click() })

    await expect.poll(() => page.evaluate(() => window.__recorders)).toBe(1)
    expect(asked - askedBeforeTaps).toBe(1)
  })
})
