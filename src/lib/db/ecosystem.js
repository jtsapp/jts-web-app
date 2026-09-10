// Недельная сводка минут по пяти тренажёрам экосистемы JTS — «actual» из
// ECOSYSTEM_WEEKLY_GOALS в ТЗ «Roadmap & AI Notification Engine» (п.7, таблица
// student_ecosystem_progress). Цели («target») считает src/lib/roadmap.js.
//
// Отдельной таблицы под минуты НЕТ намеренно: два модуля из пяти уже пишут своё
// время в собственные таблицы, и дублировать их значило бы завести второй
// источник правды, который разъедется с первым. Здесь только чтение и сведение:
//   ai_tutor  ← voice_usage(device_id, day, seconds) — та же строка, по которой
//               считается лимит 20 мин/день, и она есть даже когда агент не
//               дописал звонок в call_log (на проде такое уже было).
//   shadowing ← shadowing_assess(profile_id, week_key, used) — кредиты оценок.
//               Это ОЦЕНКА СВЕРХУ, а не замер: кредит покрывает до 30 с аудио,
//               реальную длительность записи мы нигде не храним.
// Остальные три модуля времени не пишут вовсе, поэтому отдаются нулями с
// честным флагом tracked:false — фронту нужно знать разницу между «ноль минут»
// и «мы это не меряем», иначе дашборд соврёт студенту дефицитом.
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
// на фронте: подключат учёт времени в «Обучении» — правка в одном месте.
// Порядок — как в ТЗ п.5.5, чтобы ключи сводки и целей шли одинаково.
export const TRACKED = {
  ai_tutor: 'measured', // секунды разговора
  workbooks: 'none',
  shadowing: 'estimated', // кредиты × 30 с, потолок
  media_practice: 'none',
  vocabulary_sr: 'none',
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
 * @param {number} [raw.homeworkMinutesPerDay] план студента; без него целей нет
 */
export function buildWeeklySummary(raw = {}) {
  const actual = {
    ai_tutor: toMinutes(raw.voiceSeconds),
    shadowing: toMinutes(Number(raw.shadowingCredits || 0) * SECONDS_PER_CREDIT),
    workbooks: 0,
    media_practice: 0,
    vocabulary_sr: 0,
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
  if (!sql) return { ...bounds, voiceSeconds: 0, shadowingCredits: 0 }
  const [voice, shadow] = await Promise.all([
    sql`
      select coalesce(sum(seconds), 0)::int as seconds from voice_usage
      where device_id = ${profileId}
        and day >= ${bounds.weekStart} and day < ${bounds.weekEndExclusive}
    `,
    sql`
      select used from shadowing_assess
      where profile_id = ${profileId} and week_key = ${bounds.weekKey}
    `,
  ])
  return {
    ...bounds,
    voiceSeconds: voice[0]?.seconds ?? 0,
    shadowingCredits: shadow[0]?.used ?? 0,
  }
}
