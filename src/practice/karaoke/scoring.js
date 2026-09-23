// Метрики исполнения караоке. Чистый модуль без DOM и без сети: сюда приходят
// разметка трека, маска пения (что намерил VAD) и распознанный текст, отсюда
// уходят четыре метрики и итоговый балл.
//
// Формулы — из ТЗ раздела 8. Держим их здесь одним куском, потому что они
// связаны: веса зависят от того, доступно ли распознавание слов, а модификаторы
// применяются к уже собранному баллу.

// Шаг бинарных масок. 50 мс — компромисс из ТЗ: короче нет смысла (VAD и так
// сглаживается по нескольким окнам), длиннее — и IoU перестаёт видеть, что
// студент вступил на полсекунды позже.
export const MASK_STEP_MS = 50

// ── Маски ───────────────────────────────────────────────────────────────────
// Эталон и исполнение приводим к одному виду: массив 0/1 по всей длине трека.
// Дальше обе метрики (ритм и покрытие) — это арифметика над двумя массивами,
// а не разбор случаев «отстал / обогнал / оборвал».

export function maskLength(durationSec, stepMs = MASK_STEP_MS) {
  const d = Number(durationSec)
  if (!Number.isFinite(d) || d <= 0) return 0
  return Math.ceil((d * 1000) / stepMs)
}

/** Эталонная маска: единицы там, где по разметке звучит строка. */
export function referenceMask(lines, durationSec, stepMs = MASK_STEP_MS) {
  const len = maskLength(durationSec, stepMs)
  const mask = new Uint8Array(len)
  for (const line of lines || []) {
    const from = Math.max(0, Math.floor((line.start * 1000) / stepMs))
    const to = Math.min(len, Math.ceil((line.end * 1000) / stepMs))
    for (let i = from; i < to; i++) mask[i] = 1
  }
  return mask
}

/**
 * Ритм — IoU эталонной и студенческой масок.
 *
 * Одной метрикой ловит сразу три разных огреха: отставание (пересечение
 * падает), пение поверх пауз (растёт объединение) и обрывание строк на
 * полуслове (падает пересечение). Поэтому и вес у неё самый большой из
 * «безсловесных».
 */
export function rhythmScore(refMask, userMask) {
  const len = Math.max(refMask.length, userMask.length)
  let inter = 0
  let union = 0
  for (let i = 0; i < len; i++) {
    const a = refMask[i] || 0
    const b = userMask[i] || 0
    if (a && b) inter++
    if (a || b) union++
  }
  if (union === 0) return 0
  return (inter / union) * 100
}

/**
 * Покрытие — доля строк, которые студент действительно спел.
 *
 * Строка засчитывается, если голос был слышен минимум 60% её длительности
 * (порог из ТЗ): пропеть первое слово и замолчать — это не спетая строка.
 * Возвращаем и сам балл, и признаки по строкам — экран результата показывает
 * по ним три худшие строки.
 */
export function coverageScore(lines, userMask, stepMs = MASK_STEP_MS, threshold = 0.6) {
  const perLine = (lines || []).map((line) => {
    const from = Math.max(0, Math.floor((line.start * 1000) / stepMs))
    const to = Math.max(from + 1, Math.ceil((line.end * 1000) / stepMs))
    let hit = 0
    for (let i = from; i < to; i++) if (userMask[i]) hit++
    const ratio = hit / (to - from)
    return { id: line.id, ratio, sung: ratio >= threshold }
  })
  const total = perLine.length
  const sung = perLine.filter((l) => l.sung).length
  return { score: total ? (sung / total) * 100 : 0, perLine }
}

// ── Слова ───────────────────────────────────────────────────────────────────

// Сокращения разворачиваем до сравнения: распознавание пишет «I'm», а в
// разметке может стоять «I am» (и наоборот) — без нормализации это две ошибки
// на ровном месте. Список короткий и покрывает песенный сленг, остальное
// добивают общие правила ниже.
// Map, а не объектный литерал: ключи сюда приходят из текста песни и из
// распознавания, то есть какие угодно. У литерала CONTRACTIONS['constructor']
// вернул бы не undefined, а функцию Object — и следующая же строка падала бы
// на mapped.split. Падение случалось бы внутри finish(), в async-колбэке без
// catch: экран «Считаем…» без единой кнопки, дубль потерян.
const CONTRACTIONS = new Map(Object.entries({
  gonna: 'going to',
  wanna: 'want to',
  gotta: 'got to',
  gimme: 'give me',
  lemme: 'let me',
  cause: 'because',
  cuz: 'because',
  aint: 'is not',
  yall: 'you all',
  "y'all": 'you all',
  "won't": 'will not',
  "can't": 'can not',
  cannot: 'can not',
  "shan't": 'shall not',
  "let's": 'let us',
  "i'm": 'i am',
  "it's": 'it is',
  "that's": 'that is',
  "he's": 'he is',
  "she's": 'she is',
  "there's": 'there is',
  "what's": 'what is',
  "who's": 'who is',
}))

