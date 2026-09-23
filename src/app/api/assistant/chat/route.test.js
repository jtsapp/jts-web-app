import { describe, it, expect, vi, beforeEach } from 'vitest'

// Тест про транспорт и доступ: кого пускаем, что уходит в модель, как ответ
// доезжает. Что скажет модель — не его дело, поэтому Anthropic и проверка
// токена замоканы целиком.
const calls = []
let streamImpl
vi.mock('@/lib/anthropic.js', () => ({
  hasAnthropicKey: () => process.env.ANTHROPIC_API_KEY !== '',
  chatStreamRich(args) {
    calls.push(args)
    return streamImpl()
  },
}))

let authResult
vi.mock('@/lib/auth-server.js', () => ({
  bearerFromRequest: (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null,
  verifyTokenStatus: async () => authResult,
}))

const { POST } = await import('./route.js')

const post = (body, token = 'student-token') =>
  POST(
    new Request('http://localhost/api/assistant/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )

const question = (userId = 1) => {
  authResult = { status: 'ok', user: { userId, name: 'Толик', languageLevel: 'A1' } }
  return {
    messages: [{ role: 'user', content: 'Почему мой ответ неверный?' }],
    screen: { id: 'lesson-workspace', text: 'Clare is reading. [поле: ученик ввёл «Is Cleare reading?»]' },
    lang: 'ru',
  }
}

describe('POST /api/assistant/chat', () => {
  beforeEach(() => {
    calls.length = 0
    process.env.ANTHROPIC_API_KEY = 'k'
    streamImpl = async function* () {
      yield { type: 'text', text: 'Опечатка: ' }
      yield { type: 'text', text: '«Cleare» → «Clare».' }
      yield { type: 'done', stopReason: 'end_turn' }
    }
  })

  it('стримит ответ модели текстом, без буферизации nginx', async () => {
    const res = await post(question(101))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(res.headers.get('x-accel-buffering')).toBe('no')
    expect(await res.text()).toBe('Опечатка: «Cleare» → «Clare».')
  })

  it('отдаёт модели правила, экран и профиль — и помечает стоимость как site_assistant', async () => {
    await (await post(question(102))).text()
    expect(calls).toHaveLength(1)
    const { systemPrompt, messages, task } = calls[0]
    expect(task).toBe('site_assistant')
    expect(systemPrompt).toContain('База знаний о сайте')
    const last = messages.at(-1).content
    expect(last).toContain('Имя ученика: Толик')
    expect(last).toContain('ученик ввёл «Is Cleare reading?»')
    expect(last).toContain('Вопрос ученика: Почему мой ответ неверный?')
    // Снимок экрана не должен попадать в системный промпт: тот кэшируется и
    // обязан быть одинаковым для всех учеников.
    expect(systemPrompt).not.toContain('Is Cleare reading?')
  })

  it('без токена — 401, модель не зовём', async () => {
    authResult = { status: 'unauthorized', user: null }
    const res = await post({ messages: [{ role: 'user', content: 'q' }] }, null)
    expect(res.status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  it('бэкенд авторизации лежит — 503, а не «сессия истекла»', async () => {
    authResult = { status: 'unavailable', user: null }
    expect((await post({ messages: [{ role: 'user', content: 'q' }] })).status).toBe(503)
  })

  it('без ключа модели — 503', async () => {
    process.env.ANTHROPIC_API_KEY = ''
    const body = question(103)
    expect((await post(body)).status).toBe(503)
    expect(calls).toHaveLength(0)
  })

  it('кривой JSON и пустой разговор — 400', async () => {
    question(104)
    expect((await post('{not json')).status).toBe(400)
    expect((await post({ messages: [] })).status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('после лимита — 429 с Retry-After', async () => {
    const body = question(105)
    for (let i = 0; i < 20; i += 1) await (await post(body)).text()
    const res = await post(body)
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(calls).toHaveLength(20)
  })

  it('обрыв модели посреди ответа — ошибка чтения, а не полуфраза как готовый ответ', async () => {
    streamImpl = async function* () {
      yield { type: 'text', text: 'Начало' }
      throw new Error('overloaded')
    }
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await post(question(106))
    await expect(res.text()).rejects.toThrow()
    errSpy.mockRestore()
  })
})
