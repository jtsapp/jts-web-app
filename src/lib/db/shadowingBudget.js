// Учёт платных оценок Shadowing. Оценка вызывает Azure Pronunciation Assessment
// + Claude-совет (см. app/api/shadowing/assess/route.js) и меряется «кредитами»:
// 1 кредит ≈ до 30 с аудио (худшая цена ~$0.0091: 30/3600·$1 Azure + ~$0.0008
// Claude). Пофразная оценка = 1 кредит; «целиком» = ceil(сек/30) кредитов.
//
// Лимита у оценок НЕТ. Сначала было 10 кредитов в неделю, 18.09.2026 — 10 в сутки
// (демо — 3), 22.09.2026 владелец снял потолок совсем: оценивать можно сколько
// угодно, демо-аккаунту тоже. Считать кредиты при этом не перестали — из
// shadowing_assess недельная сводка Roadmap берёт минуты шэдоуинга
// (ecosystem.js), без учёта у студента обнулился бы норматив по речи. Демо
// упирается только в квоту самого раздела из админки (PRACTICE_SHADOWING, см.
// /api/practice/entitlement) — это отдельный рубильник, не здесь.
//
// profile_id = 'user-<id>' из resolveProfileId (только залогиненные). Ключ суток —
// дата UTC ('2026-09-18'). Мягкая деградация: getSql()===null → учёта нет,
// как в остальных db-модулях (dev/preview без БД).
//
// Имя модуля осталось от лимита: его помощниками (ключи суток и недели, длина
// wav) считают бюджеты письма и ситуаций и та же сводка — переименование ради
// одного слова задело бы четыре чужих импорта.

import { getSql } from './sql.js'

export const SECONDS_PER_CREDIT = 30 // 1 кредит ≈ до 30 с аудио

// Длительность 16кГц mono 16-bit PCM WAV по размеру буфера: data ≈ всё минус
// 44-байтный заголовок. Считаем по реальным байтам файла, а не по клиентскому
// полю — его нельзя подделать в свою пользу.
export function wavSeconds(byteLength) {
  const data = Math.max(0, Number(byteLength) - 44)
  return data / (16000 * 2)
}

// Сколько кредитов стоит запись длиной seconds (минимум 1).
export function creditsForSeconds(seconds) {
  const s = Number(seconds)
  if (!Number.isFinite(s) || s <= 0) return 1
  return Math.max(1, Math.ceil(s / SECONDS_PER_CREDIT))
}

// ISO-неделя в UTC → 'YYYY-Www'. Год недели определяет её четверг (ISO 8601),
// поэтому конец декабря/начало января попадают в правильную неделю. UTC — чтобы
// ключ не зависел от таймзоны сервера.
export function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7 // 1..7 (пн..вс)
  d.setUTCDate(d.getUTCDate() + 4 - day) // сдвиг к четвергу недели
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// Ключ суток: дата UTC, '2026-09-18'. UTC — по той же причине, что и у недели:
// иначе вечер в Алматы и вечер в Стамбуле попадали бы в разные сутки.
//
// toISOString и так печатает дату в UTC, поэтому раскладывать её через Date.UTC
// (как это делает isoWeekKey — там сдвиг к четвергу и без разбора не обойтись)
// здесь незачем: получилось бы то же самое значение длиннее.
export function dayKey(date) {
  return date.toISOString().slice(0, 10)
}

// Момент сброса дневного лимита: ближайшая полночь UTC. У Shadowing лимита больше
// нет — этим живёт дневной бюджет ситуаций (situationsBudget.js).
export function nextDayResetAt(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString()
}

// ── Недельные помощники ─────────────────────────────────────────────────────
// Сам Shadowing на них больше не стоит, но живут они здесь: ими считает бюджет
// ПИСЬМА (writingBudget.js его реэкспортирует) и недельная сводка Roadmap
// (ecosystem.js). Переносить ради чистоты — трогать два чужих модуля без нужды.

// Момент сброса недельного лимита: ближайший понедельник 00:00 UTC.
export function nextWeekResetAt(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7 // 1..7 (пн..вс)
  d.setUTCDate(d.getUTCDate() + (8 - day)) // следующий понедельник
  return d.toISOString()
}

// Записать credits в учёт суток. Потолка нет намеренно (см. шапку): upsert
// просто прибавляет, одним запросом — параллельные оценки не теряют друг друга.
// Возвращает новое used, либо null без БД.
export async function recordCredits(profileId, dayKeyValue, credits, sql = getSql()) {
  if (!sql) return null
  const rows = await sql`
    insert into shadowing_assess (profile_id, day_key, used)
    values (${profileId}, ${dayKeyValue}, ${credits})
    on conflict (profile_id, day_key) do update
      set used = shadowing_assess.used + ${credits}, updated_at = now()
    returning used
  `
  return rows[0]?.used ?? null
}
