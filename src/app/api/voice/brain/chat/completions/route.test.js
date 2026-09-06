import { describe, it, expect, vi, beforeEach } from 'vitest'

// Мозг зовёт только голосовой агент, поэтому мокаем Anthropic целиком: тест
// про транспорт (как ответ доезжает), а не про то, что скажет модель.
vi.mock('@/lib/anthropic.js', () => ({
  hasAnthropicKey: () => true,
  async *chatStreamRich() {
    yield { type: 'text', text: 'Hi' }
    yield { type: 'text', text: ' there' }
  },
}))

const { POST } = await import('./route.js')

const call = () =>
  POST(
    new Request('http://localhost/api/voice/brain/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test-key' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
    }),
  )

describe('POST /api/voice/brain/chat/completions', () => {
  beforeEach(() => {
    process.env.INTERNAL_API_KEY = 'test-key'
  })

  // Регрессия на инцидент 06.09.2026. Перед приложением стоит nginx, и с
  // включённым по умолчанию proxy_buffering он копил весь SSE и отдавал агенту
  // одним куском: LiveKit ждал полной генерации, llm_ttft рос с 0.86 с до
  // 3.1–4.8 с на ход. Заголовок — единственное, что это чинит со стороны
  // приложения, и потерять его нельзя молча.
  it('просит nginx не буферизовать поток', async () => {
    const res = await call()
    expect(res.headers.get('x-accel-buffering')).toBe('no')
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })

  it('отдаёт дельты по мере поступления, а не одним куском', async () => {
    const res = await call()
    const reader = res.body.getReader()
    const dec = new TextDecoder()

    // Первый токен модели должен приехать ДО того, как поток закрылся.
    let sawText = false
    let sawDone = false
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const chunk = dec.decode(value, { stream: true })
      if (chunk.includes('[DONE]')) sawDone = true
      if (chunk.includes('"content":"Hi"')) {
        expect(sawDone).toBe(false)
        sawText = true
      }
    }
    expect(sawText).toBe(true)
  })

  it('без верного ключа отвечает 401', async () => {
    process.env.INTERNAL_API_KEY = 'other-key'
    const res = await call()
    expect(res.status).toBe(401)
  })
})
