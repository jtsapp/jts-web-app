// Движок воркбука — порт из data/jtsworkbook-<level>.html (ENGINE v3).
//
// Уровни A0…B2 — пять отдельных прототипов, а не один с разными данными:
// у A1 появилась трансформация плитками, у B1 — набранная трансформация и
// словообразование, у B2 — правило, цепочка, поиск ошибок в абзаце, сплошной
// текст с банком и зачётная викторина. Общая арифметика (перемешивание,
// порядки, счёт мест) живёт здесь; судья набранного ответа у каждого уровня
// свой и лежит в match.js.
//
// НЕ «чистить»: shuffle — это LCG прототипа (9301/49297/233280), а сиды
// собираются из индексов и длин строк. Любая косметика здесь меняет порядок
// вариантов и слов, а он сверяется с оракулом (__fixtures__/oracle-a0.json),
// который считает САМ прототип. Дрейф = красный engine.test.js и разъехавшиеся
// с исходником уроки у студента.

import { matcherFor } from './match.js'

/* ── Перемешивание ─────────────────────────────────────────────────────── */
/* Порядок зависит только от длины массива и сида, поэтому перемешать индексы
   и перемешать сами элементы — одна и та же перестановка. */
export function shuffle(a, seed) {
  let r = seed || 7
  const x = a.slice()
  for (let i = x.length - 1; i > 0; i--) {
    r = (r * 9301 + 49297) % 233280
    const j = Math.floor((r / 233280) * (i + 1))
    const tmp = x[i]
    x[i] = x[j]
    x[j] = tmp
  }
  return x
}

const indexes = (n) => Array.from({ length: n }, (_, k) => k)

/* Числовую лесенку (1 · 2 · 3) не перемешиваем: перебор вариантов там
   становится подсказкой сам по себе. */
export function numericLadder(o) {
  const v = o.map((x) => parseFloat(String(x).replace(/[^0-9.]/g, '')))
  if (v.some(isNaN)) return false
  for (let i = 1; i < v.length; i++) if (v[i] <= v[i - 1]) return false
  return true
}

export function optOrder(a, it, i) {
  if (a.nosh || numericLadder(it.o)) return it.o.map((_, k) => k)
  return shuffle(
    it.o.map((_, k) => k),
    (a.seed || 5) * 31 + i * 17 + it.o.length * 7 + String(it.q || it.s || '').length
  )
}


/* ── Производные порядки по типам заданий ──────────────────────────────── */
/* Сиды-умолчания (3/11/23/19/17/13/37/9/5) — из прототипа. Менять нельзя:
   у каждого задания без своего seed порядок держится именно на них. */

/** Слова в банке для bank/match/table/chat. */
export function bankWords(a) {
  switch (a.t) {
    case 'bank':
      return shuffle(a.bank || a.items.map((x) => x.a), a.seed || 3)
    case 'match':
      return shuffle(a.items.map((x) => x.r), a.seed || 11)
    case 'table':
      return shuffle(tableAnswers(a), a.seed || 23)
    case 'chat':
      return shuffle(a.bank, a.seed || 19)
    default:
      return []
  }
}

/** Ключи из ячеек таблицы: пропуск помечен префиксом «___|». */
export function tableAnswers(a) {
  const out = []
  a.rows.forEach((row) =>
    row.forEach((cell) => {
      if (String(cell).indexOf('___|') === 0) out.push(String(cell).slice(4))
    })
  )
  return out
}

/** Ячейки таблицы как {text} или {gap:ответ} — чтобы плеер не парсил разметку. */
export function tableCells(a) {
  return a.rows.map((row) =>
    row.map((cell) => {
      const s = String(cell)
      return s.indexOf('___|') === 0 ? { gap: s.slice(4) } : { text: s }
    })
  )
}

/** Плитки для сборки предложения — свой порядок у каждого пункта. */
export function orderTiles(a, i) {
  return shuffle(a.items[i].w, (i + 1) * 13 + (a.seed || 5))
}

/* У трансформации (trans) лоток свой: сид по умолчанию 31, а не 5, и номер
   пункта входит слагаемым, а не множителем. Это ДРУГАЯ формула, чем у order, —
   свести их к одной значит перетасовать слова во всех заданиях A1–B2. */
export function transTiles(a, i) {
  return shuffle(
    a.items[i].w.map((_, k) => k),
    (a.seed || 31) + i * 13
  ).map((k) => a.items[i].w[k])
}

