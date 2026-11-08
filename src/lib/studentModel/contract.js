// Ответы заданий для модели ученика: что браузер может прислать в POST /api/study/answers (спека, разделы 1 и 8).
// Общий для клиента (practice/studyLog.js режет так же до отправки) и сервера (роут проверяет). Всё, что не прошло, —
// отбрасывается поштучно: кривой ответ одного раздела не должен терять пачку остальных.
//
// Время ответа клиенту не доверяем — его ставит сервер базы. Пауза (gap) — только для темпа: «быстро» или нет.

import { skillLevel } from '../../practice/skillStatsCore.js'

export const MAX_BATCH = 100
export const SOURCES = ['ggame', 'vocab', 'lesson']
export const MAX_TITLE = 80
export const MAX_EXAMPLE = 200
export const MAX_GAP_MS = 120_000

// Ключ вещи по источнику. Ключ слова — vocabKey «Словаря»: id карточки или само слово в нижнем регистре, бывает с
// пробелами («do homework»). Урок — уровень и код урока тропы (5, T3, X2) или id каталога.
const ITEM = {
  ggame: /^ggame:L[1-5]-\d{2}$/,
  vocab: /^word:[^\u0000-\u001f[\]]{1,80}$/,
  lesson: /^lesson:[a-c][0-2]:[A-Za-z0-9_.-]{1,40}$/,
}

// Только вещи повторения: темы игр и слова. Урок — ответ журнала, но не вещь (спека, раздел 1).
export const KIND_OF_SOURCE = { ggame: 'grammar', vocab: 'word' }

const text = (v, max) => {
  if (v == null) return null
  const s = String(v).replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim()
  return s ? s.slice(0, max) : null
}

/** Один ответ → чистый вид или null. */
export function cleanAnswer(raw) {
  if (!raw || typeof raw !== 'object') return null
  const source = String(raw.source || '')
  if (!SOURCES.includes(source)) return null
  const item = String(raw.item || '')
  if (!ITEM[source].test(item) || typeof raw.ok !== 'boolean') return null
  const gap = Number(raw.gap)
  const out = {
    source,
    item,
    ok: raw.ok,
    level: skillLevel(raw.level) || null,
    title: text(raw.title, MAX_TITLE),
    // Пример — только у ошибки: верные ответы журналу не нужны.
    example: raw.ok ? null : text(raw.example, MAX_EXAMPLE),
    gap: raw.gap != null && Number.isFinite(gap) && gap >= 0 && gap <= MAX_GAP_MS ? Math.round(gap) : null,
  }
  if (source === 'vocab') {
    const ru = text(raw.extra?.ru, MAX_TITLE)
    const kk = text(raw.extra?.kk, MAX_TITLE)
    const example = text(raw.extra?.example, MAX_EXAMPLE)
    out.extra = ru || kk || example ? { ...(ru ? { ru } : {}), ...(kk ? { kk } : {}), ...(example ? { example } : {}) } : null
  }
  return out
}

/** Тело запроса → ответы (до MAX_BATCH) или null, если годных нет. */
export function cleanAnswers(body) {
  const list = Array.isArray(body?.answers) ? body.answers.slice(0, MAX_BATCH) : []
  const out = list.map(cleanAnswer).filter(Boolean)
  return out.length ? out : null
}
