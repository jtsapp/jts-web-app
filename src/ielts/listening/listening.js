// Listening — чистые функции экрана прохождения (порт правил движка прототипа 10-listening-engine и плеера
// ): фазы экзамена, реплика под текущим временем, правила плеера по режиму. Ключей здесь нет.

// Экзамен как на CD IELTS: 30 секунд прочитать вопросы, запись один раз (части подряд), 2 минуты проверить в конце.
// Фазы ведут события плеера, а не часы: медленная загрузка записи не должна съедать время на проверку.
export const EXAM = { readSec: 30, checkSec: 120 }

// Все вопросы теста по порядку частей — для сетки номеров и flattenItems Reading.
// Части Listening превращаются в «плоский» документ: группы частей подряд, у каждой группы номер части.
export function flatDoc(doc) {
  const groups = []
  for (const part of doc?.parts || []) for (const g of part.groups || []) groups.push({ ...g, part: part.number })
  return { ...doc, groups: [...(doc?.groups || []), ...groups] }
}

export function totalAudioSec(doc) {
  return (doc?.parts || []).reduce((a, p) => a + (Number(p.audio?.durationSec) || 0), 0)
}

// Правила плеера по режиму. Экзамен — один раз, без паузы, перемотки и замедления; в «Тренировке» и
// «Разборе» — всё можно, но тест может ограничить число прослушиваний (playback.maxPlays).
export function playerRules(mode, playback = {}) {
  if (mode === 'exam') return { allowPause: false, allowSeek: false, allowRate: false, maxPlays: 1 }
  return {
    allowPause: playback.allowPause !== false,
    allowSeek: playback.allowSeek !== false,
    allowRate: true,
    maxPlays: Number(playback.maxPlays) > 0 ? Number(playback.maxPlays) : null,
  }
}

// Реплика транскрипта, которая звучит в момент t (секунды): последняя с start ≤ t.
export function lineAt(transcript, t) {
  let at = -1
  ;(transcript || []).forEach((l, i) => {
    if (Number(l.start) <= t) at = i
  })
  return at
}

// Подписи говорящих: «TOM — receptionist (BrE, male)» → роль для подписи реплики («Receptionist»).
export function speakerNames(voices) {
  const out = {}
  for (const v of voices || []) {
    const m = /^([A-Z][A-Z' -]*?)\s*[—-]\s*([^()]+)/.exec(v)
    if (m) out[m[1].trim()] = m[2].trim().replace(/^./, (c) => c.toUpperCase())
  }
  return out
}

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Часть, к которой относится вопрос (для переключателя Part 1–4 и записи нужной части).
export function partOfGroup(doc, groupIndexInFlat) {
  const flat = flatDoc(doc).groups
  return flat[groupIndexInFlat]?.part ?? 1
}

// ---- Синтез по репликам: своя шкала времени ----
// Без записи часть звучит репликами /api/tts. Таймкоды транскрипта — от сценария, а синтез говорит в своём темпе, поэтому
// шкала плеера строится из ДЛИНЫ каждой синтезированной реплики: реплика i занимает [start_i, end_i) подряд, без дыр.
// Пока реплика не скачана, её длина — оценка по словам; скачалась — точная (декодированный звук).

// ≈ 2.6 слова в секунду у голосов Soniox на темпе 1 и короткая пауза вдоха; реплика не короче секунды
export function estimateLineSec(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, words / 2.6 + 0.3)
}

// Шкала: длины реплик (точные или null) → [{ start, end }] подряд от нуля.
export function buildTimeline(lines, durations = []) {
  const out = []
  let at = 0
  ;(lines || []).forEach((l, i) => {
    const d = Number(durations[i]) > 0 ? Number(durations[i]) : estimateLineSec(l?.text)
    out.push({ start: at, end: at + d })
    at += d
  })
  return out
}

// Где на шкале момент t: реплика и смещение внутри неё. За концом — последняя реплика у самого конца.
export function locate(timeline, t) {
  const n = timeline?.length || 0
  if (!n) return { i: -1, within: 0 }
  const x = Math.max(0, Number(t) || 0)
  for (let i = 0; i < n; i++) if (x < timeline[i].end) return { i, within: Math.max(0, x - timeline[i].start) }
  const last = timeline[n - 1]
  return { i: n - 1, within: Math.max(0, last.end - last.start) }
}

// Реплика под моментом t по шкале плеера (−1 до начала). В отличие от lineAt знает концы реплик.
export function lineOnTimeline(timeline, t) {
  if (!timeline?.length || t < 0) return -1
  return locate(timeline, t).i
}

// Время сценария (audioStart вопроса, start реплики) → время шкалы синтеза: та же доля внутри той же реплики.
// Так «переслушать отрезок» попадает в нужное место, хотя синтез звучит в другом темпе, чем записанный сценарий.
export function mapScriptTime(transcript, timeline, t) {
  const i = lineAt(transcript, t)
  if (i < 0 || !timeline?.[i]) return Math.max(0, Number(t) || 0)
  const s = Number(transcript[i].start) || 0
  const e = Number(transcript[i].end) || Number(transcript[i + 1]?.start) || s
  const f = e > s ? Math.min(1, Math.max(0, (t - s) / (e - s))) : 0
  return timeline[i].start + f * (timeline[i].end - timeline[i].start)
}
