import { describe, it, expect, vi, beforeEach } from 'vitest'

// Модель ученика в профиле Луны (ТЗ v2.0, 8.1 и 8.3): строки тем, повторения, журнала и «Совет сайта» повторением —
// в кэше профиля; темп — живой, мимо кэша. Окружение — то же, что в studentContext.test.js.
const fetchImpl = { value: async () => new Response(null, { status: 404 }) }
vi.stubGlobal('fetch', (...args) => fetchImpl.value(...args))

vi.mock('../auth-server.js', () => ({
  BACKEND_URL: 'https://backend.test',
  profileIdForUser: (id) => `user-${id}`,
  fetchTutorLimitOverride: vi.fn(async () => null),
}))
vi.mock('../db/sql.js', () => ({ isDbConfigured: () => true }))
vi.mock('../db/skillStats.js', () => ({ loadSkillStats: vi.fn(async () => null), loadLevelSkillStats: vi.fn(async () => null) }))
vi.mock('../db/ecosystem.js', async () => {
  const actual = await vi.importActual('../db/ecosystem.js')
  return { ...actual, loadEcosystemWeek: vi.fn(async () => null) }
})
vi.mock('../db/ielts.js', () => ({ listIeltsScores: vi.fn(async () => []) }))
// Активность ученика — одна сборка с карточкой преподавателя (studentActivity.js).
// Читает её loadStudentAppActivity: здесь он собирается из тех же ручек-моков
// навыков и недели, что и раньше, плюс то, что тест положит в activity.extra.
const activity = vi.hoisted(() => ({ extra: {} }))
vi.mock('../db/studentActivity.js', async () => {
  const actual = await vi.importActual('../db/studentActivity.js')
  const { loadSkillStats } = await import('../db/skillStats.js')
  const { loadEcosystemWeek } = await import('../db/ecosystem.js')
  return {
    ...actual,
    loadStudentAppActivity: vi.fn(async () => ({
      stats: await loadSkillStats(),
      goal: null,
      week: await loadEcosystemWeek(),
      voice: [],
      trainer: [],
      tasks: [],
      practice: [],
      practiceSince: null,
      ...activity.extra,
    })),
  }
})
// Модель ученика (миграция 0024): темы, ошибки, время ответов и темп — своими моками.
const model = vi.hoisted(() => ({ items: [], wrongs: [], times: [], recent: [] }))
vi.mock('../db/studentModel.js', () => ({
  loadItems: vi.fn(async () => model.items),
  loadWrongAnswers: vi.fn(async () => model.wrongs),
  loadAnswerTimes: vi.fn(async () => model.times),
  loadRecentAnswers: vi.fn(async () => model.recent),
}))
vi.mock('../db/assistantFacts.js', () => ({ loadFacts: vi.fn(async () => []) }))
vi.mock('../db/assistantTracker.js', () => ({
  loadAdviceNotes: vi.fn(async () => []),
  loadTutorSessionsSince: vi.fn(async () => []),
  loadTutorMistakes: vi.fn(async () => []),
  markAdviceDone: vi.fn(async () => {}),
}))

const { loadStudentContext, clearStudentContextCache, PACE_TTL_MS } = await import('./studentContext.js')

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-11-08T10:00:00Z')
const user = { userId: 42, languageLevel: 'A2' }
const PROGRAM = {
  levels: [{ id: 'L3', range: 'A2 → B1' }],
  topics: [
    { id: 'L3-07', lv: 'L3', title: { ru: 'Past Simple' } },
    { id: 'L3-08', lv: 'L3', title: { ru: 'Past Continuous' } },
  ],
}

describe('модель ученика в профиле Луны', () => {
  beforeEach(() => {
    clearStudentContextCache()
    model.items = [{ item: 'ggame:L3-07', kind: 'grammar', seen: 10, correct: 5, box: 1, dueAt: NOW - 1000, lastAt: NOW - 3 * DAY }]
    model.wrongs = [{ source: 'ggame', item: 'ggame:L3-07', example: 'She ___ (go). → went', at: NOW - DAY }]
    model.times = []
    model.recent = []
    fetchImpl.value = async (url) => {
      if (String(url).endsWith('/mobile/grammar-games')) return new Response(JSON.stringify(PROGRAM), { status: 200 })
      return new Response(null, { status: 404 })
    }
  })

  it('карта тем, повторение, журнал и «Совет сайта» повторением, когда плана нет', async () => {
    const text = await loadStudentContext('tok', user, NOW)
    expect(text).toContain('ступень L3 «A2 → B1» — 2 темы')
    expect(text).toContain('пора повторить: темы «Past Simple» (прошло 3 дн., метка [[OPEN ggame.L3-07]])')
    expect(text).toContain('Ошибки в заданиях за 30 дней (журнал сайта, повторяющиеся первыми): «Past Simple» — 1 раз')
    expect(text).toContain('Совет сайта, что сделать сейчас: тема «Past Simple» в «Грамматике · игры» — пора повторить по расписанию')
  })

  it('темп — живой: профиль из кэша, а «3 ошибки подряд» появляется сразу', async () => {
    const first = await loadStudentContext('tok', user, NOW)
    expect(first).not.toContain('Темп сейчас')
    model.recent = [0, 1, 2].map((i) => ({ item: 'ggame:L3-07', ok: false, gapMs: 4000, at: NOW + PACE_TTL_MS + 1000 - i * 1000, title: null }))
    const second = await loadStudentContext('tok', user, NOW + PACE_TTL_MS + 1000)
    expect(second).toContain('Темп сейчас: 3 ошибки подряд в теме «Past Simple»')
    expect(second).toContain('[[OPEN ggame.L3-07]]')
  })
})

describe('«Совет сайта»: повторение после плана', () => {
  it('шаг плана важнее повторения; повторение — когда шага нет', async () => {
    const { adviceLine } = await import('./studentContext.js')
    const review = { id: 'ggame.L3-07', name: 'тема «Past Simple» в «Грамматике · игры»', reason: 'пора повторить по расписанию' }
    const planNext = { id: 'learning', name: 'урок курса', reason: 'следующий шаг плана' }
    expect(adviceLine({ homework: [], occurrences: [], skillStats: null, planNext, review, now: NOW })).toContain('[[OPEN learning]]')
    expect(adviceLine({ homework: [], occurrences: [], skillStats: null, review, now: NOW })).toContain('[[OPEN ggame.L3-07]]')
  })
})
