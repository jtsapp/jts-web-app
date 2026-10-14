// Конверт результата теста уровня v16 (JTSPersonalizedResults.getPayload(), schemaVersion 1) — то, что тест отдаёт
// приложению и что сервер хранит (см. спеку 2026-10-14-placement-v16-first-login-design.md).
//
// Проверка нужна дважды: на сервере — чтобы в базу не лёг мусор, на «Главной» — чтобы отчёт не рисовался по чужой
// или битой форме. Поэтому модуль чистый и общий. Мы не пересчитываем балл: конверт — утверждение браузера, и
// единственное, что из него уходит дальше (уровень аккаунта), пишется только в пустой аккаунт.

export const ENVELOPE_SOURCE = 'jts_general_english_placement'
export const CEFR = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1']
export const SKILLS = ['LU', 'R', 'L', 'S']
// Реальный конверт весит ~30 КБ (рекомендации, черновики анкеты). 256 КБ — потолок от раздутых свободных ответов.
export const MAX_ENVELOPE_BYTES = 256 * 1024

const ATTEMPT_RE = /^[A-Za-z0-9_-]{1,80}$/

const cefrOrNull = (v) => (CEFR.includes(v) ? v : null)

/**
 * { ok: true, envelope } или { ok: false, error }. Возвращает тот же объект, не копию: проверка не правит данные.
 * raw — объект или строка JSON.
 */
export function validateEnvelope(raw) {
  let env = raw
  if (typeof raw === 'string') {
    if (raw.length > MAX_ENVELOPE_BYTES) return { ok: false, error: 'too_large' }
    try {
      env = JSON.parse(raw)
    } catch {
      return { ok: false, error: 'bad_json' }
    }
  }
  if (!env || typeof env !== 'object' || Array.isArray(env)) return { ok: false, error: 'not_object' }
  if (env.schemaVersion !== 1) return { ok: false, error: 'schema_version' }
  if (env.source !== ENVELOPE_SOURCE) return { ok: false, error: 'source' }
  const a = env.assessment
  if (!a || typeof a !== 'object') return { ok: false, error: 'assessment' }
  if (typeof a.attemptId !== 'string' || !ATTEMPT_RE.test(a.attemptId)) return { ok: false, error: 'attempt_id' }
  // null — честное «уровень не определён» (тест брошен на первом разделе), его храним как есть.
  if (a.overallCEFR != null && !CEFR.includes(a.overallCEFR)) return { ok: false, error: 'overall_cefr' }
  if (!a.skillResults || typeof a.skillResults !== 'object') return { ok: false, error: 'skills' }
  if (typeof raw !== 'string' && JSON.stringify(env).length > MAX_ENVELOPE_BYTES) return { ok: false, error: 'too_large' }
  return { ok: true, envelope: env }
}

/** Ровно то, что нужно колонкам базы и решению «ставить ли уровень». */
export function envelopeSummary(env) {
  const a = env?.assessment || {}
  return {
    attemptId: a.attemptId,
    overall: cefrOrNull(a.overallCEFR),
    status: typeof a.overallStatus === 'string' ? a.overallStatus : null,
    target: cefrOrNull(env?.recommendations?.targetCEFR),
  }
}

/**
 * Можно ли ставить по конверту уровень аккаунта: общий уровень определён, а грамматика и чтение пройдены. Итог
 * v16 открывает и до конца теста (общий уровень тогда — по одной грамматике), и уровень аккаунта по такому обрывку
 * ставить нельзя. Аудирование не требуем: его разрешено пропустить из-за проблемы со звуком (skipListeningTechnical),
 * и ученик с немым ноутбуком иначе не получил бы уровня вовсе. Говорение в общий уровень не входит (так считает v16).
 */
export function levelFromEnvelope(env) {
  const a = env?.assessment
  const overall = cefrOrNull(a?.overallCEFR)
  if (!overall) return null
  const s = a.skillResults || {}
  return cefrOrNull(s.LU?.level) && cefrOrNull(s.R?.level) ? overall : null
}
