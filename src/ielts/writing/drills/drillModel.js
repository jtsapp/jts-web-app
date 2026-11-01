// Короткие тренировки Writing («Short drills»): 3–10 минут на один приём письма, проверка на устройстве. Формат —
// документ банка IELTS `skill: writing, kind: drill` (backend docs/ielts/TEST_FORMAT.md §7, «Короткие тренировки»):
// методист заводит дрилл JSON-импортом в web-admin, код не правится. Пока в банке нет ни одного дрилла, раздел
// показывает пробные (sampleDrills.js) — тот же формат. Раунды совместимы с «Проверьте себя» прототипа
// (data/quick-practice.js: gap / weak, key — буква варианта), плюс choice / type / sort и html — чужая разметка в
// песочнице, и виды банка writing-dev-pack: order / match / spot / pick / free. Чистые функции: экран только рисует.
//
// Дрилл: { id, skill: 'writing', kind: 'drill', module: academic|general|both, category: task1|task2|both, title,
//   name?: {ru,kk,en}, intro?: {ru,kk,en}, minutes?, show? (размер сессии, 10), maxFree? (free за сессию, 2),
//   drillKey?, part?: T1|GT|T2, types?: 'all' | [тип], guide? (глава «Как писать»: t1ac.line, t2), aiCheck?,
//   asks?: { <вид раунда>: {ru,kk,en} }, sample?, rounds: [раунд] }
// Раунд: { kind, id? (<drillKey>-<nnn>), module?, ty? (тип задания), visual? (график: свой объект chart или
//   { ref: <id задания>, sub?, series?: [i] }), task? (id задания), ask?, text?, why? — ask и why строкой (упражнения
//   разбора, язык интерфейса) или {ru,kk,en} } — поля вида:
//   choice — options (2–6), key 'A'…: выбрать верный вариант (text — материал над вариантами, необязательно);
//   gap    — text с одним «___», options, key: вариант для пропуска;
//   weak   — две фразы (options), key — та, что звучит слабее (как в прототипе);
//   type   — text с одним «___», accept: допустимые ответы (регистр, лишние пробелы и точка в конце не важны), hint?;
//   sort   — bins: [{ key, label }], items: [{ text, bin }]: разложить фразы по корзинам (формально / неформально);
//   order  — items: строки в верном порядке; ученик расставляет перемешанные;
//   match  — pairs: [[левое, правое], …]; ученик подбирает правое к левому;
//   spot   — tokens: слова фразы, wrong: индекс слова с ошибкой, accept: исправления;
//   pick   — visual (линии / столбцы), answer: [индексы x] — точки, которые обязательно упомянуть;
//   free   — 1–3 своих предложения: min / max слов, starts?: [начало фразы], noDigits?, checklist: [{ru,en,kk}],
//            model?: образец; проверка — автопроверки длины / совпадения с заданием / цифр / начала, затем самопроверка;
//   html   — html: своя страница упражнения в iframe-песочнице; итог она шлёт сама:
//            parent.postMessage({ jtsDrill: 'result', score, total }, '*'). Без сообщения ученик жмёт «Готово», и раунд
//            в счёт не идёт.

export const ROUND_KINDS = ['choice', 'gap', 'weak', 'type', 'sort', 'html', 'order', 'match', 'spot', 'pick', 'free']
const CHOICE_KINDS = new Set(['choice', 'gap', 'weak'])
export const LETTERS = 'ABCDEF'
export const GAP = '___'
// Порядок сессии — от узнавания к воспроизведению (KORDER прототипа): вариант → пары / корзины → точки → вписать /
// порядок → найти ошибку → своё предложение. gap здесь — выбор в пропуске (узнавание), вписать — type.
export const KIND_ORDER = { choice: 0, gap: 0, weak: 0, match: 1, sort: 1, pick: 2, type: 3, order: 3, spot: 4, html: 5, free: 9 }
export const DEFAULT_SHOW = 10
export const DEFAULT_MAX_FREE = 2
export const PASS_PCT = 80
// Тип задания в фильтре: у дрилла должно быть столько раундов этого типа, иначе фильтр не применяется
export const MIN_TYPED = 4

const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x)
const countGaps = (s) => String(s || '').split(GAP).length - 1
const isText = (v) => (typeof v === 'string' ? !!v.trim() : isObj(v) && Object.values(v).some((x) => typeof x === 'string' && x.trim()))
const isIndex = (v) => Number.isInteger(v) && v >= 0

