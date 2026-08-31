// Voice-usage accounting for the free-tier cap (20 min/day, 300 min/month).
//
// Backed by self-host Postgres (DATABASE_URL). Two tables (see src/lib/migrations/0001_baseline.sql):
//   voice_usage(device_id, day, seconds)     — accumulated talk time
//   voice_session(room, device_id, started_at, armed_at, last_seen_at) — open sessions
//
// Считаем ПЛАТНОЕ ОКНО сессии: от подключения тьютора (armed_at) до последнего
// пульса вкладки (last_seen_at) плюс запас. Раньше окном была вся жизнь
// комнаты — от выдачи токена до room_finished, — и это давало две протечки
// сразу:
//   * начало: ученик ждал соединения, а минуты уже шли;
//   * конец: ученик клал трубку, комната жила дальше (агент не удаляет её на
//     обычном «Завершить разговор», потом ещё empty_timeout проекта), а при
//     потерянном room_finished сессия не закрывалась вовсе — остаток лимита
//     таял в реальном времени, пока ученик читал разбор.
//
// Токен-роут вызывает openSession() (строка заведена, но НЕ тарифицируется),
// клиент — armSession() при появлении тьютора, touchSession() пульсом и
// closeSession() по концу разговора. Вебхук room_finished остался страховкой.

// Общий клиент из sql.js — раньше здесь был свой neon() (дубль + новый клиент на
// каждый вызов). Теперь единый пул postgres, isDbConfigured тоже оттуда.
import { getSql, isDbConfigured } from "./db/sql.js";

export { isDbConfigured };

export const DAILY_LIMIT_SEC = 1200; // 20 min
export const MONTH_LIMIT_SEC = 18000; // 300 min
// Cap a single recorded session so a stuck/abusive room can't inflate usage
// beyond the daily token TTL (20 min) plus a small buffer. Держим на минуту
// больше DAILY_LIMIT_SEC: поднимая дневной лимит, поднимай и этот, иначе
// длинный разговор запишется урезанным и минуты не спишутся полностью.
const SESSION_CAP_SEC = 1260;

// Клиент пингует раз в PING_INTERVAL_MS (src/tutor/callSession.js, 20 с).
// Запас в 45 с — это два пропущенных пульса: переживает подвисшую вкладку и
// короткий обрыв сети, но не переживает закрытый ноутбук.
export const HEARTBEAT_GRACE_SEC = 45;
// Пульса нет столько — сессию дозакрываем и списываем её платное окно. Само
// окно к этому моменту уже не растёт (см. billableSeconds), так что задержка
// стоит не минут, а только того, что строка висит в таблице.
const DEAD_HEARTBEAT_SEC = 300;
// Строка, в которой тьютор так и не появился, платного окна не имеет вовсе.
// Держим её час на случай долгого коннекта и удаляем: списывать нечего.
const UNARMED_TTL_SEC = 3600;

// device_id sanity — mirrors felix isValidDeviceId (non-empty, bounded, safe).
export function isValidDeviceId(id) {
  return (
    typeof id === "string" && id.length >= 6 && id.length <= 128
  );
}

/**
 * Платное окно сессии в секундах. Вынесено чистой функцией, чтобы правила
 * тарификации можно было прогнать тестами без базы — в SQL ниже повторена
 * ровно эта арифметика.
 *
 * @param {object} p
 * @param {Date|number|string|null} p.armedAt   момент подключения тьютора
 * @param {Date|number|string|null} p.lastSeenAt последний пульс вкладки
 * @param {Date|number} p.now
 */
export function billableSeconds({
  armedAt,
  lastSeenAt,
  now,
  cap = SESSION_CAP_SEC,
  grace = HEARTBEAT_GRACE_SEC,
}) {
  const ms = (v) => (v === null || v === undefined ? NaN : new Date(v).getTime());
  const armed = ms(armedAt);
  // Тьютор не подключался — разговора не было, платить не за что.
  if (!Number.isFinite(armed)) return 0;
  const seen = ms(lastSeenAt);
  // Пульса не было ни разу (сессия из старой схемы или клиент не успел
  // пингануть) — окно закрываем сразу на armed_at + запас, а не тянем до now.
  const aliveUntil = (Number.isFinite(seen) ? seen : armed) + grace * 1000;
  const end = Math.min(ms(now), aliveUntil);
  const sec = Math.floor((end - armed) / 1000);
  if (!Number.isFinite(sec) || sec <= 0) return 0;
  return Math.min(cap, sec);
}

