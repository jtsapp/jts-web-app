import { describe, it, expect, vi, beforeEach } from 'vitest'

// Бэкенд-вызовы (homework/occurrences/level-progress/лимит тьютора) и своя
// база (навыки/экосистема/IELTS) мокаются отдельно: тест про сборку и кэш, а
// не про то, что именно ответит сеть.
const fetchImpl = { value: async () => new Response(null, { status: 404 }) }
vi.stubGlobal('fetch', (...args) => fetchImpl.value(...args))

vi.mock('../auth-server.js', () => ({
  BACKEND_URL: 'https://backend.test',
  profileIdForUser: (id) => `user-${id}`,
  fetchTutorLimitOverride: vi.fn(async () => null),
}))
vi.mock('../db/sql.js', () => ({ isDbConfigured: () => true }))
vi.mock('../db/skillStats.js', () => ({ loadSkillStats: vi.fn(async () => null) }))
vi.mock('../db/ecosystem.js', async () => {
  const actual = await vi.importActual('../db/ecosystem.js')
  return { ...actual, loadEcosystemWeek: vi.fn(async () => null) }
})
vi.mock('../db/ielts.js', () => ({ listIeltsScores: vi.fn(async () => []) }))

const {
  loadStudentContext,
  clearStudentContextCache,
  CONTEXT_TTL_MS,
} = await import('./studentContext.js')
const { fetchTutorLimitOverride } = await import('../auth-server.js')
const { loadSkillStats } = await import('../db/skillStats.js')
const { loadEcosystemWeek } = await import('../db/ecosystem.js')
const { listIeltsScores } = await import('../db/ielts.js')

const backendPath = (url) => url.replace('https://backend.test', '')
const jsonRes = (body) => new Response(JSON.stringify(body), { status: 200 })

const user = { userId: 42 }

