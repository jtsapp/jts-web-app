import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  ACTIVITY_DAYS,
  PRACTICE_AREA_BY_MODULE,
  windowStart,
  loadStudentAppActivity,
  buildStudentAppActivity,
} from './studentActivity.js'
import { PRACTICE_MODULES } from '../practiceContract.js'
import { levelSummary } from '../levelProgress.js'

// Поддельный sql-тег: запоминает тексты и отвечает по началу запроса. Точность
// SQL — на Postgres; здесь контракт: узкие колонки, ключ ученика, окно в 182 суток.
function makeFakeSql(rowsByPrefix = {}) {
  const log = []
  const tag = async (strings, ...vals) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim().toLowerCase()
    log.push({ q, vals })
    for (const [prefix, rows] of Object.entries(rowsByPrefix)) {
      if (q.includes(prefix)) return rows
    }
    return []
  }
  return { sql: tag, log }
}

// Отвечает по таблице, из которой читает запрос. Дневные запросы календаря
// узнаются по to_char: недельная сводка (loadEcosystemWeek) читает те же
// voice_usage и activity_time, но свои цифры здесь не подмешивает.
// voice — строки или функция от текста запроса (см. voiceUsageRows).
function makeTableSql({ stat = [], goal = [], voice = [], trainer = [], tasks = [], practice = [] }) {
  return async (strings) => {
    const q = strings.join('?').replace(/\s+/g, ' ').toLowerCase()
    const daily = q.includes('to_char')
    if (q.includes('from skill_stat')) return stat
    if (q.includes('from level_goal')) return goal
    if (daily && q.includes('from voice_usage')) return typeof voice === 'function' ? voice(q) : voice
    if (daily && q.includes('from activity_time')) return trainer
    if (q.includes('from skill_day')) return tasks
    if (q.includes('from practice_state')) return practice
    return []
  }
}

// voice_usage с двумя счётчиками: seconds — расход против лимитов, pool_seconds —
// разговор за докупленные минуты (usage.js, recordSession). Поддельная база
// складывает ровно то, что запрос назвал в списке выбора: запрос без
// `seconds + pool_seconds` недосчитает купленные минуты, как и настоящий.
function voiceUsageRows(table) {
  return (q) =>
    table.map((r) => ({
      day: r.day,
      seconds: r.seconds + (/seconds \+ pool_seconds/.test(q) ? r.pool_seconds : 0),
    }))
}

describe('windowStart', () => {
  // Сутки считаются по UTC, а сервер живёт в любом поясе. Под TZ=UTC (CI,
  // контейнер) локальные геттеры Date дают те же даты, что и UTC-шные, и тест
  // «а не по часовому поясу» не отличил бы одно от другого. Поэтому пояс
  // процесса сдвигаем на UTC+5 — там, где живут преподаватели, — и возвращаем.
  const originalTz = process.env.TZ
  beforeAll(() => {
    process.env.TZ = 'Asia/Almaty'
  })
  afterAll(() => {
    // Присвоение undefined записало бы строку 'undefined', поэтому — delete.
    if (originalTz === undefined) delete process.env.TZ
    else process.env.TZ = originalTz
  })

  it('предпосылка: пояс процесса сдвинут от UTC, иначе тесты ниже беззубые', () => {
    // 21:00 UTC — в Алматы уже следующие сутки. Если подмена пояса не сработала
    // (например, пул потоков: там process.env.TZ часов не переводит), красным
    // станет этот тест, а не тихо потеряют силу остальные.
    expect(new Date('2026-10-08T21:00:00Z').getDate()).toBe(9)
  })

  it('сегодня и ещё 181 сутки назад, в UTC', () => {
    expect(ACTIVITY_DAYS).toBe(182)
    expect(windowStart(new Date('2026-10-08T03:00:00Z'))).toBe('2026-04-10')
  })

  it('сутки считает по UTC, а не по часовому поясу сервера', () => {
    // 21:00 UTC 8 октября: в Алматы уже 9-е, а база кабинета ещё в 8-м.
    expect(windowStart(new Date('2026-10-09T02:00:00+05:00'))).toBe('2026-04-10')
    expect(windowStart(new Date('2026-10-08T23:59:59.999Z'))).toBe('2026-04-10')
    expect(windowStart(new Date('2026-10-09T00:00:00.000Z'))).toBe('2026-04-11')
  })

  it('окно переходит через границу года и високосный день', () => {
    expect(windowStart(new Date('2026-01-05T12:00:00Z'))).toBe('2025-07-08')
    expect(windowStart(new Date('2028-03-01T12:00:00Z'))).toBe('2027-09-02')
  })
})

