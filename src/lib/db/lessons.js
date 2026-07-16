// Прогресс по плану уроков. Как и profile.js: getSql() может быть null (БД не
// поднята) — тогда функции ничего не делают, а клиент живёт на localStorage.
//
// Порт felix lib/db/lessons.ts (только upsert/list — кэш упражнений не нужен).

import { getSql } from './sql.js'
import { ensureLearner } from './profile.js'

/**
 * Записывает результат одной попытки. Правила: пересдачи разрешены, но статус
 * только повышается до 'passed' (поздний провал не разжалует сданный урок);
 * score хранит лучшую попытку; attempts всегда +1; next_variant двигается,
 * только пока урок не сдан.
 */
export async function upsertLessonProgress(deviceId, p) {
  const sql = getSql()
  if (!sql) return
  await ensureLearner(deviceId)
  await sql`
    insert into lesson_progress (device_id, lesson_key, status, score, next_variant)
    values (${deviceId}, ${p.lessonKey}, ${p.status}, ${p.score}, ${p.nextVariant})
    on conflict (device_id, lesson_key) do update set
      status = case
        when lesson_progress.status = 'passed' then 'passed'
        else excluded.status
      end,
      score = greatest(coalesce(lesson_progress.score, 0), coalesce(excluded.score, 0)),
      attempts = lesson_progress.attempts + 1,
      next_variant = case
        when excluded.status = 'passed' then lesson_progress.next_variant
        else excluded.next_variant
      end,
      updated_at = now()
  `
}