/** Банк слов сплошного текста (cloze): в нём есть лишние слова-ловушки. */
export function clozeBank(a) {
  return shuffle(a.bank, a.seed || 3)
}

/** Порядок чипов в лотке sort (индексы items). */
export function sortOrder(a) {
  return shuffle(indexes(a.items.length), a.seed || 17)
}

/** Порядок строк seq (индексы items); верный ответ — по возрастанию индекса. */
export function seqOrder(a) {
  return shuffle(indexes(a.items.length), a.seed || 13)
}

/** Порядок колоды memo — перестановка индексов карточек (по две на пару). */
export function memoOrder(a) {
  return shuffle(indexes(a.pairs.length * 2), a.seed || 37)
}

/** Колода memo: [{pair, side}] в порядке прототипа. Чётная карточка — слово,
    нечётная — перевод, поэтому пара восстанавливается делением индекса. */
export function memoDeck(a) {
  return memoOrder(a).map((k) => ({ pair: k >> 1, side: k % 2 ? 'meaning' : 'word' }))
}

/* Строка drop — это текст со вставками [a|b|c], где верный вариант всегда
   нулевой. Режем один раз и отдаём плееру готовые куски: индекс части (pi)
   участвует в сиде, поэтому считать его на лету в рендере опасно. */
export function dropLines(a) {
  return a.lines.map((ln, li) => {
    const parts = []
    String(ln)
      .split(/(\[[^\]]*\])/)
      .forEach((part, pi) => {
        if (part.charAt(0) === '[') {
          const opts = part.slice(1, -1).split('|')
          parts.push({
            pick: true,
            li,
            pi,
            opts,
            order: shuffle(indexes(opts.length), (a.seed || 9) + li * 13 + pi * 7 + part.length),
          })
        } else if (part) {
          parts.push({ pick: false, text: part })
        }
      })
    return parts
  })
}

/** Плоский список выборов drop — в том же порядке, что и у прототипа. */
export function dropPicks(a) {
  return dropLines(a).flatMap((parts) => parts.filter((p) => p.pick))
}

/* ── Судейство ─────────────────────────────────────────────────────────── */
/**
 * Набранный ответ: ключ плюс alt, сверка судьёй УРОВНЯ. Уровень обязателен по
 * смыслу: один и тот же ввод «I have not seen him» верен на B1 и неверен на
 * A0, потому что прототипы судят по-разному (см. match.js).
 */
export function typeOk(it, input, level) {
  return matcherFor(level)(input, [it.a].concat(it.alt || []))
}

/** Собранное предложение сверяется строкой целиком, как в прототипе. */
export function orderOk(it, tiles) {
  return tiles.join(' ') === it.a
}

/* ── Таблицы представления ─────────────────────────────────────────────── */
/* Стадия задания — «маршрут» урока: слова → язык → чтение → аудио → речь. */
export const STAGE = {
  match: 'words', memo: 'words', sort: 'words', odd: 'words', label: 'words', type: 'words',
  wform: 'words',
  bank: 'lang', order: 'lang', fix: 'lang', table: 'lang', choose: 'lang', tf: 'lang',
  drop: 'lang', seq: 'lang', trans: 'lang', ttrans: 'lang', chain: 'lang', worked: 'lang',
  rule: 'lang', cloze: 'lang', epara: 'lang',
  read: 'read', model: 'read', listen: 'listen', video: 'listen',
  respond: 'real', chat: 'real', write: 'turn', speak: 'turn', quiz: 'quiz',
}
// Викторина и видео у B2 в прототипе проваливались в «разбор языка» — в его
// таблице их просто нет. У нас они свои: иначе зачёт уходит в грамматику, а
// видео не попадает в аудирование, и рейтинг навыков врёт.
export const STAGE_ICON = {
  words: '🔤', lang: '🧩', read: '📖', listen: '🎧', real: '💬', turn: '✍️',
  quiz: '🎓', back: '🔁',
}
export const ICON = {
  listen: '🎧', read: '📖', respond: '💬', chat: '🗨', memo: '🃏', write: '✍️', speak: '🗣️',
  table: '🧩', sort: '🗂', order: '🔤', fix: '🔍', match: '🔗', bank: '✏️', choose: '✅',
  tf: '⚖️', odd: '🎯', label: '🖼', type: '⌨️', seq: '🔢', drop: '▾',
  trans: '🔄', ttrans: '📝', wform: '🧱', worked: '🪜', model: '📄', rule: '📐',
  chain: '⛓', epara: '🔎', cloze: '📃', quiz: '🎓', video: '🎬',
}

