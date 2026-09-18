// Движок «Неправильных глаголов» — чистые функции, порт data/jtsverbs.html.
// Прототип держит состояние в глобальных S и P и читает их изнутри; здесь то
// же самое приходит аргументами, иначе функции нечем накрыть тестом.
//
// Порт сверяется с оракулом (__fixtures__/oracle.json), который посчитали
// САМИ функции прототипа: красный engine.test.js значит, что разъехался порт,
// и чинить надо его. Поэтому странности прототипа сохранены как есть —
// например, распознанное сверяется ПОЗИЦИОННО («um be was been» — ноль из
// трёх): так оно работает у студентов прототипа, и так же должно у нас.

export const LEVELS = ['A1', 'A2', 'B1']
export const MODES = ['repeat', 'gap', 'write', 'sentence', 'fix']
export const PATTERNS = ['AAA', 'ABB', 'ABA', 'ABC', 'AAB']

/** Устные режимы: слушать и говорить. Остальные — письменные. */
export function isSpoken(mode) {
  return mode === 'repeat' || mode === 'gap'
}

/** Письменные режимы с предложением: там уровень режет задания, а не глаголы. */
export function isContextual(mode) {
  return mode === 'sentence' || mode === 'fix'
}

/** Схема написания трёх форм. У get она задана руками: V3 там «got / gotten». */
export function pattern(v) {
  if (v.pattern) return v.pattern
  if (v.v1 === v.v2 && v.v2 === v.v3) return 'AAA'
  if (v.v2 === v.v3) return 'ABB'
  if (v.v1 === v.v3) return 'ABA'
  if (v.v1 === v.v2) return 'AAB'
  return 'ABC'
}

export function formsOf(v) {
  return [v.v1, v.v2, v.v3]
}

/** Формы для ритма: из вариантов через « / » звучит первый. */
export function rhythmForms(v) {
  return [v.v1, v.v2.split(' / ')[0], v.v3.split(' / ')[0]]
}

/**
 * Ключ записи формы. У read написание одно, а звучание разное (reed/red),
 * поэтому записей две и адресуются они не формой, а ролью.
 */
export function clipKey(v, i) {
  if (v.v1 === 'read') return i === 0 ? 'read-base' : 'read-past'
  return rhythmForms(v)[i]
}

/**
 * Записи для таблицы: форма звучит ЦЕЛИКОМ, со всеми вариантами — в
 * прототипе синтез читал «was, were» и «got, gotten». Записи were и gotten
 * лежат в наборе именно для этого.
 */
export function formClips(v, i) {
  if (v.v1 === 'read') return [clipKey(v, i)]
  return formsOf(v)[i].split(/\s*\/\s*/)
}

function has(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key) && !!obj[key]
}

/**
 * Фильтр таблицы. Строку поиска прототип опускал в нижний регистр на вводе;
 * здесь это делает сама функция, чтобы вызывающему не помнить.
 */
export function visibleVerbs(verbs, { level = 'all', pattern: pat = 'all', group = 'all', onlySaved = false, query = '' } = {}, saved = {}) {
  const q = String(query || '').toLowerCase().trim()
  return verbs.filter(
    (v) =>
      (level === 'all' || v.lvl === level) &&
      (pat === 'all' || pattern(v) === pat) &&
      (group === 'all' || v.group === group) &&
      (!onlySaved || has(saved, v.v1)) &&
      (!q || (formsOf(v).join(' ') + ' ' + v.ru + ' ' + v.kk).toLowerCase().indexOf(q) >= 0),
  )
}

/**
 * Глаголы набора практики. Уровень режет глаголы только в устных режимах и
 * «напиши формы»: у предложений уровень свой, и режет их buildQueue.
 */
export function selectedVerbs(verbs, { mode, set = 'all', saved = {}, level = 'all' }) {
  const contextual = isContextual(mode)
  return verbs.filter(
    (v) =>
      (set === 'all' || (set === 'saved' && has(saved, v.v1)) || v.group === set) &&
      (contextual || level === 'all' || v.lvl === level),
  )
}