// Та же арифметика на стороне SQL. Держать в одном месте, чтобы правило не
// разъехалось между JS и запросами.
function billableSql(db) {
  return db`LEAST(
    ${SESSION_CAP_SEC},
    GREATEST(0, EXTRACT(EPOCH FROM (
      LEAST(now(), COALESCE(last_seen_at, armed_at) + ${HEARTBEAT_GRACE_SEC} * interval '1 second')
      - armed_at
    ))::int)
  )`;
}

/**
 * Секунды в ЕЩЁ ОТКРЫТЫХ сессиях ученика. В voice_usage они попадают только при
 * закрытии, поэтому без этого слагаемого бюджет «обнулялся» между режимами:
 * поговорил 5 минут в сценарии, сразу открыл свободный разговор — сервер видел
 * 0 потраченных и выдавал полные 20 минут заново. Лимит должен быть один на
 * ученика независимо от режима.
 */
async function activeSeconds(db, deviceId) {
  const billable = billableSql(db);
  const rows = await db`
    SELECT COALESCE(SUM(${billable}), 0)::int AS s
    FROM voice_session
    WHERE device_id = ${deviceId} AND armed_at IS NOT NULL
  `;
  return rows[0]?.s || 0;
}

/**
 * Дозакрыть сессии без пульса и подмести те, где тьютор так и не появился.
 * Само по себе это уже не спасает лимит (платное окно давно не растёт), но
 * убирает строки из таблицы и доводит минуты до voice_usage.
 */
export async function closeStaleSessions(deviceId) {
  const db = getSql();
  if (!db) return 0;
  // Тьютор не подключился — платить не за что, строка просто мусор.
  await db`
    DELETE FROM voice_session
    WHERE device_id = ${deviceId}
      AND armed_at IS NULL
      AND now() - started_at > ${UNARMED_TTL_SEC} * interval '1 second'
  `;
  const rows = await db`
    SELECT room FROM voice_session
    WHERE device_id = ${deviceId}
      AND armed_at IS NOT NULL
      AND now() - COALESCE(last_seen_at, armed_at) > ${DEAD_HEARTBEAT_SEC} * interval '1 second'
  `;
  for (const r of rows) await recordSession(r.room);
  return rows.length;
}

/**
 * Seconds used today (local UTC day), across the current calendar month, и за
 * срок действующего тарифа (`totalSince`).
 *
 * Включает идущие прямо сейчас сессии — иначе параллельные вкладки/режимы
 * получали каждый свой полный бюджет.
 */
export async function getUsage(deviceId, totalSince = null) {
  const db = getSql();
  if (!db) return { todaySeconds: 0, monthSeconds: 0, totalSeconds: 0 };
  // `totalSince` — начало действующего тарифа. Минуты прошлой покупки в новый пул
  // не переносятся, поэтому окно считается от этой даты; без неё (персональный
  // лимит от админа) берём всё время — окна у ручной правки нет.
  const since = totalSince ? String(totalSince).slice(0, 10) : null;
  const rows = await db`
    SELECT
      COALESCE(SUM(seconds) FILTER (WHERE day = CURRENT_DATE), 0)::int AS today,
      COALESCE(SUM(seconds) FILTER (
        WHERE day >= date_trunc('month', CURRENT_DATE)
      ), 0)::int AS month,
      COALESCE(SUM(seconds) FILTER (
        WHERE ${since}::date IS NULL OR day >= ${since}::date
      ), 0)::int AS total
    FROM voice_usage
    WHERE device_id = ${deviceId}
  `;
  const r = rows[0] || { today: 0, month: 0, total: 0 };
  const active = await activeSeconds(db, deviceId);
  return {
    todaySeconds: (r.today || 0) + active,
    monthSeconds: (r.month || 0) + active,
    totalSeconds: (r.total || 0) + active,
  };
}