/** Текст → массив слов в сравнимом виде. */
export function normalizeWords(text) {
  let s = String(text || '')
    .toLowerCase()
    // апострофы бывают трёх видов, приводим к одному до всех замен
    .replace(/[’ʼ`]/g, "'")
    .replace(/[^a-z0-9'\s]+/g, ' ')
  const out = []
  for (const raw of s.split(/\s+/)) {
    const w = raw.replace(/^'+|'+$/g, '')
    if (!w) continue
    const mapped = CONTRACTIONS.get(w)
    if (mapped) {
      out.push(...mapped.split(' '))
      continue
    }
    // Общие правила для того, чего нет в словаре: n't → not, 're → are и т.д.
    const m = w.match(/^(.+?)(n't|'re|'ve|'ll|'d|'s)$/)
    if (m) {
      const tail = {
        "n't": 'not',
        "'re": 'are',
        "'ve": 'have',
        "'ll": 'will',
        "'d": 'would',
      }[m[2]]
      // «'s» оставляем приклеенным: у существительных это притяжательное, а
      // не «is», и разворачивать его — портить сравнение.
      if (tail) {
        out.push(m[1], tail)
        continue
      }
    }
    out.push(w)
  }
  return out
}

/** Расстояние Левенштейна на уровне слов (замены/вставки/пропуски). */
export function wordDistance(ref, hyp) {
  const n = ref.length
  const m = hyp.length
  if (n === 0) return m
  if (m === 0) return n
  let prev = new Array(m + 1)
  let cur = new Array(m + 1)
  for (let j = 0; j <= m; j++) prev[j] = j
  for (let i = 1; i <= n; i++) {
    cur[0] = i
    for (let j = 1; j <= m; j++) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    const swap = prev
    prev = cur
    cur = swap
  }
  return prev[m]
}

/**
 * Слова — (1 − WER) × 100.
 *
 * WER считаем от длины эталона, поэтому лишний бубнёж штрафуется так же, как
 * пропуск: спеть вдвое больше слов, чем в песне, — тоже не попадание. Балл
 * зажимаем снизу нулём: WER бывает и больше единицы.
 */
export function lyricsScore(referenceText, recognizedText) {
  const ref = normalizeWords(referenceText)
  const hyp = normalizeWords(recognizedText)
  if (ref.length === 0) return { score: 0, wer: 1, missed: [] }
  const wer = wordDistance(ref, hyp) / ref.length
  const heard = new Set(hyp)
  // Слова эталона, которых не было в распознанном тексте ни разу — их экран
  // результата предлагает отправить в словарь.
  const missed = [...new Set(ref.filter((w) => !heard.has(w) && w.length > 2))]
  return { score: Math.max(0, (1 - wer) * 100), wer, missed }
}

// ── Темп ────────────────────────────────────────────────────────────────────

/**
 * Слоги в английском слове — грубая эвристика по группам гласных с поправкой
 * на немую «e». Точность здесь и не нужна: темп сравнивается как отношение
 * двух величин, посчитанных ОДНИМ И ТЕМ ЖЕ способом, так что систематическая
 * ошибка эвристики сокращается.
 */
export function syllables(word) {
  const w = String(word || '').toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  if (w.length <= 3) return 1
  const groups = w.replace(/e$/, '').match(/[aeiouy]+/g)
  return Math.max(1, groups ? groups.length : 1)
}

export function syllablesIn(text) {
  return normalizeWords(text).reduce((sum, w) => sum + syllables(w), 0)
}

/**
 * Темп — слогов в секунду у студента против эталона.
 *
 * Отклонение до 15% не штрафуем (петь ровно в темп оригинала не требуется),
 * дальше линейно до нуля на 50%.
 *
 * Если распознавания не было, слогов у студента взять неоткуда — тогда за
 * прокси темпа берём отношение времени пения к эталонной длительности строк.
 * Это не то же самое, но ловит главное: тянуть вдвое дольше или проговорить
 * вдвое быстрее.
 */
export function paceScore({ refSyllables, refSungSec, userSyllables, userSungSec }) {
  const refRate = refSungSec > 0 ? refSyllables / refSungSec : 0
  let deviation
  if (Number.isFinite(userSyllables) && userSyllables > 0 && userSungSec > 0 && refRate > 0) {
    const userRate = userSyllables / userSungSec
    deviation = Math.abs(userRate - refRate) / refRate
  } else if (refSungSec > 0 && userSungSec > 0) {
    deviation = Math.abs(userSungSec - refSungSec) / refSungSec
  } else {
    return 0
  }
  if (deviation <= 0.15) return 100
  if (deviation >= 0.5) return 0
  return ((0.5 - deviation) / 0.35) * 100
}

// ── Итог ────────────────────────────────────────────────────────────────────

// Веса ТЗ 8.2. Второй набор — для случая, когда распознавание недоступно
// (нет сети, отказал STT): вес слов не размазывается по остальным поровну, а
// уходит в ритм, потому что именно он остаётся содержательной метрикой.
export const WEIGHTS_FULL = { lyrics: 0.35, rhythm: 0.3, coverage: 0.2, pace: 0.15 }
export const WEIGHTS_NO_STT = { rhythm: 0.55, coverage: 0.3, pace: 0.15 }

// Пороги медалей. Отдельной таблицей, потому что экран результата пишет их
// словами («от 60 баллов», «до золота — 7 баллов») — числа в тексте обязаны
// совпадать с теми, по которым медаль выдаётся.
export const MEDAL_MIN = { bronze: 60, silver: 75, gold: 90 }
export const MEDALS = ['bronze', 'silver', 'gold']

export function medalFor(score) {
  if (score >= MEDAL_MIN.gold) return 'gold'
  if (score >= MEDAL_MIN.silver) return 'silver'
  if (score >= MEDAL_MIN.bronze) return 'bronze'
  return null
}

/**
 * Собирает итоговый балл Full Karaoke.
 *
 * `hasLyrics` — были ли слова оценены. Отдельным флагом, а не «lyrics === null»:
 * ноль за слова (спел не то) и отсутствие оценки — разные вещи, и на экране
 * результата они выглядят по-разному.
 */
export function finalScore({ lyrics, rhythm, coverage, pace, hasLyrics, instrumental }) {
  const w = hasLyrics ? WEIGHTS_FULL : WEIGHTS_NO_STT
  let score = w.rhythm * rhythm + w.coverage * coverage + w.pace * pace
  if (hasLyrics) score += w.lyrics * lyrics
  // Минусовка сложнее: вести мелодию не за кем.
  if (instrumental) score *= 1.15
  // Медаль считаем от того же числа, которое увидит студент. От исходного 89.6
  // экран показывал бы 90 и серебро, хотя золото начинается с 90 — обидно
  // ровно там, где в результат и всматриваются.
  const rounded = Math.round(Math.max(0, Math.min(100, score)))
  return { score: rounded, medal: medalFor(rounded) }
}

/** Три худшие строки — то, что предлагаем повторить на экране результата. */
export function weakestLines(perLine, lines, limit = 3) {
  const byId = new Map((lines || []).map((l) => [l.id, l]))
  return [...(perLine || [])]
    .filter((l) => !l.sung)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, limit)
    .map((l) => ({ ...l, text: byId.get(l.id)?.text || '', start: byId.get(l.id)?.start ?? 0 }))
}

// ── Слова по строкам ────────────────────────────────────────────────────────

/**
 * Какие слова каждой строки прозвучали.
 *
 * Распознавание возвращает один текст на весь дубль, без таймкодов, поэтому
 * разложить его по строкам можно только выравниванием. Выравниваем по
 * наибольшей общей подпоследовательности (LCS), а не обратным ходом
 * Левенштейна, как у WER: у Левенштейна при равной цене «замена» и «вставка +
 * совпадение» равноправны, и когда услышано больше слов, чем в эталоне
 * (перепетая строка с разгоном, бубнёж между строками), он честно
 * прозвучавшие слова уводил в замены — строка из семи слов, спетая целиком,
 * получала 43%. LCS по определению находит максимум совпавших слов по порядку.
 *
 * Весь текст песни выравниваем разом, а не строку за строкой: границы строк
 * в распознанном тексте неизвестны, и построчное сравнение засчитывало бы
 * слово из соседней строки.
 *
 * Возвращает по строке `{ id, ratio, missed }`: доля совпавших слов и слова,
 * которые не прозвучали (короче трёх букв не берём — артикли и предлоги
 * распознавание глотает у всех, «сложным» такое слово не назовёшь).
 */
export function lineWordMatches(lines, recognizedText) {
  const ref = []
  const lineOf = []
  ;(lines || []).forEach((line, li) => {
    for (const w of normalizeWords(line.text)) {
      ref.push(w)
      lineOf.push(li)
    }
  })
  const hyp = normalizeWords(recognizedText)
  const n = ref.length
  const m = hyp.length
  const hit = new Uint8Array(n)
  if (n && m) {
    // Полная матрица, а не две строки, как в wordDistance: обратному ходу она
    // нужна целиком. Песня — это сотни слов, так что это сотни килобайт.
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
        hit[i - 1] = 1
        i--
        j--
      } else if (L[(i - 1) * w + j] >= L[i * w + j - 1]) {
        i--
      } else {
        j--
      }
    }
  }
  return (lines || []).map((line, li) => {
    let total = 0
    let got = 0
    const missed = []
    for (let k = 0; k < n; k++) {
      if (lineOf[k] !== li) continue
      total++
      if (hit[k]) got++
      else if (ref[k].length > 2 && !missed.includes(ref[k])) missed.push(ref[k])
    }
    return { id: line.id, ratio: total ? got / total : 1, missed }
  })
}

// Ниже этой доли совпавших слов строку предлагаем повторить. Три четверти, а не
// «хоть одно пропущенное»: распознавание пения само теряет слово-другое, и
// список из половины песни ничему бы не учил.
const REPEAT_BELOW = 0.75

/**
 * Строки, которые стоит повторить, — худшие сначала.
 *
 * Со словами (`matches` от lineWordMatches) судим по ним: это и есть
 * «совпадение» строки, а «сложное слово» — самое длинное из непрозвучавших.
 * Без распознавания остаётся только голос по маске: строка, где студент
 * молчал, — та же слабая строка, но сложного слова у неё нет.
 */
export function linesToRepeat({ lines, perLine, matches, limit = 3 }) {
  const byId = new Map((lines || []).map((l) => [l.id, l]))
  const rows = matches
    ? matches
        .filter((m) => m.ratio < REPEAT_BELOW)
        .map((m) => ({
          id: m.id,
          ratio: m.ratio,
          hard: [...m.missed].sort((a, b) => b.length - a.length)[0] || null,
        }))
    : (perLine || []).filter((l) => !l.sung).map((l) => ({ id: l.id, ratio: l.ratio, hard: null }))
  return rows
    .sort((a, b) => a.ratio - b.ratio || (byId.get(a.id)?.start ?? 0) - (byId.get(b.id)?.start ?? 0))
    .slice(0, limit)
    .map((r) => {
      const line = byId.get(r.id)
      return { ...r, text: line?.text || '', start: line?.start ?? 0, end: line?.end ?? 0 }
    })
}

/**
 * Пропущенные строки одним куском: `{ count, from, to }`, где from/to — время
 * отрезка, если все пропуски идут подряд. Разбросанные пропуски одним
 * отрезком не описать: «на 0:12–2:45» звучало бы как «молчал две с половиной
 * минуты», — тогда from/to нет.
 */
export function missedSpan(perLine, lines) {
  const missed = []
  ;(perLine || []).forEach((l, i) => {
    if (!l.sung) missed.push(i)
  })
  if (missed.length === 0) return { count: 0 }
  // Пропущена вся песня — «на 0:03–2:58» ничего не добавило бы к «32 строки».
  if (missed.length === perLine.length) return { count: missed.length }
  const contiguous = missed.every((v, k) => k === 0 || v === missed[k - 1] + 1)
  if (!contiguous) return { count: missed.length }
  return {
    count: missed.length,
    from: lines[missed[0]]?.start ?? 0,
    to: lines[missed[missed.length - 1]]?.end ?? 0,
  }
}
