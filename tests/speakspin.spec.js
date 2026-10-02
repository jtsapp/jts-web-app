import { test, expect } from '@playwright/test'

// SpeakSpin (?screen=speakspin): барабан → подготовка → запись → разбор.
//
// Микрофон и разбор подменяем: в CI нет ни микрофона, ни ключей Azure/Claude.
// Проверяем поведение экрана — что цикл проходит, что карточка разбора
// рисует ответ сервера, что отказ лимита виден словами.

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

// Микрофон, которого в CI нет. Движок прототипа ждёт от MediaRecorder onstart
// (без него сторож через 8 с считает запись прерванной) и смотрит readyState
// дорожек, поэтому подделка подробнее, чем в «Ситуациях». Запись — настоящий
// WAV: перед отправкой её гонят через decodeAudioData.
const fakeMicrophone = (page) =>
  page.addInitScript(() => {
    const track = { readyState: 'live', stop() {}, onended: null, onmute: null }
    const stream = { getTracks: () => [track], getAudioTracks: () => [track], active: true }
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => stream },
    })
    const tone = (seconds = 2, rate = 16000) => {
      const n = Math.floor(seconds * rate)
      const buf = new ArrayBuffer(44 + n * 2)
      const view = new DataView(buf)
      const str = (off, text) => {
        for (let i = 0; i < text.length; i++) view.setUint8(off + i, text.charCodeAt(i))
      }
      str(0, 'RIFF')
      view.setUint32(4, 36 + n * 2, true)
      str(8, 'WAVE')
      str(12, 'fmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, 1, true)
      view.setUint32(24, rate, true)
      view.setUint32(28, rate * 2, true)
      view.setUint16(32, 2, true)
      view.setUint16(34, 16, true)
      str(36, 'data')
      view.setUint32(40, n * 2, true)
      for (let i = 0; i < n; i++) view.setInt16(44 + i * 2, Math.sin(i / 8) * 3000, true)
      return new Blob([buf], { type: 'audio/wav' })
    }
    class FakeRecorder {
      static isTypeSupported() {
        return true
      }
      constructor() {
        this.state = 'inactive'
        this.mimeType = 'audio/wav'
      }
      start() {
        this.state = 'recording'
        setTimeout(() => this.onstart?.(), 10)
        setTimeout(() => this.ondataavailable?.({ data: tone() }), 20)
      }
      stop() {
        this.state = 'inactive'
        setTimeout(() => this.onstop?.(), 10)
      }
    }
    window.MediaRecorder = FakeRecorder
  })

const asStudent = async (page) => {
  await page.addInitScript(() => localStorage.setItem('jts_access_token', 'test-token'))
  await page.route('**/api/auth/me', (r) =>
    r.fulfill(json({ user: { id: 116, name: 'Сакен', role: 'STUDENT', languageLevel: 'B1' } })),
  )
}

const FEEDBACK = (attemptId) => ({
  schemaVersion: '1.0',
  attemptId,
  rubricVersion: 'jts-speaking-1',
  status: 'assessed',
  analysisScope: 'audio',
  transcript: { text: 'I use my phone every day to check messages and I like it.' },
  summary: 'Понятный ответ по теме.',
  criteria: {
    taskResponse: { score: 4, explanation: 'Тема раскрыта.', evidence: [{ quote: 'check messages' }] },
    fluencyCoherence: { score: 3, explanation: 'Есть паузы.', evidence: [] },
    grammar: { score: 3, explanation: 'Простые предложения.', evidence: [] },
    vocabulary: { score: 3, explanation: 'Базовая лексика.', evidence: [] },
    pronunciation: { score: 4, explanation: 'Понятно.', evidence: [] },
  },
  strengths: [{ text: 'Слова из темы в деле.', evidence: [{ quote: 'check messages' }] }],
  priorityFixes: [{ quote: 'I like it', better: 'I really enjoy it', why: 'Живее.' }],
  vocabularyUpgrades: [],
  improvedAnswer: 'I use my phone every day to check messages, and I really enjoy it.',
  nextAttemptFocus: 'Добавь пример.',
  metrics: { recordingDurationMs: 2000, speechDurationMs: null, wordCount: 12, wordsPerMinute: null },
  limitations: [],
  reasons: [],
})

const open = async (page) => {
  await page.goto('/?screen=speakspin')
  await expect(page.locator('#jts-spin')).toBeVisible({ timeout: 20000 })
}

// Крутим, пропускаем анимацию и подготовку, пишем и останавливаем.
const recordTake = async (page) => {
  await page.locator('#jts-spin').click()
  await page.locator('#jts-skip').click().catch(() => {})
  await expect(page.locator('#jts-active')).toBeVisible()
  await expect(page.locator('#jts-prompt')).not.toBeEmpty()
  await page.locator('#jts-timer-action').click() // «Начать ответ сейчас»
  await expect(page.locator('.ss')).toHaveAttribute('data-state', 'recording')
  await page.locator('#jts-timer-action').click() // «Завершить»
  await expect(page.locator('#jts-review')).toBeVisible()
}

test('баннер в «Говорении» ведёт на экран', async ({ page }) => {
  await asStudent(page)
  await page.goto('/?screen=practice')
  const banner = page.locator('#sec-speakspin')
  await page.locator('.pk-skill--speaking').click({ timeout: 20000 })
  await expect(banner).toBeVisible({ timeout: 20000 })
  await banner.locator('.pk-banner__cta').click()
  await expect(page.locator('#jts-spin')).toBeVisible({ timeout: 20000 })
})

test('полный цикл: тема → запись → ИИ-разбор', async ({ page }) => {
  await fakeMicrophone(page)
  await asStudent(page)
  let sent = null
  await page.route('**/api/practice/speakspin/assess', async (route) => {
    const req = route.request()
    sent = { auth: req.headers().authorization, body: req.postDataBuffer()?.toString('latin1') || '' }
    const meta = JSON.parse(sent.body.match(/name="metadata"\r\n\r\n([^\r]*)/)[1])
    return route.fulfill(json(FEEDBACK(meta.attemptId)))
  })
  await open(page)
  await recordTake(page)
  await expect(page.locator('#jts-analyze')).toBeEnabled()
  await page.locator('#jts-analyze').click()
  await expect(page.locator('#jts-feedback')).toBeVisible({ timeout: 20000 })
  await expect(page.locator('#jts-feedback .criteria-grid .criterion')).toHaveCount(5)
  await expect(page.locator('#jts-feedback')).toContainText('I really enjoy it')
  expect(sent.auth).toBe('Bearer test-token')
  // Текст темы сервер берёт сам по topicId — клиент его не шлёт.
  expect(sent.body).toContain('"topicId"')
  expect(sent.body).not.toContain('"prompt"')
})

test('лимит разборов виден словами', async ({ page }) => {
  await fakeMicrophone(page)
  await asStudent(page)
  await page.route('**/api/practice/speakspin/assess', (route) =>
    route.fulfill(json({ error: 'daily_limit_reached', budget: { limit: 20, used: 20, remaining: 0 } }, 429)),
  )
  await open(page)
  await recordTake(page)
  await page.locator('#jts-analyze').click()
  await expect(page.locator('#jts-ai-status')).toContainText('Лимит ИИ-разборов')
})