describe('профиль ученика для помощника', () => {
  beforeEach(() => {
    clearStudentContextCache()
    vi.clearAllMocks()
    fetchImpl.value = async () => new Response(null, { status: 404 })
    fetchTutorLimitOverride.mockResolvedValue(null)
    loadSkillStats.mockResolvedValue(null)
    loadEcosystemWeek.mockResolvedValue(null)
    listIeltsScores.mockResolvedValue([])
  })

  it('без токена или без userId — null, в сеть не ходит', async () => {
    expect(await loadStudentContext(null, user)).toBeNull()
    expect(await loadStudentContext('tok', null)).toBeNull()
    expect(fetchTutorLimitOverride).not.toHaveBeenCalled()
  })

  it('ничего не собралось — null, а не пустая строка в промпте', async () => {
    expect(await loadStudentContext('tok', user)).toBeNull()
  })

  it('складывает домашку, срок которой в пределах недели, в одну строку', async () => {
    fetchImpl.value = async (url) => {
      if (backendPath(url) === '/admin/homework/my') {
        return jsonRes([
          { title: 'Эссе про путешествие', status: 'ASSIGNED', dueDate: '2026-09-25T00:00:00Z' },
          { title: 'Проверено давно', status: 'GRADED', dueDate: '2026-09-01T00:00:00Z' },
          { title: 'Через месяц', status: 'ASSIGNED', dueDate: '2026-11-01T00:00:00Z' },
        ])
      }
      return new Response(null, { status: 404 })
    }
    const text = await loadStudentContext('tok', user, new Date('2026-09-23T00:00:00Z').getTime())
    expect(text).toContain('Домашка (1 к сроку на этой неделе)')
    expect(text).toContain('Эссе про путешествие')
    expect(text).not.toContain('Проверено давно')
    expect(text).not.toContain('Через месяц')
  })

  it('расписание: только будущие занятия, отсортированы, сдана дата и учитель', async () => {
    fetchImpl.value = async (url) => {
      if (backendPath(url) === '/admin/lessons/occurrences') {
        return jsonRes([
          { scheduledAt: '2026-09-20T10:00:00Z', teacherName: 'Прошедшее' },
          { scheduledAt: '2026-09-26T10:00:00Z', teacherName: 'Анна' },
          { scheduledAt: '2026-09-24T10:00:00Z', teacherName: 'Борис' },
        ])
      }
      return new Response(null, { status: 404 })
    }
    const text = await loadStudentContext('tok', user, new Date('2026-09-23T00:00:00Z').getTime())
    expect(text).toContain('Ближайшие занятия: 2026-09-24 с Борис; 2026-09-26 с Анна.')
    expect(text).not.toContain('Прошедшее')
  })

  it('без будущих занятий говорит об этом прямо', async () => {
    fetchImpl.value = async (url) =>
      backendPath(url) === '/admin/lessons/occurrences'
        ? jsonRes([{ scheduledAt: '2020-01-01T00:00:00Z', teacherName: 'X' }])
        : new Response(null, { status: 404 })
    const text = await loadStudentContext('tok', user)
    expect(text).toContain('Ближайших занятий в расписании нет.')
  })

  it('навыки — все шесть с процентами, нули не считаются сигналом', async () => {
    loadSkillStats.mockResolvedValue({
      listening: { done: 10, firstTry: 8 },
      writing: { done: 10, firstTry: 3 },
      speaking: { done: 0, firstTry: 0 },
      reading: { done: 0, firstTry: 0 },
      grammar: { done: 0, firstTry: 0 },
      vocab: { done: 0, firstTry: 0 },
    })
    const text = await loadStudentContext('tok', user)
    // skillPercent() взвешивает точность объёмом попыток (CONF_FULL=25) —
    // 10 попыток дают уверенность 0.4, а не «сырую» долю верных.
    expect(text).toContain('listening 32%')
    expect(text).toContain('writing 12%')
  })

  it('лимит и фактические минуты Speaking Buddy — в одной строке', async () => {
    fetchTutorLimitOverride.mockResolvedValue({ dailyLimitSeconds: 1200, monthlyLimitSeconds: null, totalLimitSeconds: null })
    loadEcosystemWeek.mockResolvedValue({ voiceSeconds: 900 })
    const text = await loadStudentContext('tok', user)
    expect(text).toContain('Speaking Buddy: дневной лимит 20 мин, на этой неделе уже позанимался 15 мин.')
  })

  it('фактические минуты по воркбукам/шэдоуингу/словарю — только измеряемые модули', async () => {
    loadEcosystemWeek.mockResolvedValue({ activitySeconds: { workbooks: 600, vocabulary_sr: 300 }, shadowingCredits: 0 })
    const text = await loadStudentContext('tok', user)
    expect(text).toContain('воркбуки 10 мин')
    expect(text).toContain('словарь 5 мин')
    expect(text).not.toContain('media_practice')
  })

  it('баллы IELTS — не больше трёх последних', async () => {
    listIeltsScores.mockResolvedValue([
      { section: 'writing', overallBand: 6.5, createdAt: '2026-09-20T00:00:00Z' },
    ])
    const text = await loadStudentContext('tok', user)
    expect(text).toContain('Последние баллы IELTS: writing 6.5 (2026-09-20).')
  })

  it('одна упавшая ручка не роняет остальные и не роняет весь ответ', async () => {
    fetchImpl.value = async (url) => {
      if (backendPath(url) === '/admin/homework/my') throw new Error('сеть легла')
      if (backendPath(url) === '/mobile/level-progress') return jsonRes({ level: 'B1', next: 'B2', percent: 40 })
      return new Response(null, { status: 404 })
    }
    const text = await loadStudentContext('tok', user)
    expect(text).toContain('Уровень курса: B1, цель B2, пройдено 40%.')
  })

  it('кэширует на CONTEXT_TTL_MS — второй вызов в окне не бьёт по сети', async () => {
    let calls = 0
    fetchImpl.value = async (url) => {
      if (backendPath(url) === '/mobile/level-progress') {
        calls += 1
        return jsonRes({ level: 'A2' })
      }
      return new Response(null, { status: 404 })
    }
    const t0 = 1_000_000
    await loadStudentContext('tok', user, t0)
    await loadStudentContext('tok', user, t0 + CONTEXT_TTL_MS - 1)
    expect(calls).toBe(1)

    await loadStudentContext('tok', user, t0 + CONTEXT_TTL_MS + 1)
    expect(calls).toBe(2)
  })

  it('кэш не общий между учениками', async () => {
    let calls = 0
    fetchImpl.value = async (url) => {
      if (backendPath(url) === '/mobile/level-progress') {
        calls += 1
        return jsonRes({ level: 'A2' })
      }
      return new Response(null, { status: 404 })
    }
    await loadStudentContext('tok', { userId: 1 }, 0)
    await loadStudentContext('tok', { userId: 2 }, 0)
    expect(calls).toBe(2)
  })
})
