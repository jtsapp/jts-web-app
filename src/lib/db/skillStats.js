// SQL-слой рейтинга навыков. profileId из resolveProfileId ('user-<id>').
// Мягкая деградация: getSql() === null → чтение отдаёт нули, запись — no-op.

import { getSql } from './sql.js'
import { SKILLS, emptyStats, skillLevel } from '../../practice/skillStatsCore.js'

export async function loadSkillStats(profileId, sql = getSql()) {
  const out = emptyStats()
  if (!sql) return out
  const rows = await sql`
    select skill, tasks_done, first_try_correct
    from skill_stat where profile_id = ${profileId}
  `
  for (const r of rows) {
    if (SKILLS.includes(r.skill)) {
      out[r.skill] = { done: Number(r.tasks_done) || 0, firstTry: Number(r.first_try_correct) || 0 }
    }
  }
  return out
}

// Атомарный инкремент: складываем дельты с текущими значениями прямо в БД,
// поэтому синк с разных устройств не теряется (в отличие от записи абсолютов).
// Все навыки в одной транзакции: при сбое посреди батча ничего не применяется,
// значит повторная отправка клиентом не пере-считает уже успевшие навыки.
//
// Там же — строка суток skill_day с суммой пачки: календарь активности ученика
// у преподавателя иначе не знал бы, в какие дни шла практика. Отрицательные
// дельты в сутки не идут: «решено за день» не уменьшается. Строка суток нужна
// только карточке преподавателя, поэтому её сбой навыки ученика не откатывает
// (см. recordSkillDay).
/**
 * Навыки одного уровня (skill_level_stat, миграция 0021) — для «Сильных и слабых сторон» по текущему уровню.
 * Таблицы ещё нет на инстансе (миграция не доехала) — нули, а не 500: экран покажет «мало данных».
 */
export async function loadLevelSkillStats(profileId, level, sql = getSql()) {
  const out = emptyStats()
  const code = skillLevel(level)
  if (!sql || !code) return out
  try {
    const rows = await sql`
      select skill, tasks_done, first_try_correct
      from skill_level_stat where profile_id = ${profileId} and level = ${code}
    `
    for (const r of rows) {
      if (SKILLS.includes(r.skill)) {
        out[r.skill] = { done: Number(r.tasks_done) || 0, firstTry: Number(r.first_try_correct) || 0 }
      }
    }
  } catch (err) {
    console.error('[skillStats] skill_level_stat read failed', err?.message || err)
  }
  return out
}

/**
 * Навыки уровня последних заданий ученика — для карточки преподавателя. Своего уровня ученика у неё нет: web-admin
 * спрашивает бэкенд и кабинет параллельно. Задания без своего уровня пишутся в уровень ученика (practice/skillStats.js),
 * поэтому свежая строка — обычно его текущий уровень; исключение — раздел со своим уровнем (воркбук A1 у ученика B1),
 * решённый последним. Один запрос: у карточки бюджет запросов (studentActivity.js). Таблицы нет — { level: null }.
 */
export async function loadRecentLevelSkillStats(profileId, sql = getSql()) {
  if (!sql) return { level: null, stats: null }
  try {
    const rows = await sql`
      select skill, level, tasks_done, first_try_correct, updated_at
      from skill_level_stat where profile_id = ${profileId}
    `
    let level = null
    let latest = -Infinity
    for (const r of rows) {
      const code = skillLevel(r.level)
      const at = new Date(r.updated_at).getTime()
      if (code && Number.isFinite(at) && at > latest) {
        latest = at
        level = code
      }
    }
    if (!level) return { level: null, stats: null }
    const stats = emptyStats()
    for (const r of rows) {
      if (skillLevel(r.level) === level && SKILLS.includes(r.skill)) {
        stats[r.skill] = { done: Number(r.tasks_done) || 0, firstTry: Number(r.first_try_correct) || 0 }
      }
    }
    return { level, stats }
  } catch (err) {
    console.error('[skillStats] skill_level_stat read failed', err?.message || err)
    return { level: null, stats: null }
  }
}

export async function applySkillDeltas(profileId, deltas, sql = getSql(), byLevel = {}) {
  if (!sql) return
  const entries = []
  for (const skill of Object.keys(deltas || {})) {
    if (!SKILLS.includes(skill)) continue
    const { done = 0, firstTry = 0 } = deltas[skill] || {}
    if (!done && !firstTry) continue
    entries.push({ skill, done, firstTry })
  }
  if (!entries.length) return
  const dayTasks = entries.reduce((n, e) => n + Math.max(0, Number(e.done) || 0), 0)
  const dayFirstTry = entries.reduce((n, e) => n + Math.max(0, Number(e.firstTry) || 0), 0)
  await sql.begin(async (tx) => {
    for (const { skill, done, firstTry } of entries) {
      await tx`
        insert into skill_stat (profile_id, skill, tasks_done, first_try_correct)
        values (${profileId}, ${skill}, ${done}, ${firstTry})
        on conflict (profile_id, skill) do update
          set tasks_done = skill_stat.tasks_done + ${done},
              first_try_correct = skill_stat.first_try_correct + ${firstTry},
              updated_at = now()
      `
    }
    if (dayTasks > 0 || dayFirstTry > 0) {
      await recordSkillDay(tx, profileId, dayTasks, dayFirstTry)
    }
    if (byLevel && Object.keys(byLevel).length) {
      await recordSkillLevels(tx, profileId, byLevel)
    }
  })
}

// Разбивка по уровню — в своей точке сохранения, как строка суток: не доехала миграция 0021 — теряем разбивку
// этой пачки, но не общий итог навыка.
async function recordSkillLevels(tx, profileId, byLevel) {
  try {
    await tx.savepoint(async (sp) => {
      for (const [level, deltas] of Object.entries(byLevel)) {
        const code = skillLevel(level)
        if (!code) continue
        for (const skill of Object.keys(deltas || {})) {
          if (!SKILLS.includes(skill)) continue
          const { done = 0, firstTry = 0 } = deltas[skill] || {}
          if (!done && !firstTry) continue
          await sp`
            insert into skill_level_stat (profile_id, skill, level, tasks_done, first_try_correct)
            values (${profileId}, ${skill}, ${code}, ${done}, ${firstTry})
            on conflict (profile_id, skill, level) do update
              set tasks_done = skill_level_stat.tasks_done + ${done},
                  first_try_correct = skill_level_stat.first_try_correct + ${firstTry},
                  updated_at = now()
          `
        }
      }
    })
  } catch (err) {
    console.error('[skillStats] skill_level_stat write failed', err?.message || err)
  }
}

// Строка суток — в своей точке сохранения внутри транзакции навыков. Упала —
// откатывается только она, а skill_stat фиксируется: runMigrations глотает
// ошибки, и если 0016 не доехала на инстанс, ошибка «relation skill_day does
// not exist» без точки сохранения откатила бы всю пачку и POST /api/skills
// отвечал бы 500 каждому ученику. Ошибку только логируем, как
// markSummaryStatus в calls.js: потеряем день в календаре, но не прогресс.
async function recordSkillDay(tx, profileId, tasks, firstTry) {
  try {
    await tx.savepoint(async (sp) => {
      await sp`
        insert into skill_day (profile_id, day, tasks, first_try)
        values (${profileId}, (now() at time zone 'utc')::date, ${tasks}, ${firstTry})
        on conflict (profile_id, day) do update
          set tasks = skill_day.tasks + excluded.tasks,
              first_try = skill_day.first_try + excluded.first_try
      `
    })
  } catch (err) {
    console.error('[skillStats] skill_day write failed', err?.message || err)
  }
}