export function stageOf(a) {
  return a.st || STAGE[a.t] || 'lang'
}

/* Какой навык качает экран: стадия урока ложится на шкалы рейтинга сайта
   (src/practice/skillStatsCore.js). Слова — vocab, разбор языка — grammar,
   тексты — reading, аудио — listening, реплики — speaking, письмо — writing. */
export const STAGE_SKILL = {
  words: 'vocab', lang: 'grammar', read: 'reading',
  listen: 'listening', real: 'speaking', turn: 'writing', quiz: 'grammar',
}

export function skillOf(a) {
  return STAGE_SKILL[stageOf(a)] || 'grammar'
}

/** Тип, который реально судится: у listen/read это вложенное задание. */
export function taskOf(a) {
  return a.task || a
}

/* Свободные экраны не считаются: у них нет ключа, только образец ответа. */
export const FREE_TYPES = ['write', 'speak']
export function isFree(a) {
  return FREE_TYPES.includes(a.t)
}

/* ── Разбор ошибок ─────────────────────────────────────────────────────── */
/* Типы, которые можно показать «одними промахами». Остальные (sort, seq,
   memo, table, chat, drop) устроены как целое поле и в подмножество не режутся —
   их в разборе проходят заново целиком. Порт SUBSETTABLE (:6471).
   Список СВОЙ у каждого уровня и приезжает в meta.json: B1/B2 режут trans и
   ttrans, но не режут order/label, а A0–A2 наоборот. Здесь — только запасной
   вариант на случай старого meta без поля. */
export const SUBSETTABLE = ['type', 'choose', 'tf', 'odd', 'label', 'respond', 'bank', 'match', 'order', 'fix']

/**
 * Задание, суженное до промахнутых пунктов. Порт subsetAct (:6472): если
 * сузить нельзя или сужать нечего — возвращаем исходное задание, чтобы разбор
 * никогда не показал пустой экран.
 */
export function subsetAct(a, idxs, subsettable) {
  const list = subsettable && subsettable.length ? subsettable : SUBSETTABLE
  if (!list.includes(a.t) || !a.items) return a
  const items = (idxs || []).filter((i) => a.items[i]).map((i) => a.items[i])
  if (!items.length) return a
  const out = { ...a, items }
  // Банк слов пересобирается под оставшиеся пункты: иначе в разборе на два
  // пропуска приходится восемь слов, и это уже другое задание.
  if (out.bank) out.bank = items.map((x) => x.a)
  return out
}

/* Сколько судимых мест на экране. В прототипе счётчик набегал вызовами
   L.add() прямо в рендере; здесь он считается заранее — реакту нужен размер
   до первой отрисовки, а порядок пунктов от этого не зависит. */
export function gapsIn(s) {
  return String(s).split('___').length - 1
}

export function slotCount(a) {
  const task = taskOf(a)
  switch (task.t) {
    case 'choose':
    case 'odd':
    case 'label':
    case 'respond':
    case 'tf':
    case 'match':
    case 'order':
    case 'fix':
    case 'sort':
    case 'seq':
    case 'type':
    case 'trans':
    case 'ttrans':
    case 'wform':
    case 'quiz':
      return (task.items || []).length
    case 'bank':
      return (task.items || []).reduce((n, it) => n + gapsIn(it.s), 0)
    case 'chat':
      return (task.lines || []).reduce((n, ln) => n + gapsIn(ln.s), 0)
    case 'table':
      return tableAnswers(task).length
    case 'memo':
      return (task.pairs || []).length
    case 'drop':
      return dropPicks(task).length
    // У цепочки судится каждый шаг, а не пункт: два переписывания одного
    // предложения — это два места, иначе экран закрывается на половине.
    case 'chain':
      return (task.items || []).reduce((n, it) => n + (it.steps || []).length, 0)
    // В абзаце с ошибками мест ровно столько, сколько ошибок: слово «верное»
    // тапать можно сколько угодно, это промах, а не место.
    case 'epara':
      return (task.bad || []).length
    case 'cloze':
      return (task.gaps || []).length
    default:
      return 0
  }
}
