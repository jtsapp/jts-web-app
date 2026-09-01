// Демо-потолки платных AI-вызовов на границе роутов — пять мест, где
// `resolved.isDemoAccount` превращается в число:
//
//   GET  /api/writing/check      — показ недельного остатка проверок (3, не 10)
//   POST /api/writing/check      — списание проверки
//   POST /api/writing/translate  — списание перевода (20 в день, не 100)
//   GET  /api/shadowing/assess   — показ недельного остатка кредитов (3, не 10)
//   POST /api/shadowing/assess   — отсечка слишком дорогой записи и списание
//
// Зачем отдельный тест, если сами потолки уже проверены числами
// (writingBudget/shadowingBudget.test.js), а флаг — на resolveProfileId
// (auth-server.test.js). Между этими двумя закрытыми концами остаётся участок,
// где значение просто читается из объекта, и опечатка `resolved.isDemo` даёт
// undefined — демо-аккаунт молча уезжает на потолки бесплатного тарифа.
// Найти такое в работающем приложении нечем: одно и то же значение решает и
// показ остатка, и списание, поэтому они уедут СИНХРОННО. Клиент честно
// покажет «осталось 7 из 10» и отсечёт ровно на десятой — рассогласования, по
// которому баг обычно и замечают, не будет вовсе. Виден только расход в 3–5 раз
// выше расчётного, и то задним числом по счёту от Anthropic. Единственный
// наблюдаемый признак — сама цифра потолка, её здесь и проверяем: и в теле
// ответа, и на границе, где приходит отказ.
//
// Мокается только транспорт — драйвер postgres, SDK Anthropic и fetch к
// бэкендовому /user/me. resolveProfileId и модули бюджетов работают настоящие:
// мок любого из них и есть та дыра, из-за которой шов остался непокрытым.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Фейковый драйвер БД. Повторяет ровно ту семантику, на которой держится
// списание: insert…on conflict инкрементирует used и ОТКАЗЫВАЕТ (пустой
// результат), если новое значение выше потолка — а потолок приезжает последним
// параметром запроса, тем самым, который выбрал isDemoAccount.
const db = vi.hoisted(() => ({ used: new Map() }))

vi.mock('postgres', () => ({
  default: () => {
    const sql = (strings, ...values) => Promise.resolve(runQuery(strings.join('?'), values))
    sql.json = (v) => v // porsager сериализует jsonb сам — см. writingAttempts.js
    return sql
  },
}))

// Платный вызов подменяем на уровне сетевого клиента, а не на уровне
// src/lib/anthropic.js: разбор ответа модели в structured() пусть остаётся свой.
const claude = vi.hoisted(() => ({ result: {} }))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async () => ({ content: [{ type: 'tool_use', input: claude.result }], usage: {} }),
    }
  },
}))

import { GET as checkStatus, POST as checkEssay } from './writing/check/route.js'
import { POST as translate } from './writing/translate/route.js'
import { GET as shadowingStatus, POST as shadowingAssess } from './shadowing/assess/route.js'
import { isoWeekKey, dayKey } from '@/lib/db/writingBudget.js'

function rowKey(table, id, period) {
  return `${table}|${id}|${period}`
}

function runQuery(text, values) {
  const select = /select used from (\w+)/.exec(text)
  if (select) {
    const used = db.used.get(rowKey(select[1], values[0], values[1]))
    return used == null ? [] : [{ used }]
  }

  const insert = /insert into (\w+)/.exec(text)
  if (insert) {
    const table = insert[1]
    // Шэдоуинг списывает пачкой кредитов (параметр), письмо и перевод — по
    // одному (литерал в запросе).
    const delta = table === 'shadowing_assess' ? values[2] : 1
    const limit = values.at(-1)
    const key = rowKey(table, values[0], values[1])
    const before = db.used.get(key)
    const next = (before ?? 0) + delta
    // Потолок смотрит только ветка on conflict — как и в настоящем запросе:
    // первая запись периода проходит мимо него (см. комментарий в consume()).
    if (before != null && next > limit) return []
    db.used.set(key, next)
    return [{ used: next }]
  }

  const refund = /update (\w+)\s+set used = greatest/.exec(text)
  if (refund) {
    const table = refund[1]
    const [delta, id, period] = table === 'shadowing_assess' ? values : [1, ...values]
    const key = rowKey(table, id, period)
    db.used.set(key, Math.max(0, (db.used.get(key) ?? 0) - delta))
    return []
  }

  return [] // журнал попыток и снапшот письма — не предмет этого теста
}