/** Фишер–Йетс, как в прототипе; генератор можно подменить в тесте. */
export function shuffled(list, rng = Math.random) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

/**
 * Очередь сессии — rebuildQueue прототипа. `available` — всё, что подходит
 * под выбор (из него собираются «трудные»), `queue` — то, что пойдёт сейчас.
 * У заданий с предложением форма обязана быть в пределах выбранных: при
 * «двух формах» предложений на V3 нет.
 */
export function buildQueue({ verbs, sentences = [], fixes = [] }, { mode, set = 'all', saved = {}, level = 'all', formCount = 3, limit = 0, shuffle = false, rng } = {}) {
  const ids = selectedVerbs(verbs, { mode, set, saved, level }).map((v) => v.v1)
  let items
  if (isContextual(mode)) {
    items = (mode === 'sentence' ? sentences : fixes).filter(
      (it) => ids.indexOf(it.verb) >= 0 && (level === 'all' || it.lvl === level) && it.form < formCount,
    )
  } else {
    items = ids.map((id) => ({ id, verb: id }))
  }
  const available = items.slice()
  if (shuffle) items = shuffled(items, rng)
  return { available, queue: limit ? items.slice(0, limit) : items }
}

/**
 * Какую форму прячет «пропуск»: при двух формах всегда V2, при трёх — V2 и
 * V3 по очереди. В прототипе это пересчитывалось в nextItem; здесь функция
 * номера задания, поэтому переход по списку не сбивает чередование.
 */
export function gapFor(idx, formCount) {
  return formCount === 2 ? 1 : (idx % 2) + 1
}

export function targetForms(v, formCount) {
  return v ? rhythmForms(v).slice(0, formCount) : []
}

/** Что должен сказать студент: все формы ритма или одну пропущенную. */
export function expectedForms(v, { mode, formCount, gap }) {
  const forms = targetForms(v, formCount)
  return mode === 'gap' ? [forms[gap]] : forms
}

/**
 * Ключ результата. Совпадает с прототипным, чтобы прогресс одного режима на
 * «двух формах» не засчитывался «трём» и наоборот.
 */
export function progressKey(mode, formCount, level) {
  return `practice-v4-${mode}-${formCount}-${level}`
}

/** Слова расшифровки: только латиница и апостроф, остальное — пробел. */
export function tokens(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Счёт распознанного — scoreTargets прототипа. Сверка позиционная: i-е слово
 * расшифровки против i-й формы. Созвучия (buy ~ by, knew ~ new) засчитываются:
 * распознаватель пишет то, что чаще встречается, и студент тут не виноват.
 * were за was — всегда, gotten за got — только там, где это V3.
 */
export function scoreTargets(expected, text, { mode, gap, aliases = {} } = {}) {
  const ts = tokens(text)
  const results = []
  let hits = 0
  expected.forEach((f, i) => {
    const word = ts[i] || ''
    const alt = Object.prototype.hasOwnProperty.call(aliases, f) ? aliases[f] : []
    const ok =
      word === f ||
      alt.indexOf(word) >= 0 ||
      (f === 'was' && word === 'were') ||
      (f === 'got' && word === 'gotten' && (mode === 'gap' ? gap === 2 : i === 2))
    results.push({ form: f, heard: ok })
    if (ok) hits++
  })
  return { hits, total: expected.length, results }
}

/** Ответ к сравнению: регистр, пробелы вокруг «/» и финальный знак не важны. */
export function normalizeAnswer(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/\s*\/\s*/g, '/')
    .replace(/[.!?]$/, '')
}

export function answerOptions(v, index) {
  return formsOf(v)[index].split(/\s*\/\s*/).map(normalizeAnswer)
}

/** Годится любой вариант формы или все варианты через «/» в исходном порядке. */
export function checkForm(value, v, index) {
  const val = normalizeAnswer(value)
  const variants = answerOptions(v, index)
  return variants.indexOf(val) >= 0 || val === variants.join('/')
}

