// Разбор результата теста на определение уровня. Движок (practice/placement)
// отдаёт весь объект result() — с θ, SE, флагами, профилем по навыкам и
// баллами блоков. Приложению из него нужен уровень, и брать его надо
// аккуратно: это единственное поле, которое уезжает в профиль студента и
// определяет весь его дальнейший контент.

// Шкала раннера начинается с A0 — в отличие от старого адаптивного теста
// (src/cefr.js), где нижней ступенью была A1 и новичку было некуда попасть.
export const PLACEMENT_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** Уровень из результата раннера; null, если поле пустое или незнакомое —
 *  лучше не трогать профиль вовсе, чем записать в него мусор. */
export function placementLevel(result) {
  const level = String(result?.level || '').trim().toUpperCase()
  return PLACEMENT_LEVELS.includes(level) ? level : null
}

/** Флаги качества сессии: раннер помечает ими прохождение, которому не стоит
 *  верить как есть (угадывание в LexTALE, слишком быстрые ответы и т.п.).
 *  Уровень при этом всё равно приходит — флаги нужны, чтобы преподаватель
 *  видел, что результат спорный, а не чтобы блокировать студента. */
export function placementFlags(result) {
  return Array.isArray(result?.flags) ? result.flags.filter((f) => typeof f === 'string') : []
}

/** Короткая сводка для профиля и логов: уровень, θ, SE и флаги. θ и SE
 *  сохраняем числами — по ним видно, насколько уверенной была оценка. */
export function placementSummary(result) {
  const level = placementLevel(result)
  if (!level) return null
  const num = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null)
  return {
    level,
    theta: num(result?.theta),
    se: num(result?.se),
    flags: placementFlags(result),
  }
}

/**
 * Уровень, который уезжает в профиль. A0 в приложениях значит «тест не
 * пройден»: мобильный клиент по нему держит карту королевств под замком и
 * снова просит пройти тест, поэтому измеренный A0 в профиль не уходит —
 * туда едет первый уровень курса, A1. Сама измеренная полоса не теряется:
 * она остаётся в снимке прохождения и на экране результата.
 */
export function profileLevel(measured) {
  return measured === 'A0' ? 'A1' : measured
}

/** Максимум флагов, которые имеет смысл хранить (их всего четыре вида). */
const MAX_FLAGS = 12

/**
 * Снимок результата для записи в профиль — из недоверенного тела запроса.
 * Числа приводятся к числам, флаги к короткому списку строк, лишние поля
 * отбрасываются: в профиль должно уехать ровно то, что описывает прохождение.
 * [at] — момент прохождения (передаётся вызывающим, чтобы функция осталась
 * чистой и тестируемой).
 */
export function sanitizePlacementRecord(level, summary, at) {
  const src = summary && typeof summary === 'object' ? summary : {}
  const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null)
  const flags = Array.isArray(src.flags)
    ? src.flags.filter((f) => typeof f === 'string' && f).slice(0, MAX_FLAGS).map((f) => f.slice(0, 40))
    : []
  return {
    level,
    theta: num(src.theta),
    se: num(src.se),
    flags,
    variant: typeof src.variant === 'string' ? src.variant.slice(0, 20) : null,
    answered: num(src.answered),
    // Что прислал клиент, когда его уровень разошёлся с пересчётом сервера:
    // расхождение само по себе сигнал (баг клиента или попытка подделки).
    clientLevel: typeof src.clientLevel === 'string' && src.clientLevel !== level
      ? src.clientLevel.slice(0, 10)
      : null,
    at: typeof at === 'string' ? at : null,
  }
}