/** Текст на языке интерфейса: строка как есть, объект { ru, kk, en } — по языку, иначе русский или английский. */
export function pickLang(v, lang) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  return v[lang] || v.ru || v.en || ''
}

/** Визуал раунда: свой график (объект chart с type) или ссылка на график задания { ref, sub?, series? }. */
function visualProblem(v) {
  if (!isObj(v)) return 'объект графика или { ref }'
  if (v.ref != null) {
    if (typeof v.ref !== 'string' || !v.ref.trim()) return 'ref — id задания'
    if (v.sub != null && !isIndex(v.sub)) return 'sub — номер графика'
    if (v.series != null && !(Array.isArray(v.series) && v.series.length && v.series.every(isIndex))) return 'series — номера серий'
    return null
  }
  return typeof v.type === 'string' && v.type ? null : 'у своего графика нужен type'
}

/**
 * Ошибки формы дрилла — то же, что проверяет бэкенд при импорте (IeltsDocument.validateDrill). Пустой список —
 * дрилл можно показывать. Тест пробных дриллов держит их в форме, которую примет банк.
 */
export function validateDrill(doc) {
  const out = []
  if (!isObj(doc)) return ['дрилл — объект']
  if (!doc.id) out.push('/id: нужен id')
  if (doc.kind !== 'drill') out.push('/kind: drill')
  if (!['academic', 'general', 'both'].includes(doc.module)) out.push('/module: academic | general | both')
  if (!doc.title) out.push('/title: нужен заголовок')
  const rounds = doc.rounds
  if (!Array.isArray(rounds) || !rounds.length) return [...out, '/rounds: нужен хотя бы один раунд']
  const ids = new Set()
  rounds.forEach((r, i) => {
    const p = `/rounds/${i}`
    if (!isObj(r) || !ROUND_KINDS.includes(r.kind)) return out.push(`${p}/kind: ${ROUND_KINDS.join(' | ')}`)
    if (r.id != null) {
      if (typeof r.id !== 'string' || !r.id.trim()) out.push(`${p}/id: строка`)
      else if (ids.has(r.id)) out.push(`${p}/id: повторяется`)
      else ids.add(r.id)
    }
    if (r.module && !['academic', 'general', 'both'].includes(r.module)) out.push(`${p}/module: academic | general | both`)
    if (r.visual != null) {
      const v = visualProblem(r.visual)
      if (v) out.push(`${p}/visual: ${v}`)
    }
    if (CHOICE_KINDS.has(r.kind)) {
      const n = Array.isArray(r.options) ? r.options.length : 0
      if (n < 2 || n > LETTERS.length) out.push(`${p}/options: 2–${LETTERS.length} вариантов`)
      else if (new Set(r.options).size !== n) out.push(`${p}/options: варианты повторяются`)
      const k = LETTERS.indexOf(String(r.key || ''))
      if (k < 0 || k >= n) out.push(`${p}/key: буква варианта A–${LETTERS[Math.max(0, n - 1)]}`)
      if (r.kind === 'weak' && n !== 2) out.push(`${p}/options: у weak ровно две фразы`)
    }
    if ((r.kind === 'gap' || r.kind === 'type') && countGaps(r.text) !== 1) out.push(`${p}/text: ровно один пропуск ${GAP}`)
    if ((r.kind === 'type' || r.kind === 'spot') && !(Array.isArray(r.accept) && r.accept.some((a) => String(a).trim()))) out.push(`${p}/accept: нужен хотя бы один ответ`)
    if (r.kind === 'sort') {
      const bins = Array.isArray(r.bins) ? r.bins : []
      const keys = new Set(bins.map((b) => b?.key).filter(Boolean))
      if (bins.length < 2 || keys.size !== bins.length) out.push(`${p}/bins: две и больше корзин с разными key`)
      const items = Array.isArray(r.items) ? r.items : []
      if (items.length < 2) out.push(`${p}/items: две и больше фраз`)
      items.forEach((it, j) => {
        if (!it?.text || !keys.has(it.bin)) out.push(`${p}/items/${j}: text и bin одной из корзин`)
      })
    }
    if (r.kind === 'order') {
      const items = Array.isArray(r.items) ? r.items : []
      if (items.length < 2 || !items.every(isText)) out.push(`${p}/items: две и больше строк`)
      else if (new Set(items.map((x) => JSON.stringify(x))).size !== items.length) out.push(`${p}/items: строки повторяются`)
    }
    if (r.kind === 'match') {
      const pairs = Array.isArray(r.pairs) ? r.pairs : []
      if (pairs.length < 2) out.push(`${p}/pairs: две и больше пары`)
      pairs.forEach((pr, j) => {
        if (!Array.isArray(pr) || pr.length !== 2 || !isText(pr[0]) || !isText(pr[1])) out.push(`${p}/pairs/${j}: [левое, правое]`)
      })
      if (pairs.length >= 2 && new Set(pairs.map((pr) => JSON.stringify(pr?.[1]))).size !== pairs.length) out.push(`${p}/pairs: правые части повторяются`)
    }
    if (r.kind === 'spot') {
      const tokens = Array.isArray(r.tokens) ? r.tokens : []
      if (tokens.length < 2 || !tokens.every((x) => typeof x === 'string' && x.trim())) out.push(`${p}/tokens: два и больше слова`)
      else if (!isIndex(r.wrong) || r.wrong >= tokens.length) out.push(`${p}/wrong: индекс слова с ошибкой`)
    }
    if (r.kind === 'pick') {
      if (r.visual == null) out.push(`${p}/visual: нужен график`)
      const a = r.answer
      if (!(Array.isArray(a) && a.length && a.every(isIndex) && new Set(a).size === a.length)) out.push(`${p}/answer: номера точек x без повторов`)
    }
    if (r.kind === 'free') {
      const min = Number(r.min)
      const max = Number(r.max)
      if (!(Number.isInteger(min) && min > 0)) out.push(`${p}/min: число слов > 0`)
      if (!(Number.isInteger(max) && max >= min)) out.push(`${p}/max: число слов не меньше min`)
      if (!(Array.isArray(r.checklist) && r.checklist.length && r.checklist.every(isText))) out.push(`${p}/checklist: пункты самопроверки`)
      if (r.starts != null && !(Array.isArray(r.starts) && r.starts.every((s) => typeof s === 'string' && s.trim()))) out.push(`${p}/starts: строки`)
    }
    if (r.kind === 'html' && !String(r.html || '').trim()) out.push(`${p}/html: нужна разметка упражнения`)
    return null
  })
  return out
}

