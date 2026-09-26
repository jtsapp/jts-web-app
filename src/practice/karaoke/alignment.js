// Разбор дубля по оценке Azure: ритм и произношение по словам.
//
// Чистый модуль без DOM и без сети. На входе — разметка трека, карта «секунда
// записи → секунда трека» (её пишет mic.js во время дубля) и ответ
// /api/karaoke/assess: послово время звучания и точность произношения.
//
// Почему время записи приходится переводить: Azure меряет время от начала
// АУДИО, а разметка — от начала ТРЕКА. Между ними калибровка перед стартом,
// паузы, перемотки и скорость 0,75×/1,25× — ни одно из них в запись не
// попадает как «время трека», поэтому без карты слово на 0:42 записи
// невозможно сопоставить со строкой на 0:31 песни.
//
// Пороги ниже — стартовые, до калибровки на живых дублях: пение Azure слышит
// хуже речи, и цифры будут подгоняться по замеру, а не на глаз.

import { wordTimes } from './timeline.js'

// Поля окна строки в записи: вступить чуть раньше или дотянуть последнее
// слово после конца строки — нормально, и такое слово должно попасть в кусок.
export const WINDOW_BEFORE_SEC = 0.6
export const WINDOW_AFTER_SEC = 0.9

// Ритм: попадание в пределах четверти секунды — полный балл, дальше линейно
// до нуля на 0,9 с. Азуре размечает границы спетых слов с точностью порядка
// десятой доли секунды, поэтому строже четверти мерить бессмысленно.
export const RHYTHM_GOOD_SEC = 0.25
export const RHYTHM_ZERO_SEC = 0.9
// Постоянное опоздание до 0,3 с прощаем (решение продукта 27.09.2026):
// Bluetooth-наушники отдают звук с задержкой 0,1–0,3 с, и поющий вовремя под
// то, что слышит, в записи выходит позже. Спешку не прощаем — у неё нет
// «железной» причины.
export const RHYTHM_MAX_SHIFT_SEC = 0.3

// Ниже этой точности слово попадает в «сложнее всего дались». 60 — порог, с
// которого сам Azure помечает слово как Mispronunciation.
export const HARD_WORD_BELOW = 60

// Строка спета, если прозвучала хотя бы половина её слов. Считаем по словам
// Azure, а не по громкости: маска голоса у тихого певца или в шумной комнате
// «не слышит» строк, которые распознавание слышит отчётливо, и экран писал бы
// «пропущено» рядом с высоким баллом за слова.
export const LINE_SUNG_RATIO = 0.5

