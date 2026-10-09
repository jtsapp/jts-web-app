// Роут оценки караоке. Мокается только транспорт — Azure, Soniox и бэкендовый
// /user/me; разбор WAV, нарезка кусков и сборка ответа работают настоящие.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const azure = vi.hoisted(() => ({ calls: [], failIds: new Set(), failOnce: new Set(), configured: true }))
const soniox = vi.hoisted(() => ({ configured: true, text: 'we were good we were gold', calls: 0 }))

vi.mock('@/lib/ielts/azure-pronunciation.js', async (importOriginal) => {
  const real = await importOriginal()
  return {
    ...real,
    isAzureSpeechConfigured: () => azure.configured,
    // Кусок «спет» ровно по своему тексту: каждое слово через 0,5 с от начала
    // куска, точность 80. Время — от начала КУСКА, как отдаёт настоящий Azure.
    assessAgainstReference: async (wav, text, opts) => {
      const sec = real.extractPcm(wav).pcm.length / 2 / 16000
      azure.calls.push({ sec, text, opts })
      if (azure.failIds.has(text)) return null
      if (azure.failOnce.has(text)) {
        azure.failOnce.delete(text)
        return null
      }
      // Так живой Azure отвечает на тишину (замер 27.09.2026): «реплика» из
      // точки, без слов и с нулями.
      if (text === 'silent line') return { overall: 0, accuracy: 0, words: [], transcript: '.' }
      const words = text.split(' ').map((w, i) => ({ word: w, accuracy: 80, error: 'None', start: 0.5 * i, end: 0.5 * i + 0.4 }))
      return { words, transcript: text }
    },
    transcribeWavFast: async () => null,
    transcribeWav: async () => 'azure transcript',
  }
})

vi.mock('@/lib/soniox-stt.js', () => ({
  isSonioxConfigured: () => soniox.configured,
  transcribeWavSoniox: async () => {
    soniox.calls++
    return soniox.text
  },
}))

import { POST } from './route.js'

function wav(seconds, rate = 16000) {
  const n = Math.round(rate * seconds)
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 2, 40)
  return buf
}

function assessRequest({ seconds = 20, segments, token = 'TOK' } = {}) {
  const form = new FormData()
  form.append('audio', new File([wav(seconds)], 'take.wav', { type: 'audio/wav' }))
  form.append('segments', typeof segments === 'string' ? segments : JSON.stringify(segments))
  return new Request('https://app.test/api/karaoke/assess', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
}

const SEGMENTS = [
  { id: 0, from: 1.2, to: 6.4, text: 'we were good we were gold' },
  { id: 1, from: 9, to: 13.5, text: 'kinda dream that cant be sold' },
]

beforeEach(() => {
  azure.calls = []
  azure.failIds = new Set()
  azure.failOnce = new Set()
  azure.configured = true
  soniox.configured = true
  soniox.calls = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (String(url).endsWith('/user/me')) {
        return { ok: true, status: 200, json: async () => ({ id: 7, name: 'Асель', isDemoAccount: false }) }
      }
      throw new Error(`unexpected fetch ${url}`)
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/karaoke/assess', () => {
  it('гостю оценка закрыта — Azure платный', async () => {
    const res = await POST(assessRequest({ segments: SEGMENTS, token: null }))
    expect(res.status).toBe(401)
    expect(azure.calls).toHaveLength(0)
  })

  it('каждый кусок оценивается по своему тексту, время слов — в шкале всей записи', async () => {
    const res = await POST(assessRequest({ segments: SEGMENTS }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.mode).toBe('assessed')
    // Куски вырезаны по своим границам, а не отданы записью целиком.
    expect(azure.calls.map((c) => Math.round(c.sec * 10) / 10).sort()).toEqual([4.5, 5.2])
    expect(azure.calls[0].opts).toEqual({ continuous: true, prosody: false, strict: true })
    const second = body.segments.find((s) => s.id === 1)
    expect(second.words[1]).toMatchObject({ word: 'dream', start: 9.5, accuracy: 80 })
    expect(body.transcript).toBe('we were good we were gold kinda dream that cant be sold')
  })

  it('тишина в куске — не сбой: оценка остаётся полной', async () => {
    const res = await POST(
      assessRequest({ segments: [SEGMENTS[0], { id: 1, from: 9, to: 12, text: 'silent line' }] }),
    )
    const body = await res.json()
    expect(body.mode).toBe('assessed')
    expect(body.segments.find((s) => s.id === 1)).toEqual({ id: 1, transcript: '', words: [] })
    expect(body.transcript).toBe('we were good we were gold')
  })

  it('единичный обрыв лечится повтором', async () => {
    azure.failOnce.add(SEGMENTS[1].text)
    const body = await (await POST(assessRequest({ segments: SEGMENTS }))).json()
    expect(body.mode).toBe('assessed')
  })

  it('кусок так и не оценился — тот же WAV уходит в обычное распознавание', async () => {
    azure.failIds.add(SEGMENTS[1].text)
    const body = await (await POST(assessRequest({ segments: SEGMENTS }))).json()
    expect(body).toEqual({ mode: 'transcript', transcript: 'we were good we were gold' })
    expect(soniox.calls).toBe(1)
  })

  it('Azure не настроен — сразу текст, без оценки произношения', async () => {
    azure.configured = false
    const body = await (await POST(assessRequest({ segments: SEGMENTS }))).json()
    expect(body.mode).toBe('transcript')
    expect(azure.calls).toHaveLength(0)
  })

  it('кусок, ушедший за конец записи, пустой, а не сбой', async () => {
    // Часы клиента обогнали декодер на пару кадров: кусок начинается у самого
    // конца WAV. Оценка остаётся полной, Azure за пустотой не ходит.
    const body = await (
      await POST(assessRequest({ seconds: 10, segments: [SEGMENTS[0], { id: 1, from: 9.95, to: 11, text: 'late line' }] }))
    ).json()
    expect(body.mode).toBe('assessed')
    expect(body.segments.find((s) => s.id === 1)).toEqual({ id: 1, transcript: '', words: [] })
    expect(azure.calls.map((c) => c.text)).toEqual([SEGMENTS[0].text])
  })

  it('кусок за пределами записи или без текста — 400, Azure не зовём', async () => {
    const past = await POST(assessRequest({ seconds: 5, segments: [{ id: 0, from: 7, to: 9, text: 'x' }] }))
    expect(past.status).toBe(400)
    const empty = await POST(assessRequest({ segments: [{ id: 0, from: 1, to: 2, text: '   ' }] }))
    expect(empty.status).toBe(400)
    const junk = await POST(assessRequest({ segments: 'not json' }))
    expect(junk.status).toBe(400)
    expect(azure.calls).toHaveLength(0)
  })
})