describe('loadStudentAppActivity', () => {
  it('читает только узкие колонки по ключу ученика', async () => {
    const { sql, log } = makeFakeSql()
    await loadStudentAppActivity('user-141', new Date('2026-10-08T03:00:00Z'), sql)

    const practice = log.find((e) => e.q.includes('from practice_state'))
    expect(practice.q).toContain('select module, updated_at')
    // state — jsonb до десятков КБ, карточке не нужен.
    expect(practice.q).not.toMatch(/\bstate\b(?!_)/)
    expect(practice.vals).toEqual(['user-141'])

    // Дневные запросы календаря — те, что отдают дату строкой. Недельная сводка
    // (loadEcosystemWeek) тоже читает voice_usage/activity_time, но со своими
    // границами недели — её здесь не считаем.
    const days = log.filter((e) => e.q.includes("to_char(day, 'yyyy-mm-dd')"))
    expect(days).toHaveLength(3)
    for (const d of days) {
      expect(d.vals).toEqual(['user-141', '2026-04-10'])
    }
    expect(log.some((e) => e.q.includes('call_log'))).toBe(false)
  })

  it('без БД — пусто, а не падение', async () => {
    const raw = await loadStudentAppActivity('user-141', new Date('2026-10-08T03:00:00Z'), null)
    expect(raw).toMatchObject({ stats: null, goal: null, voice: [], trainer: [], tasks: [], practice: [] })
  })

  it('без БД сырьё всё равно сводится в полный ответ', async () => {
    const raw = await loadStudentAppActivity('user-141', new Date('2026-10-08T03:00:00Z'), null)
    expect(buildStudentAppActivity(raw)).toMatchObject({
      configured: true,
      strongest: null,
      weakest: null,
      goal: null,
      week: null,
      days: [],
      practice: [],
    })
  })

  // Пул соединений (max 10) общий с запросами самих учеников, а postgres.js берёт
  // новое соединение под каждый одновременный запрос. Поэтому карточка не должна
  // выпускать запросы пачкой: единственная параллель — три запроса недельной
  // сводки внутри loadEcosystemWeek, и это потолок для всей карточки.
  it('читает запросы по одному: в полёте одновременно не больше трёх', async () => {
    let inFlight = 0
    let peak = 0
    let total = 0
    const sql = async () => {
      total += 1
      inFlight += 1
      peak = Math.max(peak, inFlight)
      // Ответ приходит не сразу, как по сети: без ожидания запрос «заканчивался»
      // бы до следующего, и пачка, выпущенная разом, пика не накопила бы.
      await Promise.resolve()
      inFlight -= 1
      return []
    }
    await loadStudentAppActivity('user-141', new Date('2026-10-08T03:00:00Z'), sql)

    // Девять запросов — бюджет из spec §6; тест не должен проходить вхолостую.
    expect(total).toBe(9)
    expect(peak).toBeLessThanOrEqual(3)
  })

  // Купленные минуты тьютора пишутся в voice_usage.pool_seconds, а не в seconds
  // (usage.js, recordSession). Запрос, читающий одну seconds, показал бы ученика,
  // говорящего только на купленных минутах, молчуном — и в днях, и в неделе.
  it('минуты тьютора — seconds плюс pool_seconds: разговор за купленные минуты не теряется', async () => {
    const sql = makeTableSql({
      voice: voiceUsageRows([
        { day: '2026-10-06', seconds: 300, pool_seconds: 420 }, // лимит и пул в один день
        { day: '2026-10-07', seconds: 0, pool_seconds: 1500 }, // только купленные минуты
      ]),
    })
    const raw = await loadStudentAppActivity('user-141', new Date('2026-10-08T03:00:00Z'), sql)
    expect(raw.voice).toEqual([
      { day: '2026-10-06', seconds: 720 },
      { day: '2026-10-07', seconds: 1500 },
    ])

    // Недельный запрос loadEcosystemWeek в этой поддельной базе отвечает пустотой —
    // как сводка, слепая к pool_seconds. Неделя обязана прийти из суточных строк.
    const out = buildStudentAppActivity(raw)
    expect(out.days.map((d) => [d.date, d.tutorSeconds])).toEqual([
      ['2026-10-06', 720],
      ['2026-10-07', 1500],
    ])
    expect(out.week.modules.ai_tutor.actualMinutes).toBe(37) // 2220 с
  })

  // Перепутанные voice и trainer молча выдали бы минуты тренажёров за минуты
  // тьютора. Тест на тексты запросов этого не видит — здесь проверяем, что
  // каждый ответ лёг в своё поле.
  it('раскладывает ответы по своим полям: тьютор — voice_usage, тренажёры — activity_time', async () => {
    const sql = makeTableSql({
      stat: [{ skill: 'grammar', tasks_done: 50, first_try_correct: 45 }],
      goal: [{ target_level: 'B2', from_level: 'A1' }],
      voice: [{ day: '2026-10-06', seconds: 720 }],
      trainer: [{ day: '2026-10-06', seconds: 1200 }],
      tasks: [{ day: '2026-10-03', tasks: 34, first_try: 27 }],
      practice: [{ module: 'grammar', updated_at: new Date('2026-10-07T15:20:11Z') }],
    })
    const raw = await loadStudentAppActivity('user-141', new Date('2026-10-08T03:00:00Z'), sql)

    expect(raw.stats.grammar).toEqual({ done: 50, firstTry: 45 })
    expect(raw.goal).toEqual({ target: 'B2', from: 'A1' })
    expect(raw.week.weekStart).toBe('2026-10-05')
    expect(raw.voice).toEqual([{ day: '2026-10-06', seconds: 720 }])
    expect(raw.trainer).toEqual([{ day: '2026-10-06', seconds: 1200 }])
    expect(raw.tasks).toEqual([{ day: '2026-10-03', tasks: 34, first_try: 27 }])
    expect(raw.practice).toHaveLength(1)

    expect(buildStudentAppActivity(raw).days).toEqual([
      { date: '2026-10-03', tutorSeconds: 0, trainerSeconds: 0, practiceTasks: 34, practiceFirstTry: 27 },
      { date: '2026-10-06', tutorSeconds: 720, trainerSeconds: 1200, practiceTasks: 0, practiceFirstTry: 0 },
    ])
  })
})

