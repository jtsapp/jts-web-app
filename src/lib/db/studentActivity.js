// Активность ученика из базы кабинета — для карточки «Мои студенты» в админке
// (ручка /api/admin/student-activity, spec-student-activity §4). Навыки, цель,
// минуты тьютора и тренажёров, решённые задания и разделы «Практики» живут
// здесь, а не в бэкенде, поэтому преподаватель получает их отсюда.
//
// Только чтение и только узкие колонки по первичным ключам. Из practice_state
// берём module и updated_at, без state: jsonb бывает в десятки КБ, а карточке
// нужно лишь «когда занимался». call_log (разговоры с тьютором) не читаем вовсе —
// это личное, преподавателю показываем только минуты.

import { getSql } from './sql.js'
import { loadSkillStats } from './skillStats.js'
import { loadLevelGoal } from './levelGoal.js'
import { loadEcosystemWeek, buildWeeklySummary } from './ecosystem.js'
import { rankSkills, skillHighlights } from '../levelProgress.js'

/** Окно календаря — те же полгода, что у бэкенда (StudentActivityService.DAYS). */
export const ACTIVITY_DAYS = 182

// Модули practice_state → разделы «Практики», как их видит преподаватель.
// Словарь и воркбуки хранятся несколькими модулями, а раздел у каждого один.
// Модуля нет в списке — раздел не показываем, а не придумываем ему имя.
export const PRACTICE_AREA_BY_MODULE = {
  vocab: 'vocab',
  vocabLearned: 'vocab',
  vocabMisses: 'vocab',
  workbooks: 'workbooks',
  workbook: 'workbooks',
  grammar: 'grammar',
  listening: 'listening',
  shadowing: 'shadowing',
  situations: 'situations',
  writing: 'writing',
  reading: 'reading',
  words: 'words',
  verbs: 'verbs',
  listenchoose: 'listenchoose',
}

/** Первый день окна, 'YYYY-MM-DD' в UTC: сегодня и ещё ACTIVITY_DAYS − 1 суток назад. */
export function windowStart(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  d.setUTCDate(d.getUTCDate() - (ACTIVITY_DAYS - 1))
  return d.toISOString().slice(0, 10)
}

/**
 * Сырые данные ученика. Мягкая деградация как во всех db-модулях: без БД —
 * пусто, а не исключение (ручка до сюда без БД и не доходит, это страховка).
 */
export async function loadStudentAppActivity(profileId, now = new Date(), sql = getSql()) {
  if (!sql) {
    return { stats: null, goal: null, week: null, voice: [], trainer: [], tasks: [], practice: [] }
  }
  const from = windowStart(now)
  // Читаем ПО ОДНОМУ, а не одним Promise.all: postgres.js открывает новое
  // соединение под каждый одновременный запрос, пока в пуле есть место, а пул
  // (max 10, см. sql.js) общий с голосом, навыками и практикой самих учеников.
  // Девять запросов разом на каждое открытие карточки занимали бы у них почти
  // весь пул. Параллельность осталась только внутри loadEcosystemWeek (три
  // запроса), поэтому карточка держит не больше трёх соединений. Запросы
  // короткие, по первичным ключам, а карточку открывают не чаще раза в пять
  // минут (кэш в браузере): лишние миллисекунды ожидания дешевле, чем нехватка
  // соединений у живых учеников.
  const stats = await loadSkillStats(profileId, sql)
  const goal = await loadLevelGoal(profileId, sql)
  const week = await loadEcosystemWeek(profileId, now, sql)
  const voice = await sql`
    select to_char(day, 'YYYY-MM-DD') as day, coalesce(sum(seconds), 0)::int as seconds
    from voice_usage
    where device_id = ${profileId} and day >= ${from}
    group by day
  `
  const trainer = await sql`
    select to_char(day, 'YYYY-MM-DD') as day, coalesce(sum(seconds), 0)::int as seconds
    from activity_time
    where profile_id = ${profileId} and day >= ${from}
    group by day
  `
  const tasks = await sql`
    select to_char(day, 'YYYY-MM-DD') as day, tasks, first_try
    from skill_day
    where profile_id = ${profileId} and day >= ${from}
  `
  const practice = await sql`select module, updated_at from practice_state where profile_id = ${profileId}`
  return { stats, goal, week, voice, trainer, tasks, practice }
}

/** Сутки из трёх таблиц — в одну строку на день; дни без активности не отдаём. */
function mergeDays(raw) {
  const byDay = new Map()
  const row = (day) => {
    if (!byDay.has(day)) {
      byDay.set(day, { date: day, tutorSeconds: 0, trainerSeconds: 0, practiceTasks: 0, practiceFirstTry: 0 })
    }
    return byDay.get(day)
  }
  for (const r of raw?.voice || []) row(r.day).tutorSeconds += Number(r.seconds) || 0
  for (const r of raw?.trainer || []) row(r.day).trainerSeconds += Number(r.seconds) || 0
  for (const r of raw?.tasks || []) {
    const d = row(r.day)
    d.practiceTasks += Number(r.tasks) || 0
    d.practiceFirstTry += Number(r.first_try) || 0
  }
  return [...byDay.values()]
    .filter((d) => d.tutorSeconds > 0 || d.trainerSeconds > 0 || d.practiceTasks > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** Раздел → самое позднее updated_at его модулей; свежее — выше. */
function practiceAreas(rows) {
  const latest = new Map()
  for (const r of rows || []) {
    const area = PRACTICE_AREA_BY_MODULE[r?.module]
    if (!area) continue
    const at = new Date(r.updated_at)
    if (Number.isNaN(at.getTime())) continue
    const prev = latest.get(area)
    if (!prev || at > prev) latest.set(area, at)
  }
  return [...latest.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([area, at]) => ({ area, updatedAt: at.toISOString() }))
}

/**
 * Тело ответа ручки. Чистая функция — вся арифметика проверяема без БД.
 *
 * Навыки — тем же rankSkills и skillHighlights, что и у «Главной» ученика:
 * преподаватель и ученик видят одни и те же проценты. done едет рядом: «72%» на
 * трёх заданиях и на трёхстах — разные вещи, и карточке надо их различать.
 */
export function buildStudentAppActivity(raw) {
  const stats = raw?.stats || {}
  const ranked = rankSkills(stats)
  const { strongest, weakest } = skillHighlights(ranked)
  return {
    configured: true,
    skills: ranked.map(({ skill, percent }) => ({ skill, percent, done: Number(stats?.[skill]?.done) || 0 })),
    strongest: strongest ? strongest.skill : null,
    weakest: weakest ? weakest.skill : null,
    goal: raw?.goal || null,
    week: raw?.week ? { weekStart: raw.week.weekStart, modules: buildWeeklySummary(raw.week) } : null,
    days: mergeDays(raw),
    practice: practiceAreas(raw?.practice),
  }
}