/**
 * Поля письменного задания. Метка второго вида — ключ перевода (в прототипе
 * тут сразу стояла строка t('yourAnswer')); переводит её экран.
 */
export function writtenFields(mode, item, v, formCount) {
  if (mode === 'write') {
    return [
      { form: 1, label: 'V2', answer: v.v2 },
      { form: 2, label: 'V3', answer: v.v3 },
    ].slice(0, formCount - 1)
  }
  return [{ form: item.form, label: 'yourAnswer', answer: mode === 'fix' ? item.answer : formsOf(v)[item.form] }]
}

/** Номер первого пустого поля или -1. Пустой ответ не проверяем — просим написать. */
export function firstEmpty(values) {
  return values.findIndex((x) => !String(x || '').trim())
}

/**
 * Проверка письменного ответа — checkWritten прототипа. «Показать ответ»
 * (reveal) не засчитывает ни одного поля: это самопроверка, не попадание.
 */
export function checkWritten(fields, values, { mode, item, v, reveal = false }) {
  const results = fields.map((f, i) => {
    const value = String(values[i] || '').trim()
    const heard =
      !reveal &&
      (mode === 'fix' ? normalizeAnswer(value) === normalizeAnswer(item.answer) : checkForm(value, v, f.form))
    return { form: f.answer, heard, value }
  })
  return { hits: results.filter((r) => r.heard).length, total: results.length, results }
}

/** Запись результата задания — persistResult прототипа, без побочных эффектов. */
export function nextEntry(prev, result) {
  const next = { ...(prev || {}) }
  next.done = true
  next.kind = result.kind
  next.attempts = (next.attempts || 0) + 1
  if (result.score) {
    next.hits = result.score.hits
    next.total = result.score.total
    next.best = Math.max(next.best || 0, result.score.hits)
  }
  return next
}

/** Итог сессии: сколько заданий закрыто и сколько форм попало. */
export function summarize(queue, scores = {}) {
  let done = 0
  let hits = 0
  let total = 0
  for (const it of queue) {
    const sc = scores[it.id]
    if (sc && sc.done) done++
    if (sc && sc.hits !== undefined) {
      hits += sc.hits
      total += sc.total
    }
  }
  return { done, count: queue.length, hits, total }
}

/**
 * «Трудные»: не пройденные вовсе, пройденные самопроверкой (её нельзя
 * считать попаданием) и пройденные не на все формы.
 */
export function trickyItems(available, scores = {}) {
  return available.filter((it) => {
    const sc = scores[it.id]
    return !sc || sc.kind === 'manual' || (sc.hits !== undefined && sc.hits < sc.total)
  })
}

/** Метка задания в списке прогресса: «2/3», «✓» за самопроверку или «—». */
export function scoreMark(sc) {
  if (!sc) return '—'
  return sc.hits !== undefined ? `${sc.hits}/${sc.total}` : '✓'
}

/** Подсказка под плитками ритма: варианты, которые тоже засчитываются. */
export function variantsNote(v, { mode, formCount }) {
  if (!v || mode !== 'repeat') return ''
  if (v.v1 === 'be') return 'V2 = was / were'
  if (formCount === 3 && v.v1 === 'get') return 'V3 = got / gotten'
  return ''
}

/**
 * Слово под пальцем для офлайн-словаря — cleanWord прототипа плюс срез
 * пунктуации по краям: в предложениях слово стоит с точкой и запятой.
 */
export function cleanWord(s) {
  const w = String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/^[^a-z]+|[^a-z]+$/g, '')
  return /^[a-z]+(?:['-][a-z]+)*$/.test(w) && w.length <= 40 ? w : ''
}

/** Статья офлайн-словаря: { lemma, ru, kk } или null. */
export function lookupWord(word, dict) {
  const w = cleanWord(word)
  if (!w || !dict) return null
  return Object.prototype.hasOwnProperty.call(dict, w) ? dict[w] : null
}
