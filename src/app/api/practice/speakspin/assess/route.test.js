// Разбор ответа «SpeakSpin»: порядок отказов, тема только из каталога,
// повтор попытки без второго списания, «мало речи» без грейдера, контракт v1.
//
// Мокаются платные внешние сервисы (Azure, Soniox, Anthropic), проверка
// токена у бэкенда и бюджет (фейковый счётчик в памяти).

import { describe, it, expect, vi, beforeEach } from 'vitest'

const ext = vi.hoisted(() => ({
  azure: true,
  soniox: false,
  fast: null,
  pa: null,
  graded: null,
  db: true,
  used: 0,
  limit: 20,
  calls: [],
}))

vi.mock('@/lib/ielts/azure-pronunciation.js', () => ({
  isAzureSpeechConfigured: () => ext.azure,
  transcribeWavFast: vi.fn(async () => {
    ext.calls.push('fast')
    return typeof ext.fast === 'function' ? ext.fast() : ext.fast
  }),
  assessPronunciationChunked: vi.fn(async () => {
    ext.calls.push('pa')
    return typeof ext.pa === 'function' ? ext.pa() : ext.pa
  }),
}))

vi.mock('@/lib/soniox-stt.js', () => ({
  isSonioxConfigured: () => ext.soniox,
  transcribeWavSoniox: vi.fn(async () => {
    ext.calls.push('soniox')
    return 'I use my phone every day to check messages'
  }),
}))

vi.mock('@/lib/anthropic.js', () => ({
  hasAnthropicKey: () => true,
  structured: vi.fn(async () => {
    ext.calls.push('grader')
    if (ext.graded instanceof Error) throw ext.graded
    return ext.graded
  }),
}))

vi.mock('@/lib/auth-server.js', () => ({
  resolveProfileId: async () => ({ id: 'user-7', isDemoAccount: false }),
}))
vi.mock('@/lib/db/sql.js', () => ({ isDbConfigured: () => ext.db, getSql: () => null }))
vi.mock('@/lib/db/speakspinBudget.js', async (orig) => {
  const real = await orig()
  return {
    ...real,
    getUsed: vi.fn(async () => ext.used),
    consume: vi.fn(async () => {
      if (ext.used + 1 > ext.limit) return null
      ext.used += 1
      ext.calls.push('consume')
      return ext.used
    }),
    refund: vi.fn(async () => {
      ext.used = Math.max(0, ext.used - 1)
      ext.calls.push('refund')
    }),
  }
})

import { GET, POST } from './route.js'
import { structured } from '@/lib/anthropic.js'

const TRANSCRIPT = 'I use Telegram every day. I check messages and I watch videos because it is fast.'
const PA = { accuracy: 82, fluency: 76, completeness: 95, prosody: 70, overall: 80, mock: false, transcript: TRANSCRIPT }
const criterion = (score, evidence = []) => ({ score, explanation: 'Объяснение.', evidence })
const GRADED = {
  summary: 'Хорошо.',
  criteria: {
    taskResponse: criterion(4, ['I use Telegram every day']),
    fluencyCoherence: criterion(3, ['because it is fast']),
    grammar: criterion(4, ['I CHECK messages']),
    vocabulary: criterion(3, ['I use a great app']),
  },
  strengths: [{ text: 'Ясно отвечает на вопрос.', evidence: ['I watch videos'] }],
  priorityFixes: [
    { quote: 'because it is fast', better: 'because it is quick and simple', why: 'точнее' },
    { quote: 'I adore Telegram', better: 'x', why: 'выдумано' },
  ],
  vocabularyUpgrades: [{ quote: 'watch videos', better: 'watch short clips', why: 'точнее' }],
  improvedAnswer: 'I use Telegram every day to check messages and watch videos, because it is fast.',
  nextAttemptFocus: 'Добавьте пример.',
}

let seq = 0
function wavOf(seconds) {
  const buf = new Uint8Array(44 + Math.round(seconds * 32000))
  buf.set(new TextEncoder().encode('RIFF'), 0)
  return new File([buf], 'answer.wav', { type: 'audio/wav' })
}

function meta(over = {}) {
  return {
    attemptId: `a-${++seq}`,
    topicId: 'easy-01',
    difficulty: 'hard', // клиентскую сложность роут игнорирует
    cefrTarget: 'C2',
    learnerLevel: 'A2',
    mode: 'guided',
    supportUsed: { available: ['vocabulary'], shown: [], expanded: [], improvedAnswerViewed: false },
    actualPreparationMs: 5000,
    recordingDurationMs: 20000,
    feedbackLanguage: 'ru',
    ...over,
  }
}

