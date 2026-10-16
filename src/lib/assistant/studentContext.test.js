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
vi.mock('../db/assistantTracker.js', () => ({
  loadAdviceNotes: vi.fn(async () => []),
  loadTutorSessionsSince: vi.fn(async () => []),
  loadTutorMistakes: vi.fn(async () => []),
  markAdviceDone: vi.fn(async () => {}),
}))

const {
  loadStudentContext,
  warmStudentContext,
  clearStudentContextCache,
  CONTEXT_TTL_MS,
  CONTEXT_STALE_MS,
} = await import('./studentContext.js')
const { fetchTutorLimitOverride } = await import('../auth-server.js')
const { loadSkillStats } = await import('../db/skillStats.js')
const { loadEcosystemWeek } = await import('../db/ecosystem.js')
const { listIeltsScores } = await import('../db/ielts.js')
const { loadAdviceNotes, loadTutorSessionsSince, loadTutorMistakes, markAdviceDone } = await import('../db/assistantTracker.js')

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
    activity.extra = {}
    loadAdviceNotes.mockResolvedValue([])
    loadTutorSessionsSince.mockResolvedValue([])
    loadTutorMistakes.mockResolvedValue([])
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
    // Сколько дней до срока считает код: с одной датой «Сегодня» модель путала «завтра» и «через два дня».
    expect(text).toContain('«Эссе про путешествие» — до 2026-09-25 (через 2 дн.)')
    expect(text).not.toContain('Проверено давно')
    expect(text).not.toContain('Через месяц')
  })

  // Первая реплика Луны советует то же, что карточка «Рекомендация дня» на «Главной», — с меткой раздела.
  it('совет сайта: горящая домашка важнее слабого навыка, с меткой раздела', async () => {
    fetchImpl.value = async (url) =>
      backendPath(url) === '/admin/homework/my'
        ? jsonRes([{ title: 'Unit 4', status: 'ASSIGNED', dueDate: '2026-09-24T00:00:00Z' }])
        : new Response(null, { status: 404 })
    loadSkillStats.mockResolvedValue({ listening: { done: 30, firstTry: 6 }, reading: { done: 30, firstTry: 27 } })
    const text = await loadStudentContext('tok', user, new Date('2026-09-23T00:00:00Z').getTime())
    expect(text).toContain('Совет сайта, что сделать сейчас: Домашняя работа — домашку сдавать в ближайшие двое суток (метка [[OPEN homework]]).')
  })

  // Навык без попыток рейтинг считает за 0% — как и «Главная», — поэтому здесь все шесть.
  const allSkills = (percentOf) =>
    Object.fromEntries(['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocab'].map((k) => [k, { done: 30, firstTry: percentOf(k) }]))

  it('совет сайта без горящей домашки — слабый навык, тренажёр этого навыка', async () => {
    loadSkillStats.mockResolvedValue(allSkills((k) => (k === 'listening' ? 6 : 27)))
    const text = await loadStudentContext('tok', user)
    expect(text).toMatch(/Совет сайта, что сделать сейчас: .+ — самый слабый навык — listening \(метка \[\[OPEN listening\]\]\)\./)
  })

  it('сигнала нет — и совета нет: выдумывать его Луне не из чего', async () => {
    loadSkillStats.mockResolvedValue(allSkills(() => 27))
    const text = await loadStudentContext('tok', user)
    expect(text).not.toContain('Совет сайта')
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

  // Трекер (tracker.js): цель, две недели, разделы, ошибки из звонков и прошлые советы Луны.
  it('трекер: цель, неделя, давно не открытые разделы и ошибки из звонков', async () => {
    activity.extra = {
      goal: { target: 'B1', from: 'A2' },
      tasks: [{ day: '2026-10-14', tasks: 10, first_try: 8 }],
      practice: [{ module: 'reading', updated_at: '2026-09-30T10:00:00Z' }, { module: 'vocab', updated_at: '2026-10-14T10:00:00Z' }],
    }
    loadTutorMistakes.mockResolvedValue(['he go to school'])
    const text = await loadStudentContext('tok', user, Date.parse('2026-10-15T12:00:00Z'))
    expect(text).toContain('Цель уровня, которую ученик выбрал: B1 (от A2).')
    expect(text).toContain('Последние 7 дней: дней с занятиями 1, заданий 10 (верно с первой попытки 80%)')
    expect(text).toContain('давно не открывал — Чтение (15 дн. назад); недавно — Словарь (вчера)')
    expect(text).toContain('Ошибки из разговоров со Speaking Buddy, ещё не пройденные: «he go to school».')
  })

  it('прошлые советы сверяются с сайтом: выполненный помечается в базе и в тексте', async () => {
    activity.extra = { practice: [{ module: 'vocab', updated_at: '2026-10-14T18:00:00Z' }] }
    loadAdviceNotes.mockResolvedValue([
      { id: '7', target: 'vocab', advice: 'Повторите 14 слов.', createdAt: '2026-10-14T10:00:00.000Z', doneAt: null },
      { id: '8', target: 'tutor', advice: 'Поговорите с Декстером.', createdAt: '2026-10-13T10:00:00.000Z', doneAt: null },
    ])
    loadTutorSessionsSince.mockResolvedValue([])
    const text = await loadStudentContext('tok', user, Date.parse('2026-10-15T12:00:00Z'))
    // Звонки тьютора ищем начиная с самого старого невыполненного совета — и не раньше.
    expect(loadTutorSessionsSince).toHaveBeenCalledWith('user-42', '2026-10-13T10:00:00.000Z')
    expect(markAdviceDone).toHaveBeenCalledWith([{ id: '7', doneAt: '2026-10-14T18:00:00.000Z' }])
    expect(text).toContain('- 2026-10-14 (вчера): Словарь — «Повторите 14 слов.» — выполнено 2026-10-14')
    expect(text).toContain('- 2026-10-13 (2 дн. назад): Speaking Buddy — «Поговорите с Декстером.» — пока не выполнено')
  })

  it('лимит и фактические минуты Speaking Buddy — в одной строке', async () => {
    fetchTutorLimitOverride.mockResolvedValue({ dailyLimitSeconds: 1200, monthlyLimitSeconds: null, totalLimitSeconds: null })
    // Минуты недели — суммой суточных строк voice_usage (seconds + pool_seconds), как в карточке
    // преподавателя: voiceSeconds недельной сводки не видит докупленных минут (studentActivity.js).
    loadEcosystemWeek.mockResolvedValue({ weekStart: '2026-09-21', weekEndExclusive: '2026-09-28', voiceSeconds: 0 })
    activity.extra = { voice: [{ day: '2026-09-22', seconds: 600 }, { day: '2026-09-23', seconds: 300 }, { day: '2026-09-15', seconds: 999 }] }
    const text = await loadStudentContext('tok', user, new Date('2026-09-23T12:00:00Z').getTime())
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

  it('устаревший профиль отдаётся сразу, а свежий собирается в фоне', async () => {
    let calls = 0
    let level = 'A2'
    fetchImpl.value = async (url) => {
      if (backendPath(url) === '/mobile/level-progress') {
        calls += 1
        return jsonRes({ level })
      }
      return new Response(null, { status: 404 })
    }
    const t0 = 1_000_000
    expect(await loadStudentContext('tok', user, t0)).toContain('Уровень курса: A2')
    level = 'B1'
    // Звонок не ждёт шесть ручек бэкенда: ответ идёт с прежним профилем...
    expect(await loadStudentContext('tok', user, t0 + CONTEXT_TTL_MS + 1)).toContain('Уровень курса: A2')
    expect(calls).toBe(2)
    // ...а следующий вопрос уже видит свежий, без нового похода в сеть.
    await new Promise((r) => setTimeout(r, 0))
    expect(await loadStudentContext('tok', user, t0 + CONTEXT_TTL_MS + 2)).toContain('Уровень курса: B1')
    expect(calls).toBe(2)
  })

  it('совсем старый профиль не отдаётся — ждём свежий', async () => {
    let level = 'A2'
    fetchImpl.value = async (url) =>
      backendPath(url) === '/mobile/level-progress' ? jsonRes({ level }) : new Response(null, { status: 404 })
    const t0 = 1_000_000
    await loadStudentContext('tok', user, t0)
    level = 'B1'
    expect(await loadStudentContext('tok', user, t0 + CONTEXT_STALE_MS + 1)).toContain('Уровень курса: B1')
  })

  it('одновременные вопросы делят одну сборку профиля', async () => {
    let calls = 0
    fetchImpl.value = async (url) => {
      if (backendPath(url) === '/mobile/level-progress') {
        calls += 1
        return jsonRes({ level: 'A2' })
      }
      return new Response(null, { status: 404 })
    }
    // Черновой и окончательный вопрос звонка приходят почти разом.
    const [a, b] = await Promise.all([loadStudentContext('tok', user, 0), loadStudentContext('tok', user, 1)])
    expect(a).toBe(b)
    expect(calls).toBe(1)
  })

  it('прогрев начинает сборку и не ждёт её', async () => {
    let calls = 0
    fetchImpl.value = async (url) => {
      if (backendPath(url) === '/mobile/level-progress') {
        calls += 1
        return jsonRes({ level: 'A2' })
      }
      return new Response(null, { status: 404 })
    }
    expect(warmStudentContext('tok', user)).toBeUndefined()
    warmStudentContext(null, user) // без токена — тихо
    expect(calls).toBe(1)
    await new Promise((r) => setTimeout(r, 0))
    expect(await loadStudentContext('tok', user)).toContain('Уровень курса: A2')
    expect(calls).toBe(1)
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
