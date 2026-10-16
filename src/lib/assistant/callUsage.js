// Учёт звонков Луне-помощнику (16.10.2026, решение владельца: свой лимит
// 15 минут в день, пул Speaking Buddy не трогаем).
//
// Свою таблицу не заводим: звонок идёт через тот же LiveKit и ту же цепочку
// учёта, что у тьютора (voice_session → пульс вкладки → voice_usage), но под
// СВОИМ id — `user-<id>-luna`. Отсюда всё нужное разом:
//  - лимит отдельный: voice_usage считается по device_id;
//  - префикс `user-` закрыт от анонимов (auth-server RESERVED_ID_RE) — чужой
//    счётчик не подставить присланным deviceId;
//  - трекер Луны, Roadmap и карточка преподавателя ищут ровно `user-<id>`, и
//    разговор о сайте не засчитывается как практика английского.

import { getSql } from '../db/sql.js'

export const ASSISTANT_CALL_DAILY_SEC = 15 * 60
const SUFFIX = '-luna'

export const assistantCallProfileId = (userId) => `user-${userId}${SUFFIX}`

/** Комната — идущий звонок Луне этого ученика? Чат-роут даёт такому вопросу
 *  квоту звонка: в живом разговоре реплики идут каждые 10–30 с, и общий
 *  лимит чата (20 за 10 минут) оборвал бы Луну посреди звонка. Решает база, а
 *  не слово клиента, и только ЖИВОЙ звонок — агент вошёл (armed_at) и вкладка
 *  шлёт пульс (раз в 20 с): строка заводится уже при выдаче токена, и без этой
 *  проверки квоту звонка получал бы любой, кто токен взял, а звонить не стал. */
export async function isLiveAssistantCall(room, userId) {
  const db = getSql()
  if (!db || typeof room !== 'string' || !room || room.length > 128 || userId == null) return false
  try {
    const rows = await db`
      SELECT 1 FROM voice_session
      WHERE room = ${room} AND device_id = ${assistantCallProfileId(userId)}
        AND armed_at IS NOT NULL AND last_seen_at > now() - interval '60 seconds'
      LIMIT 1
    `
    return rows.length > 0
  } catch {
    return false
  }
}

/** Идёт ли у ученика другой звонок Луне — с пульсом, или только что выданный
 *  токен, куда агент ещё не вошёл. Бюджет секунд комнате выдаётся один раз, при
 *  токене, поэтому две комнаты сразу (две вкладки) уложили бы в день вдвое
 *  больше лимита. Бросает при сбое базы — роут тогда звонок не выдаёт. */
export async function hasOpenAssistantCall(profileId) {
  const db = getSql()
  if (!db) return false
  const rows = await db`
    SELECT 1 FROM voice_session
    WHERE device_id = ${profileId}
      AND ((armed_at IS NOT NULL AND last_seen_at > now() - interval '60 seconds')
        OR (armed_at IS NULL AND started_at > now() - interval '2 minutes'))
    LIMIT 1
  `
  return rows.length > 0
}
