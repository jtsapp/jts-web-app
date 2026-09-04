// Разбор ответов караоке-API и файла разметки.
//
// Отдельным модулем от загрузки (karaokeData.js), потому что здесь всё чистое
// и проверяется юнит-тестами: форму каталога бэкенд может отдать чуть иначе
// (теги строкой вместо массива, описание строкой вместо объекта), а разметку
// заводит человек руками — и она бывает битой.
//
// Контракт: docs/superpowers/specs/2026-09-03-karaoke-api-contract.md

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v) {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v)
  return s
}

/**
 * Теги: бэкенд отдаёт и готовый массив (`tagList`), и исходную строку через
 * запятую (`tags`) — разбираем оба, потому что мобилка читает второе поле, и
 * менять его форму ради веба никто не станет.
 */
function normalizeTags(raw) {
  if (Array.isArray(raw)) return raw.map(str).filter(Boolean)
  const s = str(raw)
  if (!s) return []
  return s
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

/** Описание: {ru,en,kk} либо просто строка (тогда считаем её русской). */
function normalizeDescription(raw) {
  if (raw && typeof raw === 'object') {
    return { ru: str(raw.ru), en: str(raw.en), kk: str(raw.kk || raw.kz) }
  }
  const s = str(raw)
  return { ru: s, en: '', kk: '' }
}

/** Одна карточка каталога. */
export function normalizeTrack(raw) {
  if (!raw || typeof raw !== 'object') return null
  const audioUrl = str(raw.audioUrl || raw.audio_url || raw.songUrl)
  if (!audioUrl) return null // без фонограммы играть нечего
  return {
    id: raw.id ?? null,
    // slug — ключ прогресса в localStorage: он переживает пересоздание
    // карточки в админке, а id нет. Если бэкенд его почему-то не прислал,
    // откатываемся на id, иначе прогресс будет некуда писать.
    slug: str(raw.slug) || (raw.id != null ? `id-${raw.id}` : ''),
    title: str(raw.title) || 'Untitled',
    artist: str(raw.artist),
    level: str(raw.level).toUpperCase(),
    bpm: num(raw.bpm),
    durationSec: num(raw.durationSec ?? raw.duration_sec ?? raw.duration),
    tags: normalizeTags(raw.tagList ?? raw.tags),
    coverUrl: str(raw.coverImageUrl || raw.coverUrl || raw.cover_url || raw.imageUrl),
    audioUrl,
    instrumentalUrl: str(raw.instrumentalUrl || raw.instrumental_url),
    lineCount: num(raw.lineCount ?? raw.line_count) || 0,
    description: normalizeDescription(raw.description),
    // Разметка приходит инлайном, но только в ответе на один трек: в каталоге
    // её нет намеренно (десятки килобайт на карточку, которую никто не читает).
    lyrics: raw.lyrics && typeof raw.lyrics === 'object' ? raw.lyrics : null,
  }
}

export function normalizeTracks(raw) {
  const list = Array.isArray(raw) ? raw : raw?.content || raw?.items || []
  return list.map(normalizeTrack).filter(Boolean)
}

// ── Разметка ────────────────────────────────────────────────────────────────

/**
 * Проверяет и приводит к рабочему виду файл разметки.
 *
 * Возвращает `{ lines, vocab, hotspots, duration, problems }` либо `null`,
 * если трек играть нельзя. Битая разметка не должна ронять экран: каталог
 * покажет такой трек недоступным, как и требует ТЗ (раздел 5).
 *
 * Порядок проверок ровно как в контракте §3: пункты 1–3 фатальные, 4–5 —
 * поправимые. Разница принципиальная: пересекающиеся строки ломают и
 * подсветку, и обе маски метрик, а кривой таймкод слова всего лишь лишает
 * пословной подсветки.
 */
export function normalizeLyrics(raw) {
  if (!raw || typeof raw !== 'object') return null
  const problems = []
  const srcLines = Array.isArray(raw.lines) ? raw.lines : []
  if (srcLines.length === 0) return null

  const lines = []
  for (let i = 0; i < srcLines.length; i++) {
    const l = srcLines[i]
    const start = num(l?.start)
    const end = num(l?.end)
    const text = str(l?.text)
    if (start === null || end === null || start < 0 || start >= end || !text) return null
    if (lines.length && start < lines[lines.length - 1].end) return null // пересечение
    // Пословные таймкоды: не убывают и лежат внутри строки. Нарушение не
    // фатально — просто гасим words и подсвечиваем строку целиком.
    let words = Array.isArray(l.words)
      ? l.words
          .map((w) => ({ w: str(w?.w), t: num(w?.t) }))
          .filter((w) => w.w && w.t !== null)
      : []
    const wordsOk = words.every(
      (w, j) => w.t >= start && w.t <= end && (j === 0 || w.t >= words[j - 1].t),
    )
    if (words.length && !wordsOk) {
      problems.push(`line ${l.id ?? i + 1}: word timings out of range`)
      words = []
    }
    lines.push({
      id: num(l.id) ?? i + 1,
      start,
      end,
      text,
      ru: str(l.ru),
      words,
      focus: Array.isArray(l.focus) ? l.focus.map(str).filter(Boolean) : [],
      gaps: Array.isArray(l.gaps) ? l.gaps.map(num).filter((n) => n !== null) : [],
    })
  }

  const byId = new Map(lines.map((l) => [l.id, l]))
  const hotspots = (Array.isArray(raw.hotspots) ? raw.hotspots : [])
    .map((h) => ({
      afterLine: num(h?.afterLine),
      durationSec: num(h?.durationSec),
      returnAt: num(h?.returnAt),
      difficulty: num(h?.difficulty) ?? 1,
    }))
    .filter((h) => {
      const anchor = byId.get(h.afterLine)
      const ok = anchor && h.returnAt !== null && h.returnAt > anchor.end && h.durationSec > 0
      if (!ok) problems.push(`hotspot after line ${h.afterLine}: outside the pause`)
      return ok
    })

  const vocab = (Array.isArray(raw.vocab) ? raw.vocab : [])
    .map((v) => ({ w: str(v?.w), ru: str(v?.ru), line: num(v?.line) }))
    .filter((v) => v.w)

  // Длительность: из файла, а если её там нет — по последней строке. Нужна
  // маскам метрик, поэтому ноль недопустим.
  const duration = num(raw.duration) || lines[lines.length - 1].end

  return { version: num(raw.version) || 1, duration, lines, vocab, hotspots, problems }
}

/** Суммарная длительность спетых строк — знаменатель темпа в scoring.js. */
export function sungSeconds(lines) {
  return (lines || []).reduce((sum, l) => sum + (l.end - l.start), 0)
}

/** Весь текст трека одной строкой — эталон для сравнения со STT. */
export function fullText(lines) {
  return (lines || []).map((l) => l.text).join(' ')
}