describe('buildStudentAppActivity', () => {
  // voiceSeconds: 0 — так недельная сводка помощника (loadEcosystemWeek) видит
  // ученика, который говорит только на докупленных минутах: она читает одну
  // seconds. Карточка эту цифру не берёт, минуты тьютора идут из суточных строк.
  const week = {
    weekStart: '2026-10-05',
    weekEndExclusive: '2026-10-12',
    voiceSeconds: 0,
    shadowingCredits: 8,
    activitySeconds: { workbooks: 1200 },
  }

  it('навыки — тем же рейтингом, что у «Главной», с объёмом', () => {
    const out = buildStudentAppActivity({
      stats: { grammar: { done: 50, firstTry: 45 }, listening: { done: 30, firstTry: 9 } },
      week,
    })
    expect(out.configured).toBe(true)
    expect(out.skills).toHaveLength(6)
    expect(out.skills[0]).toEqual({ skill: 'grammar', percent: 90, done: 50 })
    expect(out.strongest).toBe('grammar')
    expect(out.weakest).not.toBe(null)
  })

  it('у новичка нет ни сильной, ни слабой стороны', () => {
    const out = buildStudentAppActivity({ stats: null, week })
    expect(out.strongest).toBe(null)
    expect(out.weakest).toBe(null)
    expect(out.skills.every((s) => s.percent === 0 && s.done === 0)).toBe(true)
  })

  it('сильная и слабая сторона — те же, что у «Главной» ученика', () => {
    const cases = [
      { grammar: { done: 50, firstTry: 45 }, listening: { done: 30, firstTry: 9 } },
      { vocab: { done: 3, firstTry: 3 } }, // заданий мало — процент придержан объёмом
      { reading: { done: 10, firstTry: 0 }, writing: { done: 40, firstTry: 40 } },
      { speaking: { done: 25, firstTry: 25 }, listening: { done: 25, firstTry: 25 } }, // ничья
      {},
    ]
    for (const stats of cases) {
      const home = levelSummary('A1', stats)
      const out = buildStudentAppActivity({ stats, week })
      expect(out.skills.map(({ skill, percent }) => ({ skill, percent }))).toEqual(home.ranked)
      expect(out.strongest).toBe(home.strongest ? home.strongest.skill : null)
      expect(out.weakest).toBe(home.weakest ? home.weakest.skill : null)
    }
  })

  it('слабой может оказаться ещё не тренированный навык — как на «Главной»', () => {
    // На «Главной» так и показывается; здесь это повторяем, а не обходим: две
    // карточки об одном ученике не должны спорить, что ему подтянуть.
    const out = buildStudentAppActivity({
      stats: { grammar: { done: 50, firstTry: 45 }, listening: { done: 30, firstTry: 9 } },
      week,
    })
    expect(out.weakest).toBe('vocab')
  })

  it('неделя: тьютор — из суточных строк, остальные модули — из сводки помощника, целей нет', () => {
    const out = buildStudentAppActivity({ week, voice: [{ day: '2026-10-06', seconds: 2100 }] })
    expect(out.week.weekStart).toBe('2026-10-05')
    expect(out.week.modules.ai_tutor).toMatchObject({ actualMinutes: 35, tracked: 'measured', targetMinutes: null })
    expect(out.week.modules.workbooks.actualMinutes).toBe(20)
    expect(out.week.modules.shadowing.tracked).toBe('estimated')
  })

  it('минуты тьютора за неделю — сумма суток этой недели, соседние недели не в счёт', () => {
    const out = buildStudentAppActivity({
      week,
      voice: [
        { day: '2026-10-04', seconds: 3000 }, // воскресенье прошлой недели
        { day: '2026-10-05', seconds: 600 }, // понедельник: начало недели входит
        { day: '2026-10-07', seconds: 1500 },
        { day: '2026-10-09', seconds: 20 },
        { day: '2026-10-10', seconds: 20 },
        { day: '2026-10-11', seconds: 20 }, // воскресенье: последний день недели
        { day: '2026-10-12', seconds: 4000 }, // понедельник следующей: weekEndExclusive не входит
      ],
    })
    // 600 + 1500 + 3 × 20 = 2160 с = 36 мин. Округляется сумма секунд, а не
    // минуты каждого дня: по дням вышло бы 10 + 25 + 0 + 0 + 0 = 35.
    expect(out.week.modules.ai_tutor.actualMinutes).toBe(36)

    // Итог недели не расходится с днями ответа: те же сутки, сложенные из days.
    const weekSeconds = out.days
      .filter((d) => d.date >= week.weekStart && d.date < week.weekEndExclusive)
      .reduce((sum, d) => sum + d.tutorSeconds, 0)
    expect(out.week.modules.ai_tutor.actualMinutes).toBe(Math.round(weekSeconds / 60))
  })

  // Недельная сводка помощника (loadEcosystemWeek) отдаёт week.voiceSeconds — сумму
  // одной колонки seconds, а она уже входит в суточные строки (seconds +
  // pool_seconds): сложить обе цифры значит посчитать seconds дважды. Общий каркас
  // week держит voiceSeconds: 0, и такая регрессия прошла бы мимо всех тестов выше.
  // Здесь число заведомо чужое: ни прибавлять его к строкам, ни брать вместо них нельзя.
  it('минуты тьютора за неделю — только суточные строки: voiceSeconds сводки помощника не подмешивается', () => {
    const voice = [
      { day: '2026-10-06', seconds: 720 },
      { day: '2026-10-07', seconds: 1500 },
    ]
    const rowsOnly = buildStudentAppActivity({ week, voice })
    const out = buildStudentAppActivity({ week: { ...week, voiceSeconds: 99999 }, voice })

    // 720 + 1500 = 2220 с = 37 мин. Со сложением вышло бы 1704.
    expect(rowsOnly.week.modules.ai_tutor.actualMinutes).toBe(37)
    expect(out.week.modules.ai_tutor.actualMinutes).toBe(rowsOnly.week.modules.ai_tutor.actualMinutes)
  })

  it('дни сводятся из трёх таблиц, пустые выкидываются, порядок — по дате', () => {
    const out = buildStudentAppActivity({
      week,
      voice: [{ day: '2026-10-06', seconds: 720 }, { day: '2026-10-01', seconds: 0 }],
      trainer: [{ day: '2026-10-06', seconds: 1200 }],
      tasks: [{ day: '2026-10-03', tasks: 34, first_try: 27 }],
    })
    expect(out.days).toEqual([
      { date: '2026-10-03', tutorSeconds: 0, trainerSeconds: 0, practiceTasks: 34, practiceFirstTry: 27 },
      { date: '2026-10-06', tutorSeconds: 720, trainerSeconds: 1200, practiceTasks: 0, practiceFirstTry: 0 },
    ])
  })

  it('модули практики сводятся в разделы, свежее — выше, незнакомые пропускаются', () => {
    const out = buildStudentAppActivity({
      week,
      practice: [
        { module: 'vocabLearned', updated_at: new Date('2026-10-01T10:00:00Z') },
        { module: 'vocab', updated_at: new Date('2026-10-05T10:00:00Z') },
        { module: 'grammar', updated_at: '2026-10-07T15:20:11.000Z' },
        { module: 'workbook', updated_at: new Date('2026-09-30T10:00:00Z') },
        { module: 'mystery', updated_at: new Date('2026-10-08T10:00:00Z') },
      ],
    })
    expect(out.practice).toEqual([
      { area: 'grammar', updatedAt: '2026-10-07T15:20:11.000Z' },
      { area: 'vocab', updatedAt: '2026-10-05T10:00:00.000Z' },
      { area: 'workbooks', updatedAt: '2026-09-30T10:00:00.000Z' },
    ])
  })

  it('унаследованные имена объекта (constructor, toString, __proto__) разделами не становятся', () => {
    const at = new Date('2026-10-02T08:00:00Z')
    const out = buildStudentAppActivity({
      week,
      practice: [
        { module: 'constructor', updated_at: at },
        { module: 'toString', updated_at: at },
        { module: '__proto__', updated_at: at },
        { module: 'hasOwnProperty', updated_at: at },
        { module: 'valueOf', updated_at: at },
        null,
        {},
        { module: 'reading', updated_at: at },
      ],
    })
    // Остаётся один настоящий раздел, и его имя — строка, а не функция из прототипа.
    expect(out.practice).toEqual([{ area: 'reading', updatedAt: '2026-10-02T08:00:00.000Z' }])
  })

  it('строка с непонятной датой пропускается, а не роняет весь ответ', () => {
    const out = buildStudentAppActivity({
      week,
      practice: [
        { module: 'grammar', updated_at: 'не дата' },
        { module: 'vocab', updated_at: undefined },
        { module: 'reading', updated_at: new Date('2026-10-02T08:00:00Z') },
      ],
    })
    expect(out.practice).toEqual([{ area: 'reading', updatedAt: '2026-10-02T08:00:00.000Z' }])
  })

  it('цель отдаётся как есть, без цели — null', () => {
    expect(buildStudentAppActivity({ week, goal: { target: 'B2', from: 'A1' } }).goal).toEqual({ target: 'B2', from: 'A1' })
    expect(buildStudentAppActivity({ week }).goal).toBe(null)
  })

  it('без данных отдаёт полный каркас ответа, а не пропущенные поля', () => {
    const out = buildStudentAppActivity({})
    expect(Object.keys(out).sort()).toEqual(
      ['configured', 'days', 'goal', 'practice', 'skills', 'strongest', 'weakest', 'week'],
    )
    expect(out).toMatchObject({ configured: true, strongest: null, weakest: null, goal: null, week: null, days: [], practice: [] })
    expect(out.skills).toHaveLength(6)
  })
})

describe('PRACTICE_AREA_BY_MODULE', () => {
  // Модуль без раздела у преподавателя не виден вовсе, и узнать об этом нечем:
  // ответ просто короче. Поэтому новый модуль хранилища практики обязан получить
  // раздел здесь (или явное решение его не показывать — правкой этого теста).
  it('знает каждый модуль хранилища практики и ни одного лишнего', () => {
    const unmapped = PRACTICE_MODULES.filter((m) => !Object.hasOwn(PRACTICE_AREA_BY_MODULE, m))
    const stray = Object.keys(PRACTICE_AREA_BY_MODULE).filter((m) => !PRACTICE_MODULES.includes(m))
    expect(unmapped).toEqual([])
    expect(stray).toEqual([])
  })
})