/** Слово в сравнимом виде: без регистра, пунктуации и кривых апострофов. */
export function tokenOf(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[’ʼ`]/g, "'")
    .replace(/[^a-z0-9']+/g, '')
    .replace(/^'+|'+$/g, '')
}

/**
 * Позиция трека в момент `rec` (секунды записи) — линейно между замерами.
 *
 * За краями замеров не экстраполируем: до первого трек ещё не играл, после
 * последнего дубль уже кончился.
 */
export function trackAt(timeMap, rec) {
  const n = timeMap?.length || 0
  if (!n || !Number.isFinite(rec)) return null
  if (rec <= timeMap[0].rec) return timeMap[0].track
  if (rec >= timeMap[n - 1].rec) return timeMap[n - 1].track
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (timeMap[mid].rec <= rec) lo = mid
    else hi = mid
  }
  const a = timeMap[lo]
  const b = timeMap[hi]
  const span = b.rec - a.rec
  return span > 0 ? a.track + ((rec - a.rec) / span) * (b.track - a.track) : a.track
}

// Разрыв между соседними замерами, который считаем перемоткой, а не игрой.
// Назад трек сам не идёт вовсе; вперёд за 50 мс даже на 1,25× уходит 62 мс.
const JUMP_BACK_SEC = 0.05
const JUMP_FWD_SEC = 1

/**
 * Где в записи звучит каждая строка: `Map<id, {from, to}>` в секундах записи.
 *
 * Если строку пели дважды (отмотали назад и спели заново), берём ПОСЛЕДНИЙ
 * проход — его студент и считает своим исполнением. Строки, до которых дубль
 * не дошёл, окна не получают.
 */
export function lineWindows(lines, timeMap, { before = WINDOW_BEFORE_SEC, after = WINDOW_AFTER_SEC } = {}) {
  const out = new Map()
  for (const line of lines || []) {
    const lo = line.start - before
    const hi = line.end + after
    let run = null
    let last = null
    for (let i = 0; i < (timeMap?.length || 0); i++) {
      const s = timeMap[i]
      const inside = s.track >= lo && s.track <= hi
      const prev = timeMap[i - 1]
      const jumped = prev && (s.track < prev.track - JUMP_BACK_SEC || s.track > prev.track + JUMP_FWD_SEC)
      if (!inside || jumped) {
        if (run) last = run
        run = null
      }
      if (inside) {
        if (!run) run = { from: s.rec, to: s.rec }
        else run.to = s.rec
      }
    }
    const w = run || last
    if (w && w.to > w.from) out.set(line.id, w)
  }
  return out
}

/**
 * Куски записи для Azure: соседние строки склеиваем, на проигрыше режем.
 *
 * Эталон куска — ровно те строки, что в нём звучат: пропущенная строка рвёт
 * кусок, иначе Azure искал бы её слова в чужом аудио. Куски не перекрываются —
 * слово на стыке иначе распозналось бы дважды и засчиталось лишним.
 */
export function planSegments(lines, windows, { maxSec = 30, joinGap = 2, maxChars = 900 } = {}) {
  const segs = []
  let cur = null
  for (const line of lines || []) {
    const w = windows.get(line.id)
    if (!w) {
      cur = null
      continue
    }
    // Склеиваем только то, что в записи идёт дальше: после перемотки назад
    // окно следующей строки может лежать РАНЬШЕ куска (её пели в первом
    // проходе), и «зазор» тогда отрицательный, а не маленький.
    const fits =
      cur &&
      w.from >= cur.from &&
      w.from - cur.to < joinGap &&
      w.to - cur.from <= maxSec &&
      cur.text.length + 1 + line.text.length <= maxChars
    if (fits) {
      cur.to = Math.max(cur.to, w.to)
      cur.lineIds.push(line.id)
      cur.text = `${cur.text} ${line.text}`
    } else {
      cur = { id: segs.length, from: Math.max(0, w.from), to: w.to, lineIds: [line.id], text: line.text }
      segs.push(cur)
    }
  }
  segs.sort((a, b) => a.from - b.from)
  for (let i = 1; i < segs.length; i++) {
    const prev = segs[i - 1]
    const next = segs[i]
    if (next.from < prev.to) {
      const cut = (prev.to + next.from) / 2
      prev.to = cut
      next.from = cut
    }
  }
  return segs.filter((s) => s.to > s.from)
}

/**
 * Распознанный текст дубля в порядке СТРОК песни, а не записи.
 *
 * Куски идут по времени записи, и после перемотки назад последний проход по
 * первым строкам оказывается в записи позже третьей. Склей их по записи — и
 * сравнение слов с текстом песни посчитало бы перестановку ошибками.
 */
export function transcriptInLineOrder(lines, plan, segments) {
  const order = new Map((lines || []).map((l, i) => [l.id, i]))
  const text = new Map((segments || []).map((s) => [s.id, s.transcript || '']))
  return [...(plan || [])]
    .sort((a, b) => (order.get(a.lineIds[0]) ?? 0) - (order.get(b.lineIds[0]) ?? 0))
    .map((s) => text.get(s.id) || '')
    .filter(Boolean)
    .join(' ')
}

// Слова строки с ожидаемым временем: пословные таймкоды разметки, если они
// есть, иначе оценка по длине слов (см. wordTimes).
function refWordsOf(line) {
  const out = []
  for (const w of wordTimes(line)) {
    const tok = tokenOf(w.w)
    if (tok) out.push({ tok, t: w.t })
  }
  return out
}

// Наибольшая общая подпоследовательность: для каждого слова эталона — индекс
// совпавшего услышанного слова или −1. Порядок слов у Azure и у нас один, но
// разбивка может отличаться («rock-n-roll»), поэтому сопоставляем, а не
// идём парами.
function lcsMatch(ref, hyp) {
  const n = ref.length
  const m = hyp.length
  const match = new Array(n).fill(-1)
  if (!n || !m) return match
  const w = m + 1
  const L = new Uint32Array((n + 1) * w)
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      L[i * w + j] =
        ref[i - 1] === hyp[j - 1] ? L[(i - 1) * w + j - 1] + 1 : Math.max(L[(i - 1) * w + j], L[i * w + j - 1])
    }
  }
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    if (ref[i - 1] === hyp[j - 1]) {
      match[i - 1] = j - 1
      i--
      j--
    } else if (L[(i - 1) * w + j] >= L[i * w + j - 1]) {
      i--
    } else {
      j--
    }
  }
  return match
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function timingScore(err) {
  const d = Math.abs(err)
  if (d <= RHYTHM_GOOD_SEC) return 100
  if (d >= RHYTHM_ZERO_SEC) return 0
  return ((RHYTHM_ZERO_SEC - d) / (RHYTHM_ZERO_SEC - RHYTHM_GOOD_SEC)) * 100
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/**
 * Ритм и произношение дубля по ответу Azure.
 *
 * Ритм — насколько вовремя прозвучали слова. Якорь без пословной разметки —
 * начало строки (время строки в LRC — это и есть вступление, оно точное), а
 * с разметкой — каждое слово. Произношение — средняя точность спетых слов.
 * Обе метрики — среднее ПО ВСЕМ строкам песни: непропетая строка даёт ноль,
 * иначе одна идеально спетая строка вытягивала бы ритм и произношение на 100.
 *
 * `null` — если ответ не покрывает весь план: оценку либо даём целиком, либо
 * откатываемся на запасные метрики, половинчатой не бывает.
 */
export function scoreAssessment({ lines, plan, segments, timeMap }) {
  if (!plan?.length || !Array.isArray(segments)) return null
  const bySeg = new Map(segments.map((s) => [s.id, s]))
  const lineById = new Map((lines || []).map((l) => [l.id, l]))
  const heard = new Map() // id строки → [{ tok, t, word, accuracy, at, first }]

  for (const seg of plan) {
    const res = bySeg.get(seg.id)
    if (!res) return null
    const ref = []
    for (const id of seg.lineIds) {
      const line = lineById.get(id)
      if (!line) continue
      refWordsOf(line).forEach((r, k) => ref.push({ ...r, k, lineId: id }))
    }
    // Слова без звука (Omission) и лишние (Insertion) во времени не участвуют.
    const hyp = (res.words || [])
      .filter((w) => (w.error === 'None' || w.error === 'Mispronunciation') && Number.isFinite(w.start))
      .map((w) => ({ ...w, tok: tokenOf(w.word) }))
      .filter((w) => w.tok)
    const match = lcsMatch(
      ref.map((r) => r.tok),
      hyp.map((h) => h.tok),
    )
    ref.forEach((r, i) => {
      if (match[i] < 0) return
      const h = hyp[match[i]]
      const list = heard.get(r.lineId) || []
      list.push({ tok: r.tok, t: r.t, k: r.k, word: h.word, accuracy: h.accuracy, at: trackAt(timeMap, h.start) })
      heard.set(r.lineId, list)
    })
  }

  // Якоря ритма. Без пословной разметки время внутри строки только оценено по
  // длине слов, поэтому берём первое услышанное из трёх первых слов — дальше
  // оценка расходится с пением сильнее, чем допуск.
  const anchors = new Map()
  for (const line of lines || []) {
    const got = heard.get(line.id) || []
    const list = line.words?.length ? got : got.filter((g) => g.k <= 2).slice(0, 1)
    anchors.set(
      line.id,
      list.filter((g) => Number.isFinite(g.at)).map((g) => g.at - g.t),
    )
  }
  const errs = [...anchors.values()].flat()
  const shift = errs.length ? Math.min(RHYTHM_MAX_SHIFT_SEC, Math.max(0, median(errs))) : 0

  const perLine = (lines || []).map((line) => {
    const e = anchors.get(line.id) || []
    const got = heard.get(line.id) || []
    const total = refWordsOf(line).length
    return {
      id: line.id,
      rhythm: e.length ? mean(e.map((x) => timingScore(x - shift))) : 0,
      pron: got.length ? mean(got.map((g) => g.accuracy)) : 0,
      heard: got.length,
      total,
      sung: total > 0 && got.length / total >= LINE_SUNG_RATIO,
    }
  })

  const hard = []
  const seen = new Set()
  for (const g of [...heard.values()].flat().sort((a, b) => a.accuracy - b.accuracy)) {
    if (g.accuracy >= HARD_WORD_BELOW || g.tok.length <= 2 || seen.has(g.tok)) continue
    seen.add(g.tok)
    hard.push(g.word)
    if (hard.length === 3) break
  }

  return {
    rhythm: Math.round(mean(perLine.map((l) => l.rhythm))),
    pron: Math.round(mean(perLine.map((l) => l.pron))),
    shift,
    hard,
    perLine,
  }
}
