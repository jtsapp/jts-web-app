// Еженедельный разбор ответов Луны: итог по журналу, сбор диалогов, повторяемая выборка и сам лист.
import { describe, it, expect, vi } from 'vitest'
import { CHECKLIST, fetchRows, flagsOf, groupDialogs, pickDialogs, renderReview, seedOf, summarize } from './weekly-review.js'

const row = (over = {}) => ({
  id: `r-${Math.random().toString(36).slice(2, 10)}`,
  student: 'abc123def0',
  chat: 'c1',
  turn: 1,
  screen: 'home',
  lang: 'ru',
  persona: 'luna',
  channel: 'text',
  mode: 'site',
  opening: false,
  event: null,
  offtopic: false,
  model: 'claude-haiku-5-5',
  question: 'Где домашка?',
  answer: 'Домашка — в «Уроках». Открыть?',
  firstMs: 1000,
  soundMs: null,
  actions: [],
  clicked: null,
  rating: null,
  reasons: [],
  comment: '',
  createdAt: '2026-11-05T10:00:00.000Z',
  ...over,
})

describe('summarize', () => {
  it('доля 👍 — среди оценённых; кнопки и задержка', () => {
    const rows = [
      row({ rating: 1, actions: ['open:lessons'], clicked: 'open:lessons' }),
      row({ rating: 1, mode: 'teacher', firstMs: 3000 }),
      row({ rating: -1, reasons: ['wrong', 'lang'], comment: 'не то', actions: ['open:home'], firstMs: 2000 }),
      row({ chat: 'c2', student: 'zzz', channel: 'voice', soundMs: 2500 }),
    ]
    const s = summarize(rows)
    expect(s).toMatchObject({ answers: 4, dialogs: 2, students: 2, rated: 3, up: 2, down: 1, comments: 1, offered: 2, clicked: 1 })
    expect(s.reasons).toEqual({ wrong: 1, lang: 1 })
    expect(s.byMode.teacher).toEqual({ answers: 1, up: 1, down: 0 })
    expect(s.latency.text).toEqual({ median: 2000, p90: 3000, n: 3 })
    expect(s.soundMs).toEqual({ median: 2500, p90: 2500 })
  })
})

describe('диалоги и выборка', () => {
  const rows = Array.from({ length: 120 }, (_, i) => row({ chat: `c${i % 60}`, turn: i < 60 ? 1 : 2, createdAt: new Date(Date.UTC(2026, 10, 2, 0, i % 60)).toISOString() }))

  it('ответы собираются в диалог по разговору и номеру', () => {
    const d = groupDialogs(rows)
    expect(d).toHaveLength(60)
    expect(d[0].turns.map((t) => t.turn)).toEqual([1, 2])
  })

  it('выборка повторяема по seed и меняется с ним', () => {
    const d = groupDialogs(rows)
    const a = pickDialogs(d, 50, 7).map((x) => x.chat)
    expect(a).toHaveLength(50)
    expect(new Set(a).size).toBe(50)
    expect(pickDialogs(d, 50, 7).map((x) => x.chat)).toEqual(a)
    expect(pickDialogs(d, 50, 8).map((x) => x.chat)).not.toEqual(a)
    expect(pickDialogs(d.slice(0, 3), 50, 7)).toHaveLength(3)
    expect(seedOf('2026-11-01')).toBe(seedOf('2026-11-01'))
  })
})

it('flagsOf — домашка, не тот язык и отказ', () => {
  expect(flagsOf(row({ screen: 'homework', lang: 'kk' }))).toEqual(['домашка — нет ли готового ответа', 'язык: ответ ru, интерфейс kk'])
  expect(flagsOf(row({ lang: 'en', answer: 'Present Perfect: have + V3.' }))).toEqual([])
  expect(flagsOf(row({ offtopic: true }))).toEqual(['отказ «не по теме»'])
})

describe('renderReview', () => {
  const rows = [
    row({ chat: 'c1', turn: 1, question: '[ученик открыл окно]', answer: 'Привет! Ты на Главной.', rating: 1 }),
    row({ chat: 'c1', turn: 2, question: 'Как сказать «я устал»?', mode: 'teacher', answer: 'I am tired.', rating: -1, reasons: ['unclear'], comment: 'мало примеров' }),
    row({ chat: 'c2', turn: 1, screen: 'homework', actions: ['open:homework'], clicked: 'open:homework' }),
  ]
  const md = renderReview({ rows, from: '2026-11-01T00:00:00.000Z', to: '2026-11-08T00:00:00.000Z', n: 50, seed: 7, source: 'dev-tutor.justtostudy.kz' })

  it('итог, все 👎 и выборка с чек-листом ТЗ', () => {
    expect(md).toContain('# Разбор ответов Луны: 2026-11-01 — 2026-11-08')
    expect(md).toContain('**Доля 👍: 50 %** — цель ТЗ ≥ 85 %: нет')
    expect(md).toContain('## Все 👎 (1)')
    expect(md).toContain('Причина 👎: непонятно — «мало примеров»')
    expect(md).toContain('## 2 случайных диалогов')
    expect(md).toContain('*Служебный ход окна:* `[ученик открыл окно]`')
    expect(md).toContain('`open:homework` — нажата')
    expect(md).toContain('🔎 домашка — нет ли готового ответа')
    for (const c of CHECKLIST) expect(md).toContain(`- [ ] ${c}`)
    expect(md).toContain('Полезных диалогов: __ из 2 (цель ТЗ ≥ 85 % — не меньше 2).')
  })

  it('пустой журнал — лист без падения', () => {
    const empty = renderReview({ rows: [], from: '2026-11-01', to: '2026-11-08', seed: 1 })
    expect(empty).toContain('оценок нет')
    expect(empty).toContain('## Все 👎 (0)')
  })
})

it('fetchRows — служебный GET с ключом и периодом', async () => {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ rows: [row()] }), { status: 200 }))
  const rows = await fetchRows({ url: 'https://dev.example.kz', key: 'k', from: new Date('2026-11-01T00:00:00Z'), to: new Date('2026-11-08T00:00:00Z'), fetchImpl })
  expect(rows).toHaveLength(1)
  const [url, init] = fetchImpl.mock.calls[0]
  expect(String(url)).toBe('https://dev.example.kz/api/assistant/rating?from=2026-11-01T00%3A00%3A00.000Z&to=2026-11-08T00%3A00%3A00.000Z')
  expect(init.headers['x-internal-key']).toBe('k')
  const denied = vi.fn(async () => new Response('{}', { status: 401 }))
  await expect(fetchRows({ url: 'https://dev.example.kz', key: 'bad', from: new Date(), to: new Date(), fetchImpl: denied })).rejects.toThrow('ключ')
})