/** Раунды дрилла, которые видит ученик своего трека (у раунда про график — module: academic). */
export function roundsForTrack(doc, track) {
  return (doc?.rounds || []).filter((r) => !r.module || r.module === 'both' || r.module === track)
}

function shuffle(list, rng) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const isIdentity = (o) => o.every((v, i) => v === i)

/**
 * Состояние показа раунда: порядок вариантов / фраз / правых частей; у order — перемешивание, которое никогда не
 * совпадает с верным порядком (иначе «Проверить» без единого движения засчитывался бы).
 */
export function prepRound(round, rng = Math.random) {
  const idx = (n) => Array.from({ length: n }, (_, i) => i)
  if (CHOICE_KINDS.has(round.kind)) return shuffle(idx(round.options.length), rng)
  if (round.kind === 'sort') return shuffle(idx(round.items.length), rng)
  if (round.kind === 'match') return shuffle(idx(round.pairs.length), rng)
  if (round.kind === 'order') {
    const n = round.items.length
    let o = shuffle(idx(n), rng)
    // rng теста может раз за разом давать исходный порядок — тогда сдвиг на одну позицию
    for (let tries = 0; n > 1 && isIdentity(o) && tries < 8; tries++) o = shuffle(idx(n), rng)
    if (n > 1 && isIdentity(o)) o = [...o.slice(1), o[0]]
    return o
  }
  return null
}

/**
 * Раунды под тип задания (ТЗ §5.4): если дрилл запущен с ty и раундов этого типа не меньше MIN_TYPED — раунды этого
 * типа плюс ~25% раундов без типа (раунды другого типа не берутся); иначе фильтр не применяется. Возвращает и ty,
 * который реально применён (null — фильтр снят), чтобы бейдж типа не обещал того, чего нет.
 */
