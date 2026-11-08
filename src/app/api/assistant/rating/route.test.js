// Роут журнала оценок Луны: кого пускаем, что вычищаем до записи, режим и персона — с сервера, лимит, служебный GET.
// Проверка токена и база подменены: сами они проверены своими тестами.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let authResult
vi.mock('@/lib/auth-server.js', () => ({
  bearerFromRequest: (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null,
  verifyTokenStatus: async () => authResult,
  isTrustedInternalCaller: (req) => req.headers.get('x-internal-key') === 'secret-key',
}))

const saved = vi.hoisted(() => [])
const stored = vi.hoisted(() => ({ rows: [] }))
vi.mock('@/lib/db/assistantRatings.js', () => ({
  saveAnswerRating: vi.fn(async (profileId, e) => {
    saved.push({ profileId, e })
    return true
  }),
  // Как настоящий слой: profile_id наружу не отдаёт, только псевдоним от роута.
  loadRatingsForReview: vi.fn(async ({ pseudonym }) => stored.rows.map((r) => ({ id: r.id, student: pseudonym(r.profileId) }))),
}))
const { loadRatingsForReview } = await import('@/lib/db/assistantRatings.js')

const { POST, GET } = await import('./route.js')

const post = (body, token = 'student-token') =>
  POST(
    new Request('http://localhost/api/assistant/rating', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )

let uid = 100
const asStudent = () => {
  uid += 1
  authResult = { status: 'ok', user: { userId: uid, name: 'Айгерім', phone: '77001234567', email: 'a@mail.kz' } }
  return uid
}
const body = (over = {}) => ({ id: 'r0123456789abc', chat: 'c0123456789abc', turn: 1, seq: 1, question: 'Где домашка?', answer: 'Айгерім, домашка в «Уроках».', lang: 'ru', ...over })

beforeEach(() => {
  saved.length = 0
  stored.rows = []
  delete process.env.ASSISTANT_ANSWER_LOG
})
afterEach(() => {
  delete process.env.INTERNAL_API_KEY
})

describe('POST /api/assistant/rating', () => {
  it('без входа — 401, бэкенд лёг — 503', async () => {
    authResult = { status: 'unauthorized', user: null }
    expect((await post(body(), null)).status).toBe(401)
    authResult = { status: 'unavailable', user: null }
    expect((await post(body())).status).toBe(503)
    expect(saved).toHaveLength(0)
  })

  it('кривое тело — 400', async () => {
    asStudent()
    expect((await post('{oops')).status).toBe(400)
    expect((await post(body({ id: 'x' }))).status).toBe(400)
    expect((await post(body({ rating: 'down', reasons: ['rude'] }))).status).toBe(400)
  })

  it('пишет под ключом ученика, без имени и контактов, с режимом и персоной сервера', async () => {
    const id = asStudent()
    const res = await post(body({ question: 'Мой номер +7 700 123 45 67, когда Present Perfect?', lang: 'kk', rating: 'down', reasons: ['lang'], comment: 'пишите на a@mail.kz', mode: 'event', persona: 'luna' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ saved: true })
    expect(saved).toHaveLength(1)
    const { profileId, e } = saved[0]
    expect(profileId).toBe(`user-${id}`)
    expect(e).toMatchObject({
      question: 'Мой номер {телефон}, когда Present Perfect?',
      answer: '{имя}, домашка в «Уроках».',
      comment: 'пишите на {почта}',
      mode: 'teacher',
      opening: false,
      event: null,
      persona: 'aizere',
      rating: -1,
      reasons: ['lang'],
    })
  })

  it('служебный ход события — режим «событие» с его типом', async () => {
    asStudent()
    await post(body({ question: '[событие: day_start]' }))
    expect(saved[0].e).toMatchObject({ mode: 'event', opening: true, event: 'day_start' })
  })

  it('ASSISTANT_ANSWER_LOG=off — пишется только то, где есть слово ученика', async () => {
    process.env.ASSISTANT_ANSWER_LOG = 'off'
    asStudent()
    expect(await (await post(body())).json()).toEqual({ saved: false, reason: 'log_off' })
    expect(await (await post(body({ seq: 2, rating: 'up' }))).json()).toEqual({ saved: true })
    expect(await (await post(body({ seq: 3, clicked: 'open:lessons' }))).json()).toEqual({ saved: true })
    expect(saved).toHaveLength(2)
  })

  it('лимит — 300 записей за 10 минут на ученика', async () => {
    asStudent()
    for (let i = 0; i < 300; i++) expect((await post(body({ seq: i + 1 }))).status).toBe(200)
    const res = await post(body({ seq: 999 }))
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBeTruthy()
  })
})

describe('GET /api/assistant/rating', () => {
  const get = (qs = '', key = 'secret-key') =>
    GET(new Request(`http://localhost/api/assistant/rating${qs}`, { headers: key ? { 'x-internal-key': key } : {} }))

  it('без внутреннего ключа — 401', async () => {
    expect((await get('', null)).status).toBe(401)
    expect((await get('', 'wrong')).status).toBe(401)
  })

  it('по умолчанию — последние 7 дней; ученик — псевдоним, а не profile_id', async () => {
    process.env.INTERNAL_API_KEY = 'secret-key'
    stored.rows = [{ id: 'r1', profileId: 'user-7' }, { id: 'r2', profileId: 'user-7' }, { id: 'r3', profileId: 'user-8' }]
    const res = await get()
    expect(res.status).toBe(200)
    const data = await res.json()
    const span = new Date(data.to) - new Date(data.from)
    expect(span).toBe(7 * 24 * 60 * 60 * 1000)
    expect(data.rows[0].student).toMatch(/^[0-9a-f]{10}$/)
    expect(data.rows[0].student).toBe(data.rows[1].student)
    expect(data.rows[0].student).not.toBe(data.rows[2].student)
    expect(JSON.stringify(data)).not.toContain('user-7')
  })

  it('период — не больше 31 дня и не наоборот', async () => {
    expect((await get('?from=2026-10-01&to=2026-11-08')).status).toBe(400)
    expect((await get('?from=2026-11-08&to=2026-11-01')).status).toBe(400)
    expect((await get('?from=nonsense')).status).toBe(400)
    const ok = await get('?from=2026-11-01T00:00:00Z&to=2026-11-08T00:00:00Z')
    expect(ok.status).toBe(200)
    const args = loadRatingsForReview.mock.calls.at(-1)[0]
    expect(args.from.toISOString()).toBe('2026-11-01T00:00:00.000Z')
    expect(args.to.toISOString()).toBe('2026-11-08T00:00:00.000Z')
  })
})