/**
 * Завести открытую сессию. Тарификация тут ещё НЕ начинается: строка нужна,
 * чтобы связать комнату с учеником, а отсчёт включит armSession().
 */
export async function openSession(room, deviceId) {
  const db = getSql();
  if (!db) return;
  await db`
    INSERT INTO voice_session (room, device_id, started_at, armed_at, last_seen_at)
    VALUES (${room}, ${deviceId}, now(), NULL, NULL)
    ON CONFLICT (room) DO UPDATE
      SET started_at = now(), device_id = ${deviceId}, armed_at = NULL, last_seen_at = NULL
  `;
}

/**
 * Тьютор вошёл в комнату — с этого момента идут минуты. Повторные вызовы
 * игнорируются (armed_at IS NULL в условии): переподключение агента посреди
 * разговора не должно сдвигать начало отсчёта вперёд и дарить минуты.
 *
 * ВЛАДЕЛЬЦА строки здесь НЕ сверяем, и это важно. Чей это разговор, уже решил
 * токен-роут: он положил в device_id тот же profileId, по которому считает
 * лимит, — а у залогиненного это `user-<id>`, а вовсе не device-id из
 * браузера. Первая версия сверяла присланный клиентом deviceId и у всех
 * авторизованных не находила строку: armed_at не проставлялся, разговор не
 * тарифицировался вообще, и через час уборщик выносил сессию как «тьютор не
 * пришёл». Со стороны это выглядело так, будто лимит после звонка ПРИБАВЛЯЛСЯ.
 *
 * Право на вызов даёт знание имени комнаты: его отдаёт только токен-роут и
 * только тому, кто прошёл проверку. Ставка низкая — сдвинуть счётчик
 * честного лимита, а не достать чужие данные.
 */
export async function armSession(room) {
  const db = getSql();
  if (!db) return false;
  const rows = await db`
    UPDATE voice_session
    SET armed_at = now(), last_seen_at = now()
    WHERE room = ${room} AND armed_at IS NULL
    RETURNING room
  `;
  return rows.length > 0;
}

/** Пульс вкладки: разговор ещё идёт. Про владельца — см. armSession. */
export async function touchSession(room) {
  const db = getSql();
  if (!db) return false;
  const rows = await db`
    UPDATE voice_session
    SET last_seen_at = now()
    WHERE room = ${room} AND armed_at IS NOT NULL
    RETURNING room
  `;
  return rows.length > 0;
}

/** Явное завершение с клиента. Про владельца — см. armSession. */
export async function closeSession(room) {
  return recordSession(room);
}

/**
 * Close a session and add its billable window to the usage bucket.
 * No-op if the room is unknown (already recorded, or opened before this table
 * existed).
 *
 * День берём по armed_at, а не CURRENT_DATE: сессию может дозакрыть
 * closeStaleSessions спустя часы, и списывать вчерашний разговор на сегодня
 * неверно вдвойне — и день не тот, и сегодняшний бюджет съеден чужими минутами.
 */
export async function recordSession(room, fallbackSeconds = 0) {
  const db = getSql();
  if (!db) return false;
  const billable = billableSql(db);
  const rows = await db`
    SELECT device_id,
           COALESCE(armed_at, started_at)::date AS day,
           armed_at,
           ${billable} AS billable
    FROM voice_session
    WHERE room = ${room}
  `;
  const s = rows[0];
  if (!s) return false;
  // fallbackSeconds — длительность комнаты из вебхука. Нужен только там, где
  // платного окна нет вовсе (сессия из старой схемы без armed_at).
  const raw = s.armed_at ? s.billable || 0 : fallbackSeconds || 0;
  const seconds = Math.min(SESSION_CAP_SEC, Math.max(0, raw));
  if (seconds > 0) {
    await db`
      INSERT INTO voice_usage (device_id, day, seconds)
      VALUES (${s.device_id}, ${s.day}, ${seconds})
      ON CONFLICT (device_id, day)
      DO UPDATE SET seconds = voice_usage.seconds + ${seconds}
    `;
  }
  await db`DELETE FROM voice_session WHERE room = ${room}`;
  return true;
}