export function filterByType(pool, ty, rng = Math.random) {
  if (!ty) return { pool, ty: null }
  const strict = pool.filter((r) => r.ty === ty)
  if (strict.length < MIN_TYPED) return { pool, ty: null }
  return { pool: pool.filter((r) => r.ty === ty || (!r.ty && rng() < 0.25)), ty }
}

const byKind = (a, b) => (KIND_ORDER[a.round.kind] ?? 5) - (KIND_ORDER[b.round.kind] ?? 5)

/**
 * Сессия (ТЗ §5.3): show раундов (по умолчанию 10) случайно из раундов трека, не больше maxFree раундов free,
 * порядок по виду (KIND_ORDER, внутри вида — случайный). Элемент — { round, order, testId?, source? }.
 * opts: ty — тип задания (фильтр), rng — для тестов, all — взять все раунды (упражнения разбора, повторение).
 */
export function buildSession(doc, track, { ty = null, rng = Math.random, all = false } = {}) {
  const filtered = filterByType(roundsForTrack(doc, track), ty, rng)
  const show = all ? Infinity : Number(doc?.show) > 0 ? Number(doc.show) : DEFAULT_SHOW
  const maxFree = doc?.maxFree != null && Number(doc.maxFree) >= 0 ? Number(doc.maxFree) : DEFAULT_MAX_FREE
  const picked = []
  let free = 0
  for (const round of shuffle(filtered.pool, rng)) {
    if (picked.length >= show) break
    if (round.kind === 'free') {
      if (free >= maxFree) continue
      free++
    }
    picked.push({ round, order: prepRound(round, rng) })
  }
  return { items: picked.sort(byKind), ty: filtered.ty }
}

/** Один проход (прежнее имя): элементы сессии без фильтра по типу. */
export function buildPass(doc, track, rng = Math.random) {
  return buildSession(doc, track, { rng }).items
}

/**
 * Повтор ошибки в конце той же сессии: неверный ответ с первой попытки — раунд ещё раз в конец очереди (один раз).
 * free (самопроверка) и html без счёта не повторяются. Возвращает новую очередь.
 */
export function withRetry(queue, idx, result) {
  const item = queue[idx]
  if (!item || item.retry || result?.correct !== false || item.round.kind === 'free') return queue
  return [...queue, { ...item, retry: true, order: item.order ? item.order.slice() : null }]
}

/**
 * Итог сессии по первой попытке: процент верных среди засчитанных (повторы и раунды без счёта не входят), id раундов
 * с ошибкой и верных — для сервера (POST …/runs) и очереди «Повторить ошибки». free в очередь ошибок не идут.
 */
export function sessionSummary(queue, results) {
  const first = queue.map((item, i) => ({ item, res: results[i] })).filter((x) => !x.item.retry && x.res && x.res.correct != null)
  const score = first.filter((x) => x.res.correct).length
  const total = first.length
  const ids = (ok) => first.filter((x) => x.res.correct === ok && x.item.round.id && x.item.round.kind !== 'free').map((x) => x.item.round.id)
  const pct = total ? Math.round((score / total) * 100) : 0
  return { score, total, pct, passed: total > 0 && pct >= PASS_PCT, wrong: ids(false), right: ids(true) }
}

/** Ответ для сверки с accept: регистр, пробелы, кавычки-ёлочки и точка в конце не важны. */
export function normalizeTyped(s) {
  return String(s || '')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?,;:]+$/, '')
    .trim()
    .toLowerCase()
}

/** Слова как в редакторе прототипа: всё, что между пробелами. */
export const countFreeWords = (s) => (String(s || '').trim().match(/\S+/g) || []).length

const words3 = (s) => {
  const w = String(s || '').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean)
  const out = new Set()
  for (let i = 0; i + 2 < w.length; i++) out.add(w.slice(i, i + 3).join(' '))
  return out
}

/** Доля 3-словий ответа, взятых из текста задания (0…1) — «переписал задание» (overlap прототипа). */
export function overlap3(answer, source) {
  const A = words3(answer)
  if (!A.size) return 0
  const B = words3(source)
  let n = 0
  A.forEach((x) => B.has(x) && n++)
  return n / A.size
}

/**
 * Автопроверки free-раунда — и живые (под полем), и при проверке: длина в рамках min–max, не больше половины
 * 3-словий из задания (если текст задания известен), без цифр (noDigits), нужное начало (starts).
 * [{ key: length|overlap|digits|starts, ok, n?, pct?, starts? }]
 */