const PROFILE = 'user-7'
const AUTH = { Authorization: 'Bearer TOK' }

const ESSAY = 'My school is big and I like my class very much.'
const ASSESSMENT = {
  scores: { task: 4, organisation: 4, vocabulary: 3.5, grammar: 3.5 },
  cefr: 'B1',
  summary: 'Задание выполнено, работа связная.',
  strengths: [],
  corrections: [],
  rewrite: ESSAY,
  nextSteps: ['Join two short sentences with because.'],
}

// Бэкенд отвечает на /user/me — единственный источник демо-статуса.
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

function seedUsed(table, period, used) {
  db.used.set(rowKey(table, PROFILE, period), used)
}

const thisWeek = () => isoWeekKey(new Date())
const today = () => dayKey(new Date())

function getRequest(path) {
  return new Request(`https://app.test${path}`, { headers: AUTH })
}

function jsonRequest(path, body) {
  return new Request(`https://app.test${path}`, {
    method: 'POST',
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Запись N байт 16кГц mono WAV: 30 с аудио = 1 кредит (см. shadowingBudget.js).
function audioRequest(bytes) {
  const form = new FormData()
  form.append('audio', new File([new Uint8Array(bytes)], 'take.wav', { type: 'audio/wav' }))
  form.append('text', 'Hello there')
  return new Request('https://app.test/api/shadowing/assess', {
    method: 'POST',
    headers: AUTH,
    body: form,
  })
}

beforeEach(() => {
  db.used.clear()
  claude.result = ASSESSMENT
  vi.stubEnv('DATABASE_URL', 'postgres://fake/jts') // метрирование включено
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key') // иначе роуты уходят в 503
  // Azure гасим намеренно: оценка тогда mock'овая (платить не за что), а ветка
  // бюджета та же. Явно — чтобы прогон не зависел от .env.local машины.
  vi.stubEnv('AZURE_SPEECH_KEY', '')
  vi.stubEnv('AZURE_SPEECH_REGION', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('GET /api/writing/check — остаток проверок', () => {
  it('демо-аккаунту показывается его потолок 3', async () => {
    signedInAs({ demo: true })
    seedUsed('writing_assess', thisWeek(), 1)

    const body = await (await checkStatus(getRequest('/api/writing/check'))).json()

    expect(body.budget).toMatchObject({ limit: 3, used: 1, remaining: 2 })
  })

  it('обычному аккаунту — 10', async () => {
    signedInAs({ demo: false })
    seedUsed('writing_assess', thisWeek(), 1)

    const body = await (await checkStatus(getRequest('/api/writing/check'))).json()

    expect(body.budget).toMatchObject({ limit: 10, used: 1, remaining: 9 })
  })
})

describe('POST /api/writing/check — списание проверки', () => {
  it('демо-аккаунт: успешная проверка возвращает остаток по потолку 3', async () => {
    signedInAs({ demo: true })

    const res = await checkEssay(jsonRequest('/api/writing/check', { text: ESSAY, level: 'B1' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.budget).toMatchObject({ limit: 3, used: 1, remaining: 2 })
  })

  it('демо-аккаунт: четвёртая проверка за неделю отсекается, и в отказе тот же потолок 3', async () => {
    signedInAs({ demo: true })
    seedUsed('writing_assess', thisWeek(), 3)

    const res = await checkEssay(jsonRequest('/api/writing/check', { text: ESSAY, level: 'B1' }))
    const body = await res.json()

    expect(res.status).toBe(429)
    expect(body.error).toBe('weekly_limit_reached')
    expect(body.budget).toMatchObject({ limit: 3, used: 3, remaining: 0 })
  })

  it('обычному аккаунту четвёртая проверка проходит: его потолок 10', async () => {
    signedInAs({ demo: false })
    seedUsed('writing_assess', thisWeek(), 3)

    const res = await checkEssay(jsonRequest('/api/writing/check', { text: ESSAY, level: 'B1' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.budget).toMatchObject({ limit: 10, used: 4 })
  })
})

describe('POST /api/writing/translate — списание перевода', () => {
  beforeEach(() => {
    claude.result = { ru: 'большая школа', kk: 'үлкен мектеп' }
  })

  it('демо-аккаунт: перевод возвращает остаток по потолку 20', async () => {
    signedInAs({ demo: true })

    const body = await (await translate(jsonRequest('/api/writing/translate', { text: 'a big school' }))).json()

    expect(body.budget).toMatchObject({ limit: 20, used: 1, remaining: 19 })
  })

  it('демо-аккаунт: двадцать первый перевод за день отсекается на его потолке', async () => {
    signedInAs({ demo: true })
    seedUsed('writing_translate', today(), 20)

    const res = await translate(jsonRequest('/api/writing/translate', { text: 'a big school' }))
    const body = await res.json()

    expect(res.status).toBe(429)
    expect(body.error).toBe('daily_limit_reached')
    expect(body.budget).toMatchObject({ limit: 20, used: 20, remaining: 0 })
  })

  it('обычному аккаунту двадцать первый перевод проходит: его потолок 100', async () => {
    signedInAs({ demo: false })
    seedUsed('writing_translate', today(), 20)

    const res = await translate(jsonRequest('/api/writing/translate', { text: 'a big school' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.budget).toMatchObject({ limit: 100, used: 21 })
  })
})

describe('GET /api/shadowing/assess — остаток кредитов', () => {
  it('демо-аккаунту показывается его потолок 3', async () => {
    signedInAs({ demo: true })
    seedUsed('shadowing_assess', thisWeek(), 1)

    const body = await (await shadowingStatus(getRequest('/api/shadowing/assess'))).json()

    expect(body.budget).toMatchObject({ limit: 3, used: 1, remaining: 2 })
  })

  it('обычному аккаунту — 10', async () => {
    signedInAs({ demo: false })
    seedUsed('shadowing_assess', thisWeek(), 1)

    const body = await (await shadowingStatus(getRequest('/api/shadowing/assess'))).json()

    expect(body.budget).toMatchObject({ limit: 10, used: 1, remaining: 9 })
  })
})

describe('POST /api/shadowing/assess — отсечка и списание кредитов', () => {
  // 3 МБ ≈ 94 секунды записи ≈ 4 кредита: дороже всего недельного бюджета демо
  // (3) и вполне по карману обычному аккаунту (10). Ровно та граница, на которой
  // потерянный флаг перестаёт быть заметен по одному лишь остатку.
  const LONG_TAKE = 3_000_000
  const SHORT_TAKE = 100_000

  it('демо-аккаунт: запись дороже всего его бюджета не начинают оценивать', async () => {
    signedInAs({ demo: true })

    const res = await shadowingAssess(audioRequest(LONG_TAKE))
    const body = await res.json()

    expect(res.status).toBe(413)
    expect(body.error).toBe('recording_too_long')
    expect(body.budget).toMatchObject({ limit: 3 })
  })

  it('обычному аккаунту та же запись по карману: у него 10 кредитов', async () => {
    signedInAs({ demo: false })

    const res = await shadowingAssess(audioRequest(LONG_TAKE))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.budget).toMatchObject({ limit: 10 })
  })

  it('демо-аккаунт: остаток в ответе считается от потолка 3', async () => {
    signedInAs({ demo: true })

    const body = await (await shadowingAssess(audioRequest(SHORT_TAKE))).json()

    expect(body.budget).toMatchObject({ limit: 3, remaining: 3 })
  })
})
