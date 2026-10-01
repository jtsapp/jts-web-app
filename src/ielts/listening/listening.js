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