export function freeChecks(round, text, taskText) {
  const n = countFreeWords(text)
  const out = [{ key: 'length', ok: n >= Number(round.min) && n <= Number(round.max), n, min: round.min, max: round.max }]
  if (taskText) {
    const ov = overlap3(text, taskText)
    out.push({ key: 'overlap', ok: ov < 0.5, pct: Math.round(ov * 100) })
  }
  if (round.noDigits) out.push({ key: 'digits', ok: !/\d/.test(String(text || '')) })
  if (Array.isArray(round.starts) && round.starts.length) {
    const s = String(text || '').trim().toLowerCase()
    out.push({ key: 'starts', ok: round.starts.some((x) => s.startsWith(String(x).toLowerCase())), starts: round.starts })
  }
  return out
}

/**
 * Проверка раунда. answer: у choice / gap / weak — индекс варианта в исходных options; у type — строка; у sort —
 * { [индекс фразы]: key корзины }; у order — индексы items в порядке ученика; у match — { [левое]: индекс правого };
 * у spot — { hit: индекс слова, text: исправление }; у pick — индексы x (массив или Set); у free — { text, taskText };
 * у html — { score, total } из сообщения страницы (или null — «Готово» без счёта).
 * Итог: { correct: true | false | null (не в счёт), expected — что показать как верный ответ, wrongItems — у sort /
 * order / match, checks — у free, marks — у pick }.
 */
export function checkRound(round, answer) {
  if (CHOICE_KINDS.has(round.kind)) {
    const k = LETTERS.indexOf(String(round.key))
    return { correct: Number(answer) === k, expected: round.options[k] }
  }
  if (round.kind === 'type') {
    const given = normalizeTyped(answer)
    return { correct: !!given && round.accept.some((a) => normalizeTyped(a) === given), expected: round.accept[0] }
  }
  if (round.kind === 'sort') {
    const placed = answer || {}
    const wrongItems = round.items.map((it, i) => (placed[i] === it.bin ? null : i)).filter((i) => i != null)
    return { correct: wrongItems.length === 0, expected: null, wrongItems }
  }
  if (round.kind === 'order') {
    const order = Array.isArray(answer) ? answer : []
    const wrongItems = round.items.map((_, p) => (order[p] === p ? null : p)).filter((p) => p != null)
    return { correct: order.length === round.items.length && wrongItems.length === 0, expected: null, wrongItems }
  }
  if (round.kind === 'match') {
    const asg = answer || {}
    const wrongItems = round.pairs.map((_, i) => (Number(asg[i]) === i && asg[i] !== '' && asg[i] != null ? null : i)).filter((i) => i != null)
    return { correct: wrongItems.length === 0, expected: null, wrongItems }
  }
  if (round.kind === 'spot') {
    const expected = `${round.tokens[round.wrong]} → ${round.accept[0]}`
    if (Number(answer?.hit) !== round.wrong) return { correct: false, expected }
    const given = normalizeTyped(answer?.text)
    return { correct: !!given && round.accept.some((a) => normalizeTyped(a) === given), expected }
  }
  if (round.kind === 'pick') {
    const sel = new Set(answer instanceof Set ? answer : Array.isArray(answer) ? answer : [])
    const key = new Set(round.answer)
    const marks = {}
    for (const i of new Set([...sel, ...key])) marks[i] = sel.has(i) ? (key.has(i) ? 'ok' : 'bad') : 'miss'
    return { correct: sel.size === key.size && round.answer.every((i) => sel.has(i)), expected: null, marks }
  }
  if (round.kind === 'free') {
    const checks = freeChecks(round, answer?.text, answer?.taskText)
    return { correct: checks.every((c) => c.ok), expected: null, checks }
  }
  if (round.kind === 'html') {
    const total = Number(answer?.total)
    if (!(total > 0)) return { correct: null, expected: null }
    return { correct: Number(answer.score) >= total, expected: null, score: Number(answer.score), total }
  }
  return { correct: null, expected: null }
}

/** Текст раунда с ответом в пропуске — для разбора после проверки. */
export function fillGap(text, value) {
  return String(text || '').replace(GAP, value == null || value === '' ? GAP : String(value))
}

