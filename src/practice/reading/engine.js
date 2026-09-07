// Чистое ядро раздела «Чтение» — порт помощников из data/jtsreading.html
// (norm/wordCount/readMin/sentences/exTotal, ~:547–578 прототипа). Ни DOM, ни
// сети: всё это считается и в тестах на node, и в рантайме браузера.
//
// Совместимость с прототипом проверяется оракулом
// (__fixtures__/oracle-<level>.json, его пишет scripts/extract-reading.js
// ПРОТОТИПНЫМИ функциями): расхождение порта = красный engine.test.js.

// Тринадцать типов упражнений делятся на пять семейств по механике ответа.
// Дальше весь движок и все экраны ветвятся именно по семейству, а не по типу.
export const CHOICE_TYPES = ['before', 'mc', 'finish', 'tf', 'tfng', 'vocab']
export const MATCH_TYPES = ['match', 'wwmatch', 'headings']
export const ORDER_TYPES = ['order', 'summary']

export function isChoice(type) {
  return CHOICE_TYPES.includes(type)
}
export function isMatch(type) {
  return MATCH_TYPES.includes(type)
}
export function isOrder(type) {
  return ORDER_TYPES.includes(type)
}

/** Слово в форму для сравнения и для поиска в словаре: нижний регистр,
 *  типографский апостроф → обычный, обрезка пунктуации по краям. */
export function norm(w) {
  return String(w)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
}

export function wordCount(text) {
  return text.join(' ').split(/\s+/).filter(Boolean).length
}

/** Минуты чтения: 70 слов в минуту — темп прототипа для учебных текстов A1–C1
 *  (вдвое медленнее взрослого носителя, это чтение с разбором). Минимум 1. */
export function readMin(text) {
  return Math.max(1, Math.round(wordCount(text) / 70))
}

/** Абзац → предложения. Нужны для пофразной подсветки при озвучке. */
export function sentences(par) {
  return (par.match(/[^.!?…]+(?:[.!?…]+["'”’)]*)?\s*/g) || [par]).map((s) => s.trim()).filter(Boolean)
}

/** Сколько всего очков в упражнении — знаменатель прогресса. */
export function exTotal(ex) {
  switch (ex.type) {
    case 'gap':
      return (ex.text.match(/\{[^}]+\}/g) || []).length
    case 'match':
    case 'wwmatch':
    case 'headings':
      return ex.pairs.length
    case 'order':
    case 'summary':
      return ex.items.length
    case 'reflection':
      return ex.min || 2
    default:
      return ex.items.length
  }
}

/** Разбор шаблона gap-fill: чётные куски — текст, нечётные — ответы. */
export function gapParts(ex) {
  const parts = String(ex.text).split(/\{([^}]+)\}/)
  return { parts, answers: parts.filter((_, k) => k % 2 === 1) }
}

/**
 * Вопросы choice-семейства в едином виде {q, o[], a, e}. tf и tfng в данных
 * лежат ответом-значением (true / "NG"), а не индексом варианта, поэтому
 * переводим их здесь, а не в компоненте: индексы нужны и проверке, и показу
 * правильного ответа.
 * labels — подписи вариантов из i18n приложения ({ yes, no, notGiven }).
 */
export function choiceItems(ex, labels) {
  return ex.items.map((it) => {
    if (ex.type === 'tf') {
      return { q: it.s, o: [labels.yes, labels.no], a: it.a ? 0 : 1, e: it.e }
    }
    if (ex.type === 'tfng') {
      return { q: it.s, o: [labels.yes, labels.no, labels.notGiven], a: { T: 0, F: 1, NG: 2 }[it.a], e: it.e }
    }
    return { q: it.q || it.s, o: it.o, a: it.a, e: it.e }
  })
}

/** Перемешивание Фишера — Йетса на переданном генераторе (по умолчанию Math.random). */
export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Перестановка индексов, у которой НИ ОДИН элемент не остался на месте.
 * Иначе «соедини пары» и «расставь по порядку» иногда открывались уже
 * решёнными — прототип отдельно это чинил (shuffledIdx).
 */
export function shuffledIdx(n, rnd = Math.random) {
  const base = Array.from({ length: n }, (_, i) => i)
  if (n < 2) return base
  let s
  do {
    s = shuffle(base, rnd)
  } while (s.every((v, i) => v === i))
  return s
}

/** Стартовое состояние ответа на упражнение. */
export function initExercise(ex, rnd = Math.random) {
  const st = { sel: {}, pairs: {}, activeL: null, activeR: null, fill: [], activeGap: null, seq: [], reflect: '' }
  if (ex.type === 'gap') {
    const { parts, answers } = gapParts(ex)
    st.parts = parts
    st.answers = answers
    // В банк кладём и лишние слова (ex.extra) — угадать по остатку нельзя.
    st.bank = shuffle(answers.concat(ex.extra || []), rnd)
    st.fill = answers.map(() => null)
  } else if (isMatch(ex.type)) {
    st.right = shuffledIdx(ex.pairs.length, rnd)
  } else if (isOrder(ex.type)) {
    st.seq = shuffledIdx(ex.items.length, rnd)
  }
  return st
}

/** Ответ «как надо» — для кнопки «Показать ответ». */
export function solvedState(ex, st) {
  if (isChoice(ex.type)) {
    const sel = {}
    // Индекс правильного варианта берём из данных напрямую; для tf/tfng
    // choiceItems уже перевёл его в номер кнопки.
    choiceItems(ex, { yes: '', no: '', notGiven: '' }).forEach((it, k) => {
      sel[k] = it.a
    })
    return { ...st, sel }
  }
  if (isMatch(ex.type)) {
    const pairs = {}
    ex.pairs.forEach((_, k) => {
      pairs[k] = k
    })
    return { ...st, pairs, activeL: null, activeR: null }
  }
  if (ex.type === 'gap') {
    return { ...st, fill: st.answers.map((a) => st.bank.indexOf(a)), activeGap: null }
  }
  if (isOrder(ex.type)) {
    return { ...st, seq: ex.items.map((_, k) => k) }
  }
  return st
}

/** Прогресс текста в процентах по сохранённым результатам упражнений. */
export function textScore(text, saved) {
  let got = 0
  let total = 0
  text.exercises.forEach((ex, i) => {
    const n = exTotal(ex)
    total += n
    const s = saved && saved[i]
    if (s) got += Math.min(n, s.score)
  })
  return { got, total, pct: total ? Math.round((got / total) * 100) : 0 }
}
