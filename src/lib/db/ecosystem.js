// Недельная сводка минут по пяти тренажёрам экосистемы JTS — «actual» из
// ECOSYSTEM_WEEKLY_GOALS в ТЗ «Roadmap & AI Notification Engine» (п.7, таблица
// student_ecosystem_progress). Цели («target») считает src/lib/roadmap.js.
//
// Своей таблицы у сводки нет: каждое время берётся там, где его уже пишут, —
// второй источник правды разъехался бы с первым. Здесь только чтение и сведение:
//   ai_tutor       ← voice_usage(device_id, day, seconds) — та же строка, по
//                    которой считается лимит 20 мин/день, и она есть даже когда
//                    агент не дописал звонок в call_log (на проде такое было).
//   shadowing      ← shadowing_assess(profile_id, week_key, used) — кредиты
//                    оценок. Это ОЦЕНКА СВЕРХУ, а не замер: кредит покрывает до
//                    30 с аудио, реальную длительность записи мы нигде не храним.
//   workbooks,
//   vocabulary_sr  ← activity_time(profile_id, module, day, seconds) — активное
//                    время на экране воркбука и практики «Словаря», его считает
//                    хук src/lib/useTimeOnTask.js. Пишется только залогиненным:
//                    у анонима нет плана, сравнивать его минуты не с чем.
// Модуля media_practice в приложении нет — он отдаётся нулём с честным флагом
// tracked:'none': фронту нужно отличать «ноль минут» от «мы это не меряем»,
// иначе дашборд соврёт студенту дефицитом.
//
// completed_lessons из ТЗ здесь НЕТ намеренно. Соблазн взять lesson_progress из
// нашей базы — ловушка: там лежат сценарии голосового тьютора
// (/api/lesson/complete) и старый «План уроков», а прогресс «Обучения» (тот
// самый силлабус, по которому считается Roadmap) живёт на JTS-бэкенде и
// читается по токену с moduleId — см. src/learning/lessonProgress.js. Взять
// локальную таблицу значило бы показывать студенту чужой счётчик.
//
// Ключ везде один — profileId из resolveProfileId ('user-<id>' или device-id), в
// voice_usage он лежит в колонке device_id по историческим причинам.

import { getSql } from './sql.js'
import { SECONDS_PER_CREDIT, isoWeekKey } from './shadowingBudget.js'
import { ECOSYSTEM_MODULES, splitEcosystemMinutes } from '../roadmap.js'

// Какие модули реально дают цифру, а какие — заглушка. Список ведём здесь, а не
// на фронте: появится учёт медиа — правка в одном месте.
// Порядок — как в ТЗ п.5.5, чтобы ключи сводки и целей шли одинаково.
export const TRACKED = {
  ai_tutor: 'measured', // секунды разговора
  workbooks: 'measured', // активное время на экране воркбука
  shadowing: 'estimated', // кредиты × 30 с, потолок
  media_practice: 'none',
  vocabulary_sr: 'measured', // активное время в практике «Словаря»
}

// Понедельник ISO-недели, в которую попала дата, и следующий понедельник —
// границы запроса. UTC, как и ключ недели в shadowing_assess: иначе воскресный
// вечер в Алматы попадал бы в разные недели у бюджета и у сводки.
export function weekBounds(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7 // 1..7 (пн..вс)
  d.setUTCDate(d.getUTCDate() - (day - 1))
  const end = new Date(d)
  end.setUTCDate(end.getUTCDate() + 7)
  return {
    weekKey: isoWeekKey(date),
    weekStart: d.toISOString().slice(0, 10),
    weekEndExclusive: end.toISOString().slice(0, 10),
  }
}

function toMinutes(seconds) {
  const n = Number(seconds)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n / 60)
}

/**
 * Сводит сырые цифры в объект вида { ai_tutor: {actual, tracked, target?}, … }.
 * Чистая функция — вся арифметика проверяема без БД.
 *
 * @param {object} raw
 * @param {number} raw.voiceSeconds       сумма voice_usage.seconds за неделю
 * @param {number} raw.shadowingCredits   shadowing_assess.used за неделю
 * @param {Record<string, number>} [raw.activitySeconds] activity_time за неделю по модулям
 * @param {number} [raw.homeworkMinutesPerDay] план студента; без него целей нет
 */
export function buildWeeklySummary(raw = {}) {
  const activity = raw.activitySeconds || {}
  const actual = {
    ai_tutor: toMinutes(raw.voiceSeconds),
    workbooks: toMinutes(activity.workbooks),
    shadowing: toMinutes(Number(raw.shadowingCredits || 0) * SECONDS_PER_CREDIT),
    media_practice: 0,
    vocabulary_sr: toMinutes(activity.vocabulary_sr),
  }
  // Цели считаем только если план известен. Пока таблицы roadmaps нет, план
  // приходит параметром запроса — заменить на чтение плана, когда она появится.
  const hw = Number(raw.homeworkMinutesPerDay)
  const targets =
    Number.isFinite(hw) && hw > 0 ? splitEcosystemMinutes(Math.trunc(hw) * 7) : null

  const modules = {}
  for (const key of ECOSYSTEM_MODULES) {
    modules[key] = {
      actualMinutes: actual[key],
      targetMinutes: targets ? targets[key] : null,
      tracked: TRACKED[key],
    }
  }
  return modules
}

/**
 * Читает неделю студента. Мягкая деградация как во всех db-модулях: без
 * DATABASE_URL возвращаем нули, а не бросаем — дашборд не должен падать вместе
 * с базой.
 */
export async function loadEcosystemWeek(profileId, now = new Date(), sql = getSql()) {
  const bounds = weekBounds(now)
  if (!sql) return { ...bounds, voiceSeconds: 0, shadowingCredits: 0, activitySeconds: {} }
  const [voice, shadow, activity] = await Promise.all([
    sql`
      select coalesce(sum(seconds), 0)::int as seconds from voice_usage
      where device_id = ${profileId}
        and day >= ${bounds.weekStart} and day < ${bounds.weekEndExclusive}
    `,
    sql`
      select used from shadowing_assess
      where profile_id = ${profileId} and week_key = ${bounds.weekKey}
    `,
    sql`
      select module, coalesce(sum(seconds), 0)::int as seconds from activity_time
      where profile_id = ${profileId}
        and day >= ${bounds.weekStart} and day < ${bounds.weekEndExclusive}
      group by module
    `,
  ])
  const activitySeconds = {}
  for (const row of activity) activitySeconds[row.module] = row.seconds
  return {
    ...bounds,
    voiceSeconds: voice[0]?.seconds ?? 0,
    shadowingCredits: shadow[0]?.used ?? 0,
    activitySeconds,
  }
}