/** Счёт прохода: верные из засчитанных (раунды без счёта — html без итога — в total не идут). */
export function scorePass(results) {
  const counted = (results || []).filter((r) => r && r.correct !== null && r.correct !== undefined)
  return { score: counted.filter((r) => r.correct).length, total: counted.length }
}

/** Текст задания для автопроверки free: вопрос и пункты письма одной строкой (как у copiedWords). */
export function taskText(task) {
  if (!task) return ''
  return [task.question, ...(Array.isArray(task.bullets) ? task.bullets : [])].filter(Boolean).join(' ')
}

/**
 * График раунда из ссылки: chart задания, у multi — charts[sub], series — только эти серии. Свой график раунда —
 * как есть. Нет графика — null.
 */
export function resolveVisual(visual, refChart) {
  if (!visual) return null
  if (visual.ref == null) return visual
  let c = refChart
  if (!c) return null
  if (visual.sub != null && Array.isArray(c.charts)) c = c.charts[visual.sub] || null
  if (c && Array.isArray(visual.series) && Array.isArray(c.series)) c = { ...c, series: visual.series.map((i) => c.series[i]).filter(Boolean) }
  return c
}

// Типы заданий (поле category каталога): графики Task 1 Academic, регистры писем GT, жанры эссе Task 2
const T1AC_TYPES = ['line', 'bar', 'pie', 'table', 'process', 'map', 'multi']
const GT_TYPES = ['formal', 'semi_formal', 'informal']

/** Часть по типу задания: t1ac / t1gt / t2 — ключ части гида «Как писать». */
export function partOfType(ty) {
  if (T1AC_TYPES.includes(ty)) return 't1ac'
  if (GT_TYPES.includes(ty)) return 't1gt'
  return ty ? 't2' : null
}

/** Глава «Как писать» для кнопки «Теория»: тип задания (t1ac.line) важнее общей главы дрилла (drill.guide). */
export function guideSection(doc, ty) {
  if (ty) return `${partOfType(ty)}.${ty}`
  return doc?.guide || null
}

/** Вид заданий дрилла в каталоге: task1 / task2 (category дрилла, иначе part). */
export function drillTaskKind(doc) {
  if (doc?.category === 'task1' || doc?.category === 'task2') return doc.category
  if (doc?.part === 'T2') return 'task2'
  if (doc?.part === 'T1' || doc?.part === 'GT') return 'task1'
  return null
}

/**
 * «Применить в задании»: 2–3 задания каталога под дрилл — того же вида (Task 1 своего трека / Task 2), типа ty или
 * одного из types дрилла; сначала ещё не написанные.
 */
export function tasksForDrill(items, doc, ty, track, limit = 3) {
  const kind = drillTaskKind(doc)
  const types = ty ? [ty] : Array.isArray(doc?.types) ? doc.types : null
  const rows = (items || []).filter(
    (t) =>
      t.kind !== 'drill' &&
      (kind ? t.kind === kind : t.kind === 'task1' || t.kind === 'task2') &&
      (t.kind === 'task2' || !track || t.module === track || t.module === 'both') &&
      (!types || types.includes(t.category)),
  )
  return rows
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (a.t.attemptCount > 0) - (b.t.attemptCount > 0) || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.t)
}

/**
 * Каталог дриллов для списка: дриллы банка (kind drill), а пока банк их не отдаёт — пробные. Пробные рядом с
 * настоящими не показываются: это тестовое содержимое до первых дриллов методиста.
 * progress — { [id]: { runs, best, total } } (drillProgress.js: сервер, без связи — устройство).
 */
export function drillCatalog(items, samples, progress = {}) {
  const bank = (items || []).filter((x) => x?.kind === 'drill')
  const source = bank.length ? bank : (samples || []).map(sampleSummary)
  return source.map((x) => {
    const p = progress?.[x.id]
    return { ...x, attemptCount: p?.runs || 0, best: p ? { score: p.best, total: p.total } : null }
  })
}

/** Пробный дрилл в форме строки каталога банка (как отдаёт GET /mobile/ielts/tests). */
export function sampleSummary(doc) {
  return {
    id: doc.id,
    skill: 'writing',
    kind: 'drill',
    module: doc.module,
    category: doc.category || null,
    title: doc.title,
    name: doc.name || null,
    minutes: doc.minutes || null,
    sample: true,
    questionCount: doc.rounds.length,
  }
}
