// Перенос анонимного прогресса в аккаунт при входе.
//
// Пока человек не залогинен, весь его прогресс копится под device-id из
// localStorage. После входа роуты пишут уже под `user-<id>` — и старая куча
// осталась бы висеть под другим ключом: словарь пуст, тьютор всё забыл.
// Здесь мы её перевешиваем.
//
// Сливаем ТОЛЬКО в пустой аккаунт (см. isAccountEmpty). Если у аккаунта уже
// есть прогресс — значит человек учился с другого устройства, и втягивать туда
// содержимое чужого браузера нельзя: на общем компьютере это отдало бы прогресс
// первого пользователя второму.

import { getSql } from './sql.js'

const RESERVED_ID_RE = /^user-/i

// Таблицы, где строку можно просто перевесить: уникальных ключей по device_id
// нет, конфликтовать нечему.
const REKEY_TABLES = [
  'mistake_log',
  'fact_log',
  'topic_log',
  'resolved_log',
  'call_log',
  'ielts_attempt',
  'ielts_score',
  'voice_session',
]

/**
 * Пуст ли аккаунт. Смотрим на содержимое, а не на наличие строки learner:
 * пустая строка learner заводится любой записью (ensureLearner), поэтому по её
 * наличию судить нельзя — слияние бы не срабатывало из-за гонки.
 */
export async function isAccountEmpty(accountId) {
  const sql = getSql()
  if (!sql) return false
  const rows = await sql`
    select
      (select count(*) from vocab_bank      where device_id = ${accountId}) +
      (select count(*) from mistake_log     where device_id = ${accountId}) +
      (select count(*) from fact_log        where device_id = ${accountId}) +
      (select count(*) from topic_log       where device_id = ${accountId}) +
      (select count(*) from lesson_progress where device_id = ${accountId}) +
      (select count(*) from ielts_score     where device_id = ${accountId}) +
      (select count(*) from call_log        where device_id = ${accountId})
      as n
  `
  return Number(rows[0].n) === 0
}

/**
 * Сливает device-профиль в аккаунт. Идемпотентна: анонимная строка learner
 * удаляется в конце, поэтому повторный вызов уже ничего не находит.
 *
 * Возвращает { merged: true } либо { merged: false, reason } — вызывающий это
 * логирует, но пользователю вход ломать не должен.
 */
export async function mergeDeviceIntoAccount(deviceId, accountId) {
  const sql = getSql()
  if (!sql) return { merged: false, reason: 'no-db' }

  // Защита от порчи данных при кривом вызове: аноним обязан быть анонимом,
  // аккаунт — аккаунтом.
  if (!deviceId || RESERVED_ID_RE.test(deviceId)) return { merged: false, reason: 'bad-device-id' }
  if (!RESERVED_ID_RE.test(accountId)) return { merged: false, reason: 'bad-account-id' }
  if (deviceId === accountId) return { merged: false, reason: 'same-id' }

  const src = await sql`select 1 from learner where device_id = ${deviceId}`
  if (src.length === 0) return { merged: false, reason: 'nothing-to-merge' }

  if (!(await isAccountEmpty(accountId))) return { merged: false, reason: 'account-not-empty' }

  // Одной транзакцией: наполовину перенесённый прогресс хуже, чем непере-
  // несённый — его уже не отличить от нормального состояния.
  await sql.transaction([
    // FK: *_log.device_id ссылаются на learner, поэтому строка аккаунта должна
    // существовать до переноса.
    sql`
      insert into learner (device_id)
      values (${accountId})
      on conflict (device_id) do nothing
    `,
    // Скаляры аккаунта пусты (проверено выше), но строка learner могла быть
    // заведена ensureLearner-ом — забираем НЕВИДИМУЮ анкету анонима (уровень,
    // навыки), не затирая непустое: coalesce(аккаунт, аноним).
    //
    // Тьютор/интересы/профессию НЕ переносим намеренно: это явный выбор
    // человека в онбординге, а новый аккаунт должен пройти онбординг сам —
    // иначе на общем браузере свежая регистрация молча наследует чужого
    // тьютора и сразу попадает на dashboard, минуя настройку.
    sql`
      update learner a set
        level           = coalesce(a.level, d.level),
        lang            = coalesce(a.lang, d.lang),
        style           = coalesce(a.style, d.style),
        goal            = coalesce(a.goal, d.goal),
        minutes_per_day = coalesce(a.minutes_per_day, d.minutes_per_day),
        skills          = coalesce(a.skills, d.skills),
        writing         = coalesce(a.writing, d.writing),
        safety_alert    = a.safety_alert or coalesce(d.safety_alert, false),
        updated_at      = now()
      from learner d
      where a.device_id = ${accountId} and d.device_id = ${deviceId}
    `,
    ...REKEY_TABLES.map(
      (t) => sql(`update ${t} set device_id = $1 where device_id = $2`, [accountId, deviceId]),
    ),
    // vocab_bank: unique (device_id, word_key) — слово, которое у аккаунта уже
    // есть, переносить нельзя.
    sql`
      update vocab_bank v set device_id = ${accountId}
      where v.device_id = ${deviceId}
        and not exists (
          select 1 from vocab_bank o
          where o.device_id = ${accountId} and o.word_key = v.word_key
        )
    `,
    sql`delete from vocab_bank where device_id = ${deviceId}`,
    // lesson_progress: unique (device_id, lesson_key). Правила те же, что у
    // upsertLessonProgress — passed не разжаловать, счёт лучший, попытки сложить.
    sql`
      insert into lesson_progress (device_id, lesson_key, status, score, attempts, next_variant)
      select ${accountId}, lesson_key, status, score, attempts, next_variant
      from lesson_progress where device_id = ${deviceId}
      on conflict (device_id, lesson_key) do update set
        status = case
          when lesson_progress.status = 'passed' or excluded.status = 'passed' then 'passed'
          else excluded.status
        end,
        score = greatest(coalesce(lesson_progress.score, 0), coalesce(excluded.score, 0)),
        attempts = lesson_progress.attempts + excluded.attempts,
        next_variant = greatest(lesson_progress.next_variant, excluded.next_variant),
        updated_at = now()
    `,
    sql`delete from lesson_progress where device_id = ${deviceId}`,
    // voice_usage: unique (device_id, day). Минуты складываем — иначе вход
    // обнулял бы дневной лимит.
    sql`
      insert into voice_usage (device_id, day, seconds)
      select ${accountId}, day, seconds
      from voice_usage where device_id = ${deviceId}
      on conflict (device_id, day) do update set
        seconds = voice_usage.seconds + excluded.seconds
    `,
    sql`delete from voice_usage where device_id = ${deviceId}`,
    // Аноним осушён — убираем, иначе повторный вход слил бы пустышку заново.
    sql`delete from learner where device_id = ${deviceId}`,
  ])

  return { merged: true }
}
