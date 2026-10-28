// Нрав тьютора — у каждого свой (29.10.2026). До этого нрав был один на ученика
// (learner.tutor_temper), и кнопка 18+ у Декстера включила бы злого и Спарку.
// Строки — в своей таблице learner_tutor_temper, а не колонкой в learner:
// таблица общая с felix (см. миграцию 0020).
import { getSql } from './sql.js'

const TEMPERS = ['calm', 'harsh']
const TUTOR_KEY = /^[a-z]{2,20}$/

/** Тело запроса → { ключ тьютора: нрав }. Значение уходит в промпт агента, поэтому
 *  только белый список; мусор молча выбрасываем — сработает дефолт тьютора. */
export function parseTutorTempers(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [tutor, temper] of Object.entries(raw)) {
    if (Object.keys(out).length >= 10) break
    if (TUTOR_KEY.test(tutor) && TEMPERS.includes(temper)) out[tutor] = temper
  }
  return out
}

/** Нрав по тьюторам для профиля. Старая колонка learner.tutor_temper — запасной
 *  нрав только Спарка: с 14.10.2026 ось была только у него, значит там его выбор.
 *  Декстер без строки получает дефолт сайта (defaultTemper в src/tutor/tutors.js). */
export function mergeTutorTempers(legacy, rows) {
  const out = {}
  if (TEMPERS.includes(legacy)) out.spark = legacy
  for (const r of rows || []) {
    if (r && TUTOR_KEY.test(r.tutor) && TEMPERS.includes(r.temper)) out[r.tutor] = r.temper
  }
  return out
}

export async function loadTutorTempers(profileId) {
  const sql = getSql()
  if (!sql) return []
  // Таблицы может ещё не быть (миграция не доехала) — теряем только нрав.
  return sql`
    select tutor, temper from learner_tutor_temper where profile_id = ${profileId}
  `.catch(() => [])
}

export async function saveTutorTempers(profileId, tempers) {
  const sql = getSql()
  if (!sql) return
  for (const [tutor, temper] of Object.entries(tempers)) {
    await sql`
      insert into learner_tutor_temper (profile_id, tutor, temper)
      values (${profileId}, ${tutor}, ${temper})
      on conflict (profile_id, tutor) do update
        set temper = excluded.temper, updated_at = now()
    `
  }
}
