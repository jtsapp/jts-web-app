// Voice-usage accounting for the free-tier cap (20 min/day, 300 min/month).
//
// Backed by Neon (DATABASE_URL). Two tables (see api/_lib/schema.sql):
//   voice_usage(device_id, day, seconds)     — accumulated talk time
//   voice_session(room, device_id, started_at) — open sessions, closed by webhook
//
// The token route checks getUsage() before issuing a token and calls
// openSession(); the LiveKit `room_finished` webhook calls recordSession().

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

// device_id sanity — mirrors felix isValidDeviceId (non-empty, bounded, safe).
export function isValidDeviceId(id) {
  return (
    typeof id === "string" && id.length >= 6 && id.length <= 128
  );
}

/** Seconds used today (local UTC day) and across the current calendar month. */
export async function getUsage(deviceId) {
  const db = getSql();
  if (!db) return { todaySeconds: 0, monthSeconds: 0 };
  const rows = await db`
    SELECT
      COALESCE(SUM(seconds) FILTER (WHERE day = CURRENT_DATE), 0)::int AS today,
      COALESCE(SUM(seconds) FILTER (
        WHERE day >= date_trunc('month', CURRENT_DATE)
      ), 0)::int AS month
    FROM voice_usage
    WHERE device_id = ${deviceId}
  `;
  const r = rows[0] || { today: 0, month: 0 };
  return { todaySeconds: r.today || 0, monthSeconds: r.month || 0 };
}

/** Record an open session so the webhook can compute its duration on finish. */
export async function openSession(room, deviceId) {
  const db = getSql();
  if (!db) return;
  await db`
    INSERT INTO voice_session (room, device_id, started_at)
    VALUES (${room}, ${deviceId}, now())
    ON CONFLICT (room) DO UPDATE SET started_at = now(), device_id = ${deviceId}
  `;
}

/**
 * Close a session and add its duration to the daily usage bucket.
 * Duration = min(now - started_at, SESSION_CAP_SEC). No-op if the room is
 * unknown (already recorded, or opened before this table existed).
 */
export async function recordSession(room, fallbackSeconds = 0) {
  const db = getSql();
  if (!db) return false;
  const rows = await db`
    SELECT device_id,
           EXTRACT(EPOCH FROM (now() - started_at))::int AS elapsed
    FROM voice_session
    WHERE room = ${room}
  `;
  const s = rows[0];
  if (!s) return false;
  const seconds = Math.min(
    SESSION_CAP_SEC,
    Math.max(0, s.elapsed || fallbackSeconds || 0),
  );
  if (seconds > 0) {
    await db`
      INSERT INTO voice_usage (device_id, day, seconds)
      VALUES (${s.device_id}, CURRENT_DATE, ${seconds})
      ON CONFLICT (device_id, day)
      DO UPDATE SET seconds = voice_usage.seconds + ${seconds}
    `;
  }
  await db`DELETE FROM voice_session WHERE room = ${room}`;
  return true;
}
