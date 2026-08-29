// Судья набранного ответа. У КАЖДОГО уровня он свой, и это не косметика:
// прототипы A0…B2 писались один за другим, и каждый следующий прощал больше
// предыдущего. Сводить их к «одному хорошему» нельзя — тогда часть ответов на
// A0 начнёт засчитываться там, где автор курса ждал точного слова, а на B1
// правильный ответ в полной форме («I have not seen him» против ключа
// «I haven't seen him») останется красным.
//
// Порт nrm/loose/typedOk/answerMatches из data/jtsworkbook-<level>.html.
// Все вердикты сверяются с оракулом (__fixtures__/oracle-<level>.json), который
// считает САМ прототип: правка здесь без правки прототипа = красный тест.
//
// Общее правило всех уровней: снисходительно к НАБОРУ (регистр, пробелы,
// кавычки, точка в конце), строго к слову — реально неверный ответ верным
// не становится.

/* ── Нормализация: у каждого уровня своя ────────────────────────────────── */

/** A0: кавычки, знаки препинания, дефис-или-пробел. */
function nrmA0(s) {
  return String(s)
    .toLowerCase()
    .replace(/[‘’ʼ´`]/g, "'")
    .replace(/[“”«»"]/g, '')
    .replace(/[.,!?;:…£€₸$]/g, '')
    .replace(/[‐-―_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** A1: только кавычки и знаки конца — дефисы разбирает второй проход. */
function nrmA1(s) {
  return String(s)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[.,!?;:…£€₸$]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** A2: сюда добавились скобки, а дефис приводится к одному виду, а не к пробелу. */
function nrmA2(s) {
  return String(s)
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”«»"]/g, '')
    .replace(/[‐-―]/g, '-')
    .replace(/[.,!?;:…£€₸$()[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** B1: двойные кавычки остаются — на этом уровне встречается прямая речь. */
function nrmB1(s) {
  return String(s)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[.,!?;:…£€₸$]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** B2: то же, что B1, плюс дефис-или-пробел. */
function nrmB2(s) {
  return String(s)
    .toLowerCase()
    .replace(/[‘’ʼ´`]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[.,!?;:…£€₸$]/g, '')
    .replace(/[‐-―_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const NRM = { a0: nrmA0, a1: nrmA1, a2: nrmA2, b1: nrmB1, b2: nrmB2 }

/** Нормализатор уровня; неизвестный уровень читается как A0 (самый строгий). */
export function nrmFor(level) {
  return NRM[level] || nrmA0
}

/* ── A1: второй, снисходительный проход ─────────────────────────────────── */
/* Он приравнивает только два написания ОДНОГО слова: потерянный апостроф с
   телефонной клавиатуры, дефис вместо пробела, британская форма там, где ключ
   американский. Неверный ответ верным не делает. */
function looseA1(s) {
  return nrmA1(s)
    .replace(/'/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\b(cent|met|lit|theat|fib)re(s?)\b/g, '$1er$2')
    .replace(/\bcolour/g, 'color')
    .replace(/\bfavourite/g, 'favorite')
    .replace(/\bneighbour/g, 'neighbor')
    .replace(/\bgrey\b/g, 'gray')
    .replace(/\bpractise\b/g, 'practice')
    .replace(/ll(ing|ed|er)\b/g, 'l$1')
    .replace(/ise\b/g, 'ize')
    .replace(/isation\b/g, 'ization')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ── A2: список пар вместо правила ──────────────────────────────────────── */
/* Именно список: правило вида «-our → -or» рано или поздно склеит два разных
   слова, а перечисление не может. */
const USVAR = {
  colour: 'color', colours: 'colors', favourite: 'favorite', favourites: 'favorites',
  neighbour: 'neighbor', neighbours: 'neighbors', behaviour: 'behavior', flavour: 'flavor',
  flavours: 'flavors', harbour: 'harbor', humour: 'humor', labour: 'labor', odour: 'odor',
  rumour: 'rumor', centre: 'center', centres: 'centers', theatre: 'theater',
  theatres: 'theaters', litre: 'liter', litres: 'liters', metre: 'meter', metres: 'meters',
  fibre: 'fiber', organise: 'organize', organised: 'organized', organising: 'organizing',
  organisation: 'organization', realise: 'realize', realised: 'realized', realising: 'realizing',
  recognise: 'recognize', recognised: 'recognized', apologise: 'apologize',
  apologised: 'apologized', memorise: 'memorize', memorised: 'memorized',
  specialise: 'specialize', specialised: 'specialized', practise: 'practice',
  practising: 'practicing', practised: 'practiced', travelling: 'traveling',
  travelled: 'traveled', traveller: 'traveler', cancelled: 'canceled',
  cancelling: 'canceling', modelling: 'modeling', grey: 'gray', programme: 'program',
  programmes: 'programs', jewellery: 'jewelry', pyjamas: 'pajamas', aeroplane: 'airplane',
  defence: 'defense', offence: 'offense', tyre: 'tire', tyres: 'tires', storey: 'story',
  moustache: 'mustache', dialogue: 'dialog', catalogue: 'catalog', analyse: 'analyze',
  analysed: 'analyzed',
}

/* Потерянный апостроф прощается — кроме случаев, где без него получается
   другое настоящее слово (we're/were, we'll/well, I'll/ill …). */
const APOS_KEEP = {
  were: 1, well: 1, ill: 1, hell: 1, shell: 1, shed: 1, wed: 1, hed: 1, id: 1, its: 1,
  whos: 1, weve: 1,
}

function nrmVarA2(s) {
  return nrmA2(s)
    .split(' ')
    .map((x) => USVAR[x] || x)
    .join(' ')
}

function nrmLooseA2(s) {
  return nrmVarA2(s).replace(/'/g, '').replace(/\s+/g, ' ').trim()
}

function typedOkA2(given, keys) {
  const g = nrmA2(given)
  if (!g) return false
  const gv = nrmVarA2(given)
  const gl = nrmLooseA2(given)
  return keys.some((key) => {
    const k = String(key)
    if (nrmA2(k) === g) return true
    if (nrmVarA2(k) === gv) return true
    return nrmLooseA2(k) === gl && !APOS_KEEP[gl]
  })
}

/* ── B1/B2: раскрытие сокращений ────────────────────────────────────────── */
/* Ключ хранит ОДНУ форму, а студент пишет любую равнозначную: «I have not
   seen him» — это тот же ответ, что «I haven't seen him». Раскрываем в полный
   набор форм и ключ, и ввод, и сравниваем множества. */

const CONTRACTIONS_B1 = [
  ["won't", ['will not']], ["shan't", ['shall not']], ["can't", ['cannot', 'can not']],
  ['cannot', ["can't", 'can not']], ["let's", ['let us']],
  ["'ve", [' have']], ["'ll", [' will']], ["'re", [' are']], ["'m", [' am']],
]

/* «he's» — это «he is» ИЛИ «he has», «I'd» — «I would» ИЛИ «I had», и
   различает их только следующее слово. Раскрывать оба чтения вслепую значит
   принять «he is got a car» за ключ «he's got a car» — настоящую ошибку
   грамматики. Поэтому причастие тянет has/had, всё остальное — is/would. */
const PARTICIPLE =
  /^(been|got|gotten|gone|done|had|seen|made|taken|come|become|written|spoken|given|known|found|left|put|read|said|told|thought|brought|bought|caught|taught|felt|kept|met|paid|sent|built|heard|held|lost|meant|run|sat|slept|spent|stood|understood|won|worn|broken|chosen|driven|eaten|fallen|forgotten|risen|shown|stolen|begun|drunk|sung|swum|flown|grown|thrown|blown|hidden|ridden|beaten|bitten|frozen|lain|laid|led|sold|shut|set|cost|cut|hit|let|quit|spread|\w+ed)$/

function expandAmbiguousB1(cur) {
  const out = []
  ;[["'s", ' has', ' is'], ["'d", ' had', ' would']].forEach(([mark, withPart, otherwise]) => {
    if (cur.indexOf(mark) < 0) return
    // n't разбирается отдельно: через «'s» нельзя трогать «doesn't».
    const re = new RegExp('(\\w)' + mark + '(\\s+)(\\S+)', 'g')
    let hit = false
    const v = cur.replace(re, (m, pre, sp, next) => {
      hit = true
      return pre + (PARTICIPLE.test(next) ? withPart : otherwise) + sp + next
    })
    if (hit) out.push(v)
    // Сокращение в самом конце строки оставляем как есть.
  })
  return out
}

/** n't, но без «ca not» / «wo not». */
function expandNtB1(cur) {
  if (cur.indexOf("n't") < 0) return []
  const v = cur.replace(/(\w+)n't\b/g, (m, stem) => {
    if (stem === 'ca') return 'cannot'
    if (stem === 'wo') return 'will not'
    if (stem === 'sha') return 'shall not'
    return stem + ' not'
  })
  return v === cur ? [] : [v]
}

const CONTRACTIONS_B2 = [
  ["can't", ['cannot', 'ca not']], ['cannot', ["can't", 'can not']],
  ["won't", ['will not']], ["shan't", ['shall not']], ["let's", ['let us']],
  ["n't", [' not']], ["'ve", [' have']], ["'ll", [' will']], ["'re", [' are']],
  ["'m", [' am']], ["'s", [' is', ' has']], ["'d", [' would', ' had']],
]

/* Обход в ширину со сторожем на число шагов — ровно как в прототипе:
   раскрытия комбинируются, и без сторожа длинная реплика уходит в перебор. */
function expandForms(s, list, ambiguous, guardMax) {
  const seen = Object.create(null)
  const queue = [s]
  const out = []
  let guard = 0
  while (queue.length && guard++ < guardMax) {
    const cur = queue.shift()
    if (seen['#' + cur]) continue
    seen['#' + cur] = 1
    out.push(cur)
    for (const [from, reps] of list) {
      if (cur.indexOf(from) < 0) continue
      for (const rep of reps) queue.push(cur.split(from).join(rep))
    }
    if (ambiguous) {
      expandNtB1(cur).forEach((v) => queue.push(v))
      expandAmbiguousB1(cur).forEach((v) => queue.push(v))
    }
  }
  return out
}

/** Ключи ответа: все формы, сведённые к одному написанию -ise/-ize и -our/-or. */
function ansKeys(s, nrm, list, ambiguous, guardMax) {
  const set = Object.create(null)
  expandForms(nrm(s), list, ambiguous, guardMax).forEach((v) => {
    const k = v
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/is(e|es|ed|ing|ation|ations)\b/g, 'iz$1')
      .replace(/\bpractic(e|es|ed|ing)\b/g, 'practis$1')
      .replace(/\bbehaviour\b/g, 'behavior')
      .replace(/\bneighbour/g, 'neighbor')
      .replace(/\bfavour/g, 'favor')
      .replace(/\bcolour/g, 'color')
    set['#' + k] = 1
  })
  return set
}

function answerMatchesWith(nrm, list, ambiguous, guardMax) {
  return (input, keys) => {
    if (!nrm(input)) return false
    const got = ansKeys(input, nrm, list, ambiguous, guardMax)
    return keys.some((key) => {
      const want = ansKeys(key, nrm, list, ambiguous, guardMax)
      return Object.keys(got).some((g) => want[g])
    })
  }
}

/* ── Судья уровня ───────────────────────────────────────────────────────── */

const MATCH = {
  a0: (input, keys) => {
    const v = nrmA0(input)
    return !!v && keys.some((k) => nrmA0(k) === v)
  },
  a1: (input, keys) => {
    const v = nrmA1(input)
    if (!v) return false
    const vl = looseA1(input)
    return keys.some((k) => nrmA1(k) === v || looseA1(k) === vl)
  },
  a2: typedOkA2,
  b1: answerMatchesWith(nrmB1, CONTRACTIONS_B1, true, 160),
  b2: answerMatchesWith(nrmB2, CONTRACTIONS_B2, false, 120),
}

/**
 * Судья уровня: (ввод, [ключ, …альтернативы]) → верно ли.
 * Неизвестный уровень судится по A0 — строже, чем нужно, но никогда мягче.
 */
export function matcherFor(level) {
  return MATCH[level] || MATCH.a0
}
