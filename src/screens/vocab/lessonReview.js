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
export function planCycle(words, cycle, prevResults, rng = Math.random, learnedKeys = null) {
  const list = uniqueByKey((words || []).filter((w) => w && w.key))
  if (!list.length) return []
  const byKey = Object.fromEntries(list.map((w) => [w.key, w]))

  let targets
  if (cycle === 1) {
    const fresh = learnedKeys?.size
      ? list.filter((w) => !learnedKeys.has(w.key))
      : list
    targets = (fresh.length ? fresh : list).map((w) => w.key)
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

// Типографский апостроф iOS ставит по умолчанию, а в каталоге встречаются оба
// («don’t like» и «What's your name?»). Раньше ’ просто вырезался, а ' —
// оставался: «don't» и «don’t» не сходились ни в одну сторону.
const APOSTROPHES = /[’‘ʼ`´]/g

export function normalizeAnswer(s) {
  return String(s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    // «партнер» вместо «партнёр» — не ошибка, так пишет почти каждый.
    .replace(/ё/g, 'е')
    // Знак между словами — граница слова, а не пустое место: «страна/страны»
    // иначе склеивалось в «странастраны» и не сходилось с «страна / страны».
    // Дефис туда же: на слух «full-time» от «full time» не отличить.
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    // Апостроф на краю слова — кавычка, а не часть слова.
    .replace(/(^|\s)'+|'+(?=\s|$)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

// Кириллические двойники латиницы: на экране «е» и «e» одинаковы, а для
// сравнения это разные символы. Ученик с русской раскладкой набирает визуально
// правильное слово и получает отказ, не понимая за что. Перед сверкой сводим
// двойники к латинице — обе стороны одинаково, поэтому настоящих английских
// слов это не портит.
const LOOKALIKE = {
  а: 'a', А: 'a', в: 'b', В: 'b', с: 'c', С: 'c', е: 'e', Е: 'e', ё: 'e', Ё: 'e',
  н: 'h', Н: 'h', к: 'k', К: 'k', м: 'm', М: 'm', о: 'o', О: 'o', р: 'p', Р: 'p',
  ѕ: 's', Ѕ: 's', т: 't', Т: 't', у: 'y', У: 'y', х: 'x', Х: 'x', і: 'i', І: 'i',
  ј: 'j', Ј: 'j',
}

export function latinLookalikes(s) {
  return String(s || '').replace(/[Ѐ-ӿ]/g, (ch) => LOOKALIKE[ch] ?? ch)
}

export function translationOf(word, lang) {
  if (!word) return ''
  if (lang === 'kk' || lang === 'kz') return word.translationKz || word.translationRu || ''
  return word.translationRu || word.translationKz || ''
}

/**
 * Что слово значит: перевод, а если его нет — английское определение.
 *
 * У B2 каталога перевода нет ни у одного слова (только def), и практика
 * спрашивала «введите перевод» слова, у которого перевода не существует, —
 * любой ответ уходил в ошибки, а в «соедините» справа стояли пустые кнопки.
 */
export function meaningOf(word, lang) {
  return String(translationOf(word, lang) || word?.def || '').trim()
}

/**
 * Все формы перевода, которые засчитываются, — уже нормализованные.
 *
 * «родился / родилась», «вкус; иметь вкус», «имя, фамилия» — это варианты, и
 * ученик пишет один из них. Запятая делит варианты, только если в самом слове
 * запятой нет: у «I'm fine, thanks» она часть фразы, и «спасибо» ответом не
 * будет. Часть в скобках — пояснение или необязательный хвост: «одолжить
 * (дать)», «официант(ка)» — засчитываем и с ней, и без неё.
 */
export function translationVariants(tr, en = '') {
  const full = String(tr || '').trim()
  if (!full) return []
  const sep = /,/.test(String(en)) ? /[/;]/ : /[/;,]/
  const out = new Set()
  for (const part of [full, ...full.split(sep)]) {
    const p = part.trim()
    if (!p) continue
    out.add(p)
    if (/\(.*?\)/.test(p)) {
      out.add(p.replace(/\(.*?\)/g, ' '))
      out.add(p.replace(/[()]/g, ''))
    }
  }
  return [...new Set([...out].map(normalizeAnswer).filter(Boolean))]
}

const WEAK_DISTRACTOR = /^(и|а|но|в|на|с|к|у|о|от|до|по|из|за|the|a|an|to|of|in|on|at|or)$/i
// Добивка вариантов, когда отвлекающих из урока не хватило. Своя на каждый язык
// перевода: русское «время» среди казахских вариантов выдаёт себя само.
const SPARE_DISTRACTORS = {
  ru: ['время', 'друг', 'дом', 'говорить', 'сделать', 'идти', 'книга', 'урок'],
  kk: ['уақыт', 'дос', 'үй', 'сөйлеу', 'жасау', 'бару', 'кітап', 'сабақ'],
}

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
 *  с одним «и» и экран выглядит сломанным.
 *
 *  У слова без перевода (B2) варианты — английские определения, и добивки
 *  переводами там нет. Отвлекающий, совпадающий с верным хотя бы одним
 *  вариантом («делать» у do и «делать / готовить» у make), не берём: иначе
 *  на экране два верных ответа, а засчитывается один. */
export function buildChoiceOptions(word, bank, lang, rng = Math.random) {
  const byTranslation = !!translationOf(word, lang)
  const textOf = (w) => String((byTranslation ? translationOf(w, lang) : w?.def) || '').trim()
  const correct = textOf(word)
  if (!correct) return null
  const correctParts = new Set(translationVariants(correct))
  const seen = new Set([normalizeAnswer(correct)])
  const unique = []
  const take = (s) => {
    const n = normalizeAnswer(s)
    if (!isUsefulDistractor(s, correct) || seen.has(n)) return
    if (translationVariants(s).some((v) => correctParts.has(v))) return
    seen.add(n)
    unique.push(s)
  }
  const others = shuffle((bank || []).filter((w) => w && w.key !== word.key), rng)
  for (const w of others) {
    if (unique.length >= 3) break
    take(textOf(w))
  }
  if (byTranslation) {
    // Язык добивки — язык верного ответа: у казахского интерфейса перевод
    // бывает только русским, и тогда добивать надо по-русски.
    const kk = (lang === 'kk' || lang === 'kz') && !!word.translationKz
    for (const s of SPARE_DISTRACTORS[kk ? 'kk' : 'ru']) {
      if (unique.length >= 3) break
      take(s)
    }
  }
  if (!unique.length) return null
  return shuffle(
    [{ text: correct, ok: true }, ...unique.map((text) => ({ text, ok: false }))],
    rng,
  )
}

// Точка между буквами — признак сокращения (p.m., U.S., e.g.).
const DOTTED = /\p{L}\.\p{L}/u

/** Набранное английское слово против ожидаемого (диктант, набор по буквам). */
export function answersMatch(given, expected) {
  const a = normalizeAnswer(latinLookalikes(given))
  const b = normalizeAnswer(latinLookalikes(expected))
  if (!a || !b) return false
  if (a === b) return true
  // Слово через дефис пишут и раздельно, и слитно: T-shirt, t shirt, tshirt.
  // То же с сокращениями через точку: точек на слух не слышно, и «p.m.»
  // набирают как «pm», «p.m» или «p m» — в любую сторону. Правило живёт здесь,
  // а не в normalizeAnswer: та общая с переводами, и склейка точек в ней
  // ломала уже засчитывавшееся «p m». Для остальных слов пробел значим —
  // «alot» вместо «a lot» остаётся ошибкой.
  const loose = /-/.test(String(expected)) || DOTTED.test(String(expected)) || DOTTED.test(String(given))
  return loose && a.replace(/ /g, '') === b.replace(/ /g, '')
}

export function writeTranslationOk(given, word) {
  const g = normalizeAnswer(given)
  if (!g) return false
  const en = word?.word || ''
  return [word?.translationRu, word?.translationKz]
    .flatMap((tr) => translationVariants(tr, en))
    .includes(g)
}

/**
 * Очередь заданий → то, что слово действительно позволяет спросить.
 *
 * planCycle раздаёт типы по кругу, не глядя на слова. Слову без значения
 * (сохранённое без перевода) нечего показать справа в «соедините» и нечего
 * предложить в «выберите» — такое уходит в «напишите», а там уже решается,
 * набор по буквам это или на слух.
 */
export function fitTasks(tasks, byKey, lang) {
  const out = []
  for (const task of tasks || []) {
    const words = (task.wordKeys || []).map((k) => byKey[k]).filter(Boolean)
    const known = words.filter((w) => meaningOf(w, lang))
    const blind = words.filter((w) => !meaningOf(w, lang))
    if (task.type === 'match') {
      if (known.length >= 3) out.push({ type: 'match', wordKeys: known.map((w) => w.key) })
      else for (const w of known) out.push({ type: 'choice', wordKeys: [w.key] })
      for (const w of blind) out.push({ type: 'write', wordKeys: [w.key] })
    } else if (task.type === 'choice' && blind.length) {
      out.push({ type: 'write', wordKeys: task.wordKeys })
    } else {
      out.push(task)
    }
  }
  return out
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

/** Слова, которые уже были верно отвечены хотя бы в одном цикле. */
export function learnedKeysFromCycles(cycleResults) {
  const keys = new Set()
  for (const map of Object.values(cycleResults || {})) {
    for (const [k, ok] of Object.entries(map || {})) {
      if (ok && k) keys.add(String(k).toLowerCase())
    }
  }
  return keys
}
