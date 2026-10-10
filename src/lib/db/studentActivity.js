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

/** Миграция, с которой кабинет считает решённые задания по суткам (skill_day). */
export const SKILL_DAY_MIGRATION = '0016_skill_day.sql'

/**
 * Когда начался учёт заданий по суткам — время применения миграции 0016. Суток
 * раньше этого момента нет, и неделя, начавшаяся до него, посчитана не целиком:
 * карточка в такую неделю показывает не «за неделю», а всего решённого
 * (решение владельца 10.10). null — миграции на инстансе нет (runMigrations
 * глотает ошибки): тогда skill_day не читаем вовсе, иначе «relation does not
 * exist» уронил бы всю ручку.
 */
async function loadSkillDaySince(sql) {
  const rows = await sql`select applied_at from schema_migrations where name = ${SKILL_DAY_MIGRATION}`
  return rows[0]?.applied_at ?? null
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
    return { stats: null, goal: null, week: null, voice: [], trainer: [], tasks: [], practice: [], practiceSince: null }
  }
  const from = windowStart(now)
  // Читаем ПО ОДНОМУ, а не одним Promise.all: postgres.js открывает новое
  // соединение под каждый одновременный запрос, пока в пуле есть место, а пул
  // (max 10, см. sql.js) общий с голосом, навыками и практикой самих учеников.
  // Десять запросов разом на каждое открытие карточки заняли бы у них весь пул.
  // Параллельность осталась только внутри loadEcosystemWeek (три запроса),
  // поэтому карточка держит не больше трёх соединений. Запросы
  // короткие, по первичным ключам, а карточку открывают не чаще раза в пять
  // минут (кэш в браузере): лишние миллисекунды ожидания дешевле, чем нехватка
  // соединений у живых учеников.
  const stats = await loadSkillStats(profileId, sql)
  const goal = await loadLevelGoal(profileId, sql)
  const week = await loadEcosystemWeek(profileId, now, sql)
  // Минуты тьютора — seconds + pool_seconds. Разговор за докупленные минуты
  // пишется в pool_seconds, а НЕ в seconds (usage.js, recordSession; миграция
  // 0006): seconds — расход против лимитов, и купленное его съедать не должно.
  // Карточке же важно, сколько ученик говорил на самом деле, откуда бы ни шло
  // списание, — иначе говорящий на купленных минутах выглядел бы молчуном.
  // Первичный ключ (device_id, day) даёт одну строку на сутки: группировать и
  // суммировать нечего.
  const voice = await sql`
    select to_char(day, 'YYYY-MM-DD') as day, (seconds + pool_seconds)::int as seconds
    from voice_usage
    where device_id = ${profileId} and day >= ${from}
  `
  const trainer = await sql`
    select to_char(day, 'YYYY-MM-DD') as day, coalesce(sum(seconds), 0)::int as seconds
    from activity_time
    where profile_id = ${profileId} and day >= ${from}
    group by day
  `
  const practiceSince = await loadSkillDaySince(sql)
  const tasks = practiceSince
    ? await sql`
        select to_char(day, 'YYYY-MM-DD') as day, tasks, first_try
        from skill_day
        where profile_id = ${profileId} and day >= ${from}
      `
    : []
  const practice = await sql`select module, updated_at from practice_state where profile_id = ${profileId}`
  return { stats, goal, week, voice, trainer, tasks, practice, practiceSince }
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

/**
 * Секунды разговора с тьютором за неделю — суммой тех же суточных строк, что
 * уходят в days. Берём не voiceSeconds недельной сводки (loadEcosystemWeek): та
 * складывает одну колонку seconds и не видит pool_seconds, то есть у ученика,
 * который говорит на докупленных минутах, неделя показала бы ноль при
 * ненулевых днях. loadEcosystemWeek кормит и помощника ученика, поэтому
 * чинить его ради этой ручки нельзя — это отдельное решение; пока он слеп к
 * pool_seconds, неделю карточки считаем сами. Заодно сумма дней недели и итог
 * недели не могут разойтись. Даты — строки 'YYYY-MM-DD', их порядок совпадает с
 * календарным, поэтому сравниваем как строки.
 */
function weekTutorSeconds(voiceRows, week) {
  let total = 0
  for (const r of voiceRows || []) {
    if (r?.day >= week.weekStart && r.day < week.weekEndExclusive) total += Number(r.seconds) || 0
  }
  return total
}

/** Раздел → самое позднее updated_at его модулей; свежее — выше. */
function practiceAreas(rows) {
  const latest = new Map()
  for (const r of rows || []) {
    // Словарь — обычный объект: по имени constructor, toString или __proto__ он
    // отдал бы то, что лежит в прототипе, и это стало бы «разделом» ответа.
    // Из хранилища такое имя сегодня не придёт (savePracticeState пускает только
    // свои модули), но ответ не должен зависеть от того, что туда пишут.
    if (!Object.hasOwn(PRACTICE_AREA_BY_MODULE, r?.module)) continue
    const area = PRACTICE_AREA_BY_MODULE[r.module]
    const at = new Date(r.updated_at)
    if (Number.isNaN(at.getTime())) continue
    const prev = latest.get(area)
    if (!prev || at > prev) latest.set(area, at)
  }
  return [...latest.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([area, at]) => ({ area, updatedAt: at.toISOString() }))
}

/** Момент как ISO-строка; непонятное значение — null, а не «Invalid Date» в ответе. */
function isoOrNull(value) {
  if (!value) return null
  const at = new Date(value)
  return Number.isNaN(at.getTime()) ? null : at.toISOString()
}

/**
 * Тело ответа ручки. Чистая функция — вся арифметика проверяема без БД.
 *
 * Навыки — тем же rankSkills и skillHighlights, что и у «Главной» ученика:
 * преподаватель и ученик видят одни и те же проценты. done едет рядом: «72%» на
 * трёх заданиях и на трёхстах — разные вещи, и карточке надо их различать.
 *
 * practiceTrackedSince — с какого момента задания считаются по суткам (null —
 * учёта нет). По нему карточка решает, посчитана ли текущая неделя целиком.
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
    week: raw?.week
      ? {
          weekStart: raw.week.weekStart,
          modules: buildWeeklySummary({ ...raw.week, voiceSeconds: weekTutorSeconds(raw.voice, raw.week) }),
        }
      : null,
    days: mergeDays(raw),
    practice: practiceAreas(raw?.practice),
    practiceTrackedSince: isoOrNull(raw?.practiceSince),
  }
}
