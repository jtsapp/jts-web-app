import { test, expect } from '@playwright/test'

// Лимит оценок Shadowing снят (22.09.2026): ни счётчика «Оценок осталось N/10»,
// ни запертой «★ Оценить». Сервер в этом тесте на запрос остатка отвечает
// исчерпанным бюджетом — так отвечал прод до снятия лимита, — и экран обязан
// его даже не спрашивать: иначе старый бандл в кэше или возвращённый по ошибке
// запрос снова заперли бы кнопки.
//
// Микрофон и MediaRecorder подменены: настоящие в headless не завести. Запись
// отдаёт честный WAV с тоном — экран декодирует её через Web Audio перед
// отправкой, и пустой blob до сети просто не дошёл бы.
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

const SCORE = { overall: 88, accuracy: 90, fluency: 85, prosody: 80, completeness: 95, words: [], transcript: '', tip: '' }

test.describe('Шэдоуинг: оценка без лимита', () => {
  test('две фразы подряд оцениваются, остаток не запрашивается и не показывается', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('jts_access_token', 'test-token')
      // Секунда тона 440 Гц, 16 кГц mono 16-bit.
      function toneWav() {
        const rate = 16000
        const n = rate
        const buf = new ArrayBuffer(44 + n * 2)
        const v = new DataView(buf)
        const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
        str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
        v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
        v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true)
        v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true)
        for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 0.3 * 32767), true)
        return new Blob([buf], { type: 'audio/wav' })
      }
      class FakeRecorder {
        static isTypeSupported() { return true }
        constructor() {
          this.state = 'inactive'
          this.mimeType = 'audio/wav'
        }
        start() { this.state = 'recording' }
        stop() {
          this.state = 'inactive'
          this.ondataavailable?.({ data: toneWav() })
          this.onstop?.()
        }
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
    await page.route('**/api/practice/entitlement**', (r) =>
      r.fulfill(json({ configured: true, allowed: true, limit: null, completed: 0 })))

    const budgetAsks = []
    let assessed = 0
    await page.route('**/api/shadowing/assess', (r) => {
      if (r.request().method() !== 'POST') {
        budgetAsks.push(r.request().method())
        return r.fulfill(json({ configured: true, budget: { limit: 10, used: 10, remaining: 0 } }))
      }
      assessed += 1
      return r.fulfill(json(SCORE))
    })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))

    await page.goto('/?screen=shadowing')
    const mic = page.getByRole('button', { name: 'Записать фразу' })
    const row = (i) => page.locator('.sh-seg').nth(i)

    // Поэтапный показ: вторая фраза откроется, когда записана первая.
    for (const i of [0, 1]) {
      await mic.nth(i).click() // старт
      await expect(row(i).locator('.sh-seg__act.is-rec')).toBeVisible()
      await mic.nth(i).click() // стоп
      const assess = row(i).locator('.sh-seg__assess')
      await expect(assess).toBeEnabled()
      await assess.click()
      await expect(row(i).locator('.sh-score__ring')).toHaveText(/88/)
    }

    expect(assessed).toBe(2)
    expect(budgetAsks).toEqual([])
    await expect(page.getByText(/Оценок осталось/)).toHaveCount(0)
    expect(errors).toEqual([])
  })
})
