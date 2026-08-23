// Планировщик циклов повторения словаря урока.
// Цикл 1 — pre-test: по одному вопросу на слово.
// Цикл 2/3 — 80% на ошибки прошлого цикла, 20% на верные; вопросов N+20%.
// Цикл 4 — 4–5 вопросов только на оставшиеся ошибки.

export const TYPES = ['choice', 'match', 'dictation', 'write']

export function cycleQuestionCount(wordCount, cycle) {
  const n = wordCount | 0
  if (n <= 0) return 0
  if (cycle === 1) return n
  if (cycle === 2 || cycle === 3) return Math.max(n, Math.round(n * 1.2))
  if (cycle === 4) return Math.min(5, Math.max(4, Math.min(5, n)))
  return 0
}

/** Слова, в которых ученик ошибся в данном результате {wordKey: boolean}. */
export function wrongKeys(results) {
  return Object.keys(results || {}).filter((k) => results[k] === false)
}

export function rightKeys(results) {
  return Object.keys(results || {}).filter((k) => results[k] === true)
}

export function shouldOfferCycle4(cycle3Results) {
  return wrongKeys(cycle3Results).length > 0
}

/**
 * Очередь заданий: { type, wordKeys: string[] }.
 * match несёт 3–4 слова и считается за столько вопросов.
 * words — массив { key, word } (key = lower(word)).
 * prevResults — итог предыдущего цикла; для цикла 1 не нужен.
 */
export function planCycle(words, cycle, prevResults, rng = Math.random) {
  const list = uniqueByKey((words || []).filter((w) => w && w.key))
  if (!list.length) return []
  const byKey = Object.fromEntries(list.map((w) => [w.key, w]))

  let targets
  if (cycle === 1) {
    targets = list.map((w) => w.key)
  } else if (cycle === 4) {
    const wrong = wrongKeys(prevResults).filter((k) => byKey[k])
    if (!wrong.length) return []
    const q = Math.min(5, Math.max(4, wrong.length === 1 ? 4 : Math.min(5, Math.max(4, wrong.length))))
    targets = expandKeys(wrong, q, rng)
  } else {
    const q = cycleQuestionCount(list.length, cycle)
    const wrong = wrongKeys(prevResults).filter((k) => byKey[k])
    const right = rightKeys(prevResults).filter((k) => byKey[k])
    const poolWrong = wrong.length ? wrong : list.map((w) => w.key)
    const poolRight = right.length ? right : []
    let nWrong = Math.round(q * 0.8)
    let nRight = q - nWrong
    if (!poolRight.length) {
      nWrong = q
      nRight = 0
    }
    if (!wrong.length && poolRight.length) {
      nWrong = 0
      nRight = q
    }
    targets = expandKeys(poolWrong, nWrong, rng).concat(expandKeys(poolRight, nRight, rng))
    targets = shuffle(targets, rng)
  }

  return packTasks(targets)
}

function expandKeys(keys, count, rng) {
  if (!keys.length || count <= 0) return []
  const out = []
  const bag = shuffle(keys.slice(), rng)
  let i = 0
  while (out.length < count) {
    out.push(bag[i % bag.length])
    i++
    if (i % bag.length === 0) shuffleInPlace(bag, rng)
  }
  return out
}

function packTasks(keys) {
  const leftover = keys.slice()
  const tasks = []
  let typeIdx = 0
  while (leftover.length) {
    const type = TYPES[typeIdx % TYPES.length]
    typeIdx++
    if (type === 'match') {
      const unique = []
      const seen = new Set()
      const deferred = []
      while (leftover.length && unique.length < 4) {
        const k = leftover.shift()
        if (seen.has(k)) deferred.push(k)
        else {
          seen.add(k)
          unique.push(k)
        }
      }
      leftover.unshift(...deferred)
      if (unique.length >= 3) {
        tasks.push({ type: 'match', wordKeys: unique })
      } else {
        leftover.unshift(...unique)
        const k = leftover.shift()
        if (k) tasks.push({ type: 'choice', wordKeys: [k] })
      }
    } else {
      tasks.push({ type, wordKeys: [leftover.shift()] })
    }
  }
  return tasks
}

function shuffle(arr, rng) {
  const a = arr.slice()
  shuffleInPlace(a, rng)
  return a
}

function shuffleInPlace(a, rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
}

export function normalizeAnswer(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function translationOf(word, lang) {
  if (!word) return ''
  if (lang === 'kk' || lang === 'kz') return word.translationKz || word.translationRu || ''
  return word.translationRu || word.translationKz || ''
}

const WEAK_DISTRACTOR = /^(и|а|но|в|на|с|к|у|о|от|до|по|из|за|the|a|an|to|of|in|on|at|or)$/i
const SPARE_DISTRACTORS = ['время', 'друг', 'дом', 'говорить', 'сделать', 'идти', 'книга', 'урок']

export function isUsefulDistractor(text, correct) {
  const s = String(text || '').trim()
  const c = String(correct || '').trim()
  if (!s || !c || s === c) return false
  if (s.length < 2) return false
  if (WEAK_DISTRACTOR.test(s)) return false
  return true
}

/** Четыре варианта для choice: верный перевод + три разных отвлекающих.
 *  Короткие служебные слова («и», «в») и дубли не берём — иначе три кнопки
 *  с одним «и» и экран выглядит сломанным. */
export function buildChoiceOptions(word, bank, lang, rng = Math.random) {
  const correct = String(translationOf(word, lang) || '').trim()
  if (!correct) return null
  const unique = []
  const others = shuffle((bank || []).filter((w) => w && w.key !== word.key), rng)
  for (const w of others) {
    const s = String(translationOf(w, lang) || '').trim()
    if (!isUsefulDistractor(s, correct) || unique.includes(s)) continue
    unique.push(s)
    if (unique.length === 3) break
  }
  for (const s of SPARE_DISTRACTORS) {
    if (unique.length >= 3) break
    if (isUsefulDistractor(s, correct) && !unique.includes(s)) unique.push(s)
  }
  if (!unique.length) return null
  return shuffle(
    [{ text: correct, ok: true }, ...unique.map((text) => ({ text, ok: false }))],
    rng,
  )
}

export function answersMatch(given, expected) {
  const a = normalizeAnswer(given)
  const b = normalizeAnswer(expected)
  if (!a || !b) return false
  return a === b
}

export function writeTranslationOk(given, word) {
  const ru = normalizeAnswer(word?.translationRu)
  const kz = normalizeAnswer(word?.translationKz)
  const g = normalizeAnswer(given)
  if (!g) return false
  return Boolean((ru && g === ru) || (kz && g === kz))
}

export function keyOf(word) {
  return String(word || '').trim().toLowerCase()
}

/** Уникальные слова по key, порядок первого вхождения. */
export function uniqueByKey(list) {
  const seen = new Set()
  return (list || []).filter((w) => w?.key && !seen.has(w.key) && seen.add(w.key))
}

/** Свести ответы заданий цикла в {key: boolean}: ошибка в любом вопросе по слову побеждает. */
export function foldResults(answers) {
  const out = {}
  for (const a of answers || []) {
    const k = a.key
    if (!k) continue
    if (out[k] === false) continue
    out[k] = !!a.ok
  }
  return out
}
