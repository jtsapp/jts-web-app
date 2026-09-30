// «Word Rush» — колода рядов ворот для второй игры «Аркады». Чистый модуль:
// ни React, ни three.js, случайность приходит снаружи (`rng`), поэтому
// правила ряда проверяются тестом с фиксированным зерном.
//
// Ряд — слово-вопрос на языке интерфейса и три английских слова на воротах,
// одно из них — перевод. Слова — из Словаря (public/practice/vocab/
// essential-*.json): там уже есть ru, kk, часть речи и тема.

// Слово с ошибкой возвращается через столько рядов: достаточно далеко, чтобы
// ответ шёл не из памяти о только что мелькнувшей подсказке.
export const RETRY_AFTER = 5

// Словарь пишет части речи вразнобой: в A2, B1 и C1 рядом живут `adj` и
// `adjective`, `adv` и `adverb`. Без приведения ложные ворота для
// `adjective` искались бы в половине прилагательных, а при нехватке — среди
// существительных, и слово угадывалось бы по части речи, а не по смыслу.
const POS_ALIASES = {
  adjective: 'adj',
  adverb: 'adv',
  conjunction: 'conj',
  preposition: 'prep',
  pronoun: 'pron',
  determiner: 'det',
  exclamation: 'excl',
  interj: 'excl',
  'phrasal verb': 'verb',
}

export function normPos(pos) {
  const p = String(pos || '').trim().toLowerCase()
  return POS_ALIASES[p] || p
}

const norm = (s) => String(s || '').trim().toLowerCase().replace(/ё/g, 'е')

// «наркоман, зависимый человек» — два ответа, а не один: совпадение с любым
// из них делает ложные ворота вторыми верными.
const sensesOf = (s) => String(s || '').split(/[,;/]/).map(norm).filter(Boolean)

// Вопрос по-казахски — только в казахском интерфейсе. Английский интерфейс
// тоже получает русский: переводить английское слово на английский нечего.
export function promptOf(word, lang) {
  return lang === 'kk' && word.kk ? word.kk : word.ru
}

export function createDeck(words, { lang = 'ru', rng = Math.random } = {}) {
  const seen = new Set()
  const pool = []
  for (const w of words || []) {
    const key = norm(w?.en)
    const prompt = w ? promptOf(w, lang) : ''
    if (!key || !prompt || seen.has(key)) continue
    seen.add(key)
    pool.push({ id: w.id, en: w.en, prompt, key, pos: normPos(w.pos), topic: w.topic || '', senses: sensesOf(prompt) })
  }
  if (pool.length < 3) throw new Error('word rush: в колоде меньше трёх слов')

  const shuffled = (list) => {
    const a = list.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  // Ложные ворота с тем же смыслом на языке вопроса дали бы два верных ответа.
  const clash = (a, b) => a.key === b.key || a.senses.some((s) => b.senses.includes(s))

  let queue = []
  let previous = null
  let drawn = 0
  const retry = []

  function pickTarget() {
    const due = retry.findIndex((r) => r.due <= drawn)
    if (due >= 0) return retry.splice(due, 1)[0].word
    if (!queue.length) {
      queue = shuffled(pool)
      // Новый круг не начинается со слова, которое только что было.
      if (queue.length > 1 && queue[queue.length - 1] === previous) queue.unshift(queue.pop())
    }
    return queue.pop()
  }

  function pickDistractors(target) {
    const fits = (w) => w !== target && !clash(w, target)
    const tiers = [
      pool.filter((w) => w.pos === target.pos && w.topic === target.topic && fits(w)),
      pool.filter((w) => w.pos === target.pos && w.topic !== target.topic && fits(w)),
      pool.filter((w) => w.pos !== target.pos && fits(w)),
      // Крайний случай крошечного пула: лучше повтор смысла, чем ряд без ворот.
      pool.filter((w) => w !== target && !fits(w)),
    ]
    const out = []
    for (const tier of tiers) {
      const left = tier.slice()
      while (out.length < 2 && left.length) out.push(left.splice(Math.floor(rng() * left.length), 1)[0])
      if (out.length === 2) break
    }
    return out
  }

  function next() {
    const target = pickTarget()
    previous = target
    drawn++
    const others = pickDistractors(target)
    const correct = Math.floor(rng() * 3)
    const options = [0, 1, 2].map((lane) => (lane === correct ? target.en : others.shift().en))
    return { id: target.id, prompt: target.prompt, answer: target.en, options, correct }
  }

  // Ошибка: слово вернётся через RETRY_AFTER рядов, уже с другими ложными
  // воротами. Сверка и по id, и по en: у Easy пул собран из двух уровней.
  function miss(row) {
    const word = pool.find((w) => w.id === row.id && w.en === row.answer)
    if (word) retry.push({ word, due: drawn + RETRY_AFTER })
  }

  return { next, miss, size: pool.length }
}