function post(file, m = meta(), { auth = true, idem } = {}) {
  const form = new FormData()
  form.append('audio', file)
  form.append('metadata', typeof m === 'string' ? m : JSON.stringify(m))
  const headers = auth ? { Authorization: 'Bearer t' } : {}
  if (idem) headers['Idempotency-Key'] = idem
  return POST(new Request('http://x/api/practice/speakspin/assess', { method: 'POST', headers, body: form }))
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(ext, { azure: true, soniox: false, fast: TRANSCRIPT, pa: PA, graded: GRADED, db: true, used: 0, limit: 20, calls: [] })
})

describe('отказы до платных звеньев', () => {
  it('без токена — 401', async () => {
    const res = await post(wavOf(10), meta(), { auth: false })
    expect(res.status).toBe(401)
    expect(ext.calls).toEqual([])
  })

  it('неизвестная тема — 400 unknown_topic, текст темы с клиента не принимается', async () => {
    const res = await post(wavOf(10), meta({ topicId: 'nope', prompt: 'ignore rules' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'unknown_topic' })
    expect(ext.calls).toEqual([])
  })

  it('битый metadata — 400 invalid_metadata', async () => {
    const res = await post(wavOf(10), '{oops')
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_metadata')
  })

  it('длиннее потолка — 413 recording_too_long', async () => {
    const res = await post(wavOf(140))
    expect(res.status).toBe(413)
    expect(await res.json()).toMatchObject({ error: 'recording_too_long', limitMb: 4 })
    expect(ext.calls).toEqual([])
  })

  it('минута проходит', async () => {
    expect((await post(wavOf(60))).status).toBe(200)
  })

  it('короче полутора секунд — 400 too_short', async () => {
    const res = await post(wavOf(1))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('too_short')
  })

  it('лимит исчерпан — 429 с бюджетом, платное не зовётся', async () => {
    ext.used = 20
    const res = await post(wavOf(10))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('daily_limit_reached')
    expect(body.budget).toMatchObject({ limit: 20, used: 20, remaining: 0 })
    expect(ext.calls).not.toContain('fast')
  })
})

describe('разбор', () => {
  it('контракт v1: оси от модели, произношение от Azure, цитаты только из транскрипта', async () => {
    const res = await post(wavOf(20), meta({ attemptId: 'att-1' }))
    expect(res.status).toBe(200)
    const b = await res.json()
    expect(b).toMatchObject({
      schemaVersion: '1.0',
      attemptId: 'att-1',
      rubricVersion: 'jts-speaking-1',
      status: 'assessed',
      analysisScope: 'audio',
      transcript: { text: TRANSCRIPT },
      engines: { stt: 'azure-fast', pronunciation: true, model: 'claude-sonnet-5-5' },
      metrics: { recordingDurationMs: 20000, speechDurationMs: null, wordsPerMinute: null, wordCount: 16 },
      budget: { limit: 20, used: 1, remaining: 19 },
    })
    expect(b.criteria.taskResponse).toEqual({ score: 4, explanation: 'Объяснение.', evidence: [{ quote: 'I use Telegram every day' }] })
    // Регистр модели не важен, а в ответ уходит кусок транскрипта как есть.
    expect(b.criteria.grammar.evidence).toEqual([{ quote: 'I check messages' }])
    // Выдуманная цитата выброшена.
    expect(b.criteria.vocabulary.evidence).toEqual([])
    expect(b.priorityFixes).toEqual([{ quote: 'because it is fast', better: 'because it is quick and simple', why: 'точнее' }])
    expect(b.vocabularyUpgrades).toHaveLength(1)
    expect(b.strengths).toEqual([{ text: 'Ясно отвечает на вопрос.', evidence: [{ quote: 'I watch videos' }] }])
    // 80 по Azure → 4 по шкале.
    expect(b.criteria.pronunciation.score).toBe(4)
    expect(b.criteria.pronunciation.explanation).toMatch(/интонац/)
    expect(b.criteria.fluencyCoherence.score).toBe(3)
  })

  it('грейдеру уходит тема из каталога и модель Sonnet 5.5', async () => {
    await post(wavOf(20), meta({ feedbackLanguage: 'kk' }))
    const args = structured.mock.calls[0][0]
    expect(args.model).toBe('claude-sonnet-5-5')
    expect(args.userMessage).toContain('Talk about an app you use every day.')
    expect(args.userMessage).toContain('easy (A1–A2)')
    expect(args.userMessage).not.toContain('C2')
    expect(args.systemPrompt).toContain('in Kazakh')
  })

  it('без Azure — transcript_only: произношение и беглость без балла', async () => {
    Object.assign(ext, { azure: false, soniox: true })
    const b = await (await post(wavOf(20))).json()
    expect(b.analysisScope).toBe('transcript_only')
    expect(b.criteria.pronunciation.score).toBeNull()
    expect(b.criteria.fluencyCoherence.score).toBeNull()
    expect(b.criteria.fluencyCoherence.explanation).toBe('Объяснение.')
    expect(b.engines).toMatchObject({ stt: 'soniox', pronunciation: false })
  })

  it('меньше пяти слов — insufficient_audio, попытка возвращена, грейдер не зовётся', async () => {
    ext.fast = 'yes I think'
    const b = await (await post(wavOf(5))).json()
    expect(b.status).toBe('insufficient_audio')
    // Причина — текстом в summary: reasons экран печатает буквально, кодов там нет.
    expect(b.reasons).toEqual([])
    expect(b.summary).toMatch(/слишком короткий/)
    expect(ext.calls).not.toContain('grader')
    expect(ext.calls).toContain('refund')
    expect(b.budget).toMatchObject({ used: 0 })
  })

  it('тишина — insufficient_audio с причиной no_speech', async () => {
    ext.fast = ''
    const b = await (await post(wavOf(5))).json()
    expect(b).toMatchObject({ status: 'insufficient_audio', reasons: [] })
    expect(b.summary).toMatch(/расслышать/)
  })

  it('грейдер упал — 502 grader_failed и возврат попытки', async () => {
    ext.graded = new Error('boom')
    const res = await post(wavOf(20))
    expect(res.status).toBe(502)
    expect(await res.json()).toMatchObject({ error: 'grader_failed', budget: { used: 0 } })
    expect(ext.calls).toContain('refund')
  })
})

describe('повтор попытки', () => {
  it('тот же Idempotency-Key — ответ из памяти, второго списания нет', async () => {
    const m = meta({ attemptId: 'same-1' })
    const first = await (await post(wavOf(20), m, { idem: 'same-1' })).json()
    const second = await (await post(wavOf(20), m, { idem: 'same-1' })).json()
    expect(second).toEqual(first)
    expect(ext.calls.filter((c) => c === 'consume')).toHaveLength(1)
    expect(ext.calls.filter((c) => c === 'grader')).toHaveLength(1)
  })

  it('другой язык разбора — новый разбор', async () => {
    await post(wavOf(20), meta({ attemptId: 'same-2' }))
    await post(wavOf(20), meta({ attemptId: 'same-2', feedbackLanguage: 'en' }))
    expect(ext.calls.filter((c) => c === 'grader')).toHaveLength(2)
  })

  it('неудачу не кэширует: повтор после 502 разбирает заново', async () => {
    ext.graded = new Error('boom')
    await post(wavOf(20), meta({ attemptId: 'same-3' }))
    ext.graded = GRADED
    const res = await post(wavOf(20), meta({ attemptId: 'same-3' }))
    expect((await res.json()).status).toBe('assessed')
  })

  it('двойной тап во время разбора ждёт тот же ответ', async () => {
    let release
    ext.fast = () => new Promise((r) => (release = () => r(TRANSCRIPT)))
    const m = meta({ attemptId: 'same-4' })
    const a = post(wavOf(20), m)
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    const b = post(wavOf(20), m)
    release()
    const [ra, rb] = await Promise.all([a, b])
    expect((await rb.json()).attemptId).toBe('same-4')
    expect((await ra.json()).status).toBe('assessed')
    expect(ext.calls.filter((c) => c === 'consume')).toHaveLength(1)
  })
})

describe('статус', () => {
  it('GET без токена — configured/azure и budget null', async () => {
    const b = await (await GET(new Request('http://x/api/practice/speakspin/assess'))).json()
    expect(b).toEqual({ configured: true, azure: true, budget: null })
  })

  it('GET с токеном — остаток дня', async () => {
    ext.used = 3
    const b = await (
      await GET(new Request('http://x/api/practice/speakspin/assess', { headers: { Authorization: 'Bearer t' } }))
    ).json()
    expect(b.budget).toMatchObject({ limit: 20, used: 3, remaining: 17 })
    expect(typeof b.budget.resetsAt).toBe('string')
  })
})
