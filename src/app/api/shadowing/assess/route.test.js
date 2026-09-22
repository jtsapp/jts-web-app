// Оценка Shadowing без лимита: ни дневного потолка кредитов, ни отдельного
// демо-потолка больше нет (решение владельца 22.09.2026). Кредиты при этом
// ПИШУТСЯ дальше: из shadowing_assess недельная сводка Roadmap считает минуты
// шэдоуинга (lib/db/ecosystem.js), так что «снять лимит» не значит «перестать
// считать» — иначе у студента обнулился бы норматив по речи.
//
// Мокается только транспорт: драйвер postgres, fetch к бэкендовому /user/me и
// сам Azure — платный внешний сервис. Роут и модуль учёта работают настоящие.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Фейковый драйвер БД. upsert инкрементирует used; если в запросе стоит потолок
// (where в ветке on conflict), соблюдает его, как настоящий Postgres, — иначе
// тест прошёл бы мимо лимита, а не поймал его.
const db = vi.hoisted(() => ({ used: new Map(), failWrites: false }))

vi.mock('postgres', () => ({
  default: () => {
    const sql = (strings, ...values) => Promise.resolve().then(() => runQuery(strings.join('?'), values))
    sql.json = (v) => v
    return sql
  },
}))

// Azure отвечает настоящими баллами — mock-оценка в учёт не идёт (платы не было),
// и на ней было бы нечего проверять. fail — Azure не ответил.
const azure = vi.hoisted(() => ({ fail: false }))

vi.mock('@/lib/ielts/azure-pronunciation.js', () => {
  const score = { overall: 82, accuracy: 85, fluency: 80, prosody: 78, completeness: 90 }
  return {
    isAzureSpeechConfigured: () => true,
    assessAgainstReference: async () => (azure.fail ? null : { ...score, words: [], transcript: 'hello there' }),
    assessPronunciation: async () => (azure.fail ? null : { ...score }),
    mockPronunciation: () => ({ overall: 70, accuracy: 70, fluency: 70, prosody: 70, completeness: 75, mock: true }),
  }
})

import { POST } from './route.js'
import { dayKey } from '@/lib/db/shadowingBudget.js'

const PROFILE = 'user-7'
const rowKey = (id, day) => `${id}|${day}`

function runQuery(text, values) {
  if (/insert into shadowing_assess/.test(text)) {
    if (db.failWrites) throw new Error('db is down')
    const [id, day, credits] = values
    const key = rowKey(id, day)
    const before = db.used.get(key)
    const next = (before ?? 0) + credits
    const ceiling = /do update[\s\S]*\bwhere\b/.test(text) ? values.at(-1) : Infinity
    if (before != null && next > ceiling) return []
    db.used.set(key, next)
    return [{ used: next }]
  }
  if (/select used from shadowing_assess/.test(text)) {
    const used = db.used.get(rowKey(values[0], values[1]))
    return used == null ? [] : [{ used }]
  }
  if (/update shadowing_assess\s+set used = greatest/.test(text)) {
    const [credits, id, day] = values
    const key = rowKey(id, day)
    db.used.set(key, Math.max(0, (db.used.get(key) ?? 0) - credits))
    return []
  }
  return []
}

// Бэкенд отвечает на /user/me — источник и id, и демо-статуса.
function signedInAs({ demo }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (String(url).endsWith('/user/me')) {
        return { ok: true, status: 200, json: async () => ({ id: 7, name: 'Асель', isDemoAccount: demo }) }
      }
      throw new Error(`unexpected fetch ${url}`)
    }),
  )
}

const today = () => dayKey(new Date())
const usedToday = () => db.used.get(rowKey(PROFILE, today())) ?? 0

// Запись длиной seconds: 16кГц mono 16-bit WAV — 32 000 байт в секунду плюс
// 44 байта заголовка; 30 с = 1 кредит (см. shadowingBudget.js).
function takeRequest(seconds, mode = 'phrase') {
  const form = new FormData()
  form.append('audio', new File([new Uint8Array(44 + seconds * 32000)], 'take.wav', { type: 'audio/wav' }))
  form.append('text', 'Hello there')
  form.append('mode', mode)
  return new Request('https://app.test/api/shadowing/assess', {
    method: 'POST',
    headers: { Authorization: 'Bearer TOK' },
    body: form,
  })
}

beforeEach(() => {
  db.used.clear()
  db.failWrites = false
  azure.fail = false
  vi.stubEnv('DATABASE_URL', 'postgres://fake/jts') // учёт включён
  vi.stubEnv('ANTHROPIC_API_KEY', '') // совет Claude не зовём — он не про лимит
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('POST /api/shadowing/assess — лимита нет', () => {
  it('обычный аккаунт: одиннадцатая оценка за сутки проходит и попадает в учёт', async () => {
    signedInAs({ demo: false })
    db.used.set(rowKey(PROFILE, today()), 10) // прежний дневной потолок

    const res = await POST(takeRequest(6))

    expect(res.status).toBe(200)
    expect(usedToday()).toBe(11)
  })

  it('демо-аккаунт: запись на четыре кредита оценивается, а не отсекается', async () => {
    signedInAs({ demo: true })

    const res = await POST(takeRequest(94, 'whole')) // ceil(94/30) = 4 кредита
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.overall).toBe(82)
    expect(usedToday()).toBe(4)
  })
})

describe('POST /api/shadowing/assess — учёт кредитов для Roadmap', () => {
  it('mock-оценка (Azure не ответил) в учёт не попадает: платы не было', async () => {
    signedInAs({ demo: false })
    azure.fail = true

    const body = await (await POST(takeRequest(6))).json()

    expect(body.mock).toBe(true)
    expect(usedToday()).toBe(0)
  })

  it('сбой БД на записи учёта не роняет оценку', async () => {
    signedInAs({ demo: false })
    db.failWrites = true
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(takeRequest(6))

    expect(res.status).toBe(200)
    expect((await res.json()).overall).toBe(82)
    quiet.mockRestore()
  })
})
