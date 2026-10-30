// Короткие тренировки Writing («Short drills»): 3–10 минут на один приём письма, проверка на устройстве. Формат —
// документ банка IELTS `skill: writing, kind: drill` (backend docs/ielts/TEST_FORMAT.md §7, «Короткие тренировки»):
// методист заводит дрилл JSON-импортом в web-admin, код не правится. Пока в банке нет ни одного дрилла, раздел
// показывает пробные (sampleDrills.js) — тот же формат. Раунды совместимы с «Проверьте себя» прототипа
// (data/quick-practice.js: gap / weak, key — буква варианта), плюс choice / type / sort и html — чужая разметка в
// песочнице. Чистые функции: экран только рисует.
//
// Дрилл: { id, skill: 'writing', kind: 'drill', module: academic|general|both, category: task1|task2|both, title,
//   name?: {ru,kk,en}, intro?: {ru,kk,en}, minutes?, show?, asks?: { <вид раунда>: {ru,kk,en} }, sample?, rounds: [раунд] }
// Раунд: { kind, module?, ask?: {ru,kk,en}, text?, why?: {ru,kk,en}, … } — поля вида:
//   choice — options (2–6), key 'A'…: выбрать верный вариант (text — материал над вариантами, необязательно);
//   gap    — text с одним «___», options, key: вариант для пропуска;
//   weak   — две фразы (options), key — та, что звучит слабее (как в прототипе);
//   type   — text с одним «___», accept: допустимые ответы (регистр, лишние пробелы и точка в конце не важны);
//   sort   — bins: [{ key, label }], items: [{ text, bin }]: разложить фразы по корзинам (формально / неформально);
//   html   — html: своя страница упражнения в iframe-песочнице; итог она шлёт сама:
//            parent.postMessage({ jtsDrill: 'result', score, total }, '*'). Без сообщения ученик жмёт «Готово», и раунд
//            в счёт не идёт.

export const ROUND_KINDS = ['choice', 'gap', 'weak', 'type', 'sort', 'html']
const CHOICE_KINDS = new Set(['choice', 'gap', 'weak'])
export const LETTERS = 'ABCDEF'
export const GAP = '___'

const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x)
const countGaps = (s) => String(s || '').split(GAP).length - 1

/** Текст на языке интерфейса: строка как есть, объект { ru, kk, en } — по языку, иначе русский или английский. */
export function pickLang(v, lang) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  return v[lang] || v.ru || v.en || ''
}

/**
 * Ошибки формы дрилла — то же, что проверяет бэкенд при импорте (IeltsDocument.validateWriting). Пустой список —
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
  rounds.forEach((r, i) => {
    const p = `/rounds/${i}`
    if (!isObj(r) || !ROUND_KINDS.includes(r.kind)) return out.push(`${p}/kind: ${ROUND_KINDS.join(' | ')}`)
    if (r.module && !['academic', 'general', 'both'].includes(r.module)) out.push(`${p}/module: academic | general | both`)
    if (CHOICE_KINDS.has(r.kind)) {
      const n = Array.isArray(r.options) ? r.options.length : 0
      if (n < 2 || n > LETTERS.length) out.push(`${p}/options: 2–${LETTERS.length} вариантов`)
      else if (new Set(r.options).size !== n) out.push(`${p}/options: варианты повторяются`)
      const k = LETTERS.indexOf(String(r.key || ''))
      if (k < 0 || k >= n) out.push(`${p}/key: буква варианта A–${LETTERS[Math.max(0, n - 1)]}`)
      if (r.kind === 'weak' && n !== 2) out.push(`${p}/options: у weak ровно две фразы`)
    }
    if ((r.kind === 'gap' || r.kind === 'type') && countGaps(r.text) !== 1) out.push(`${p}/text: ровно один пропуск ${GAP}`)
    if (r.kind === 'type' && !(Array.isArray(r.accept) && r.accept.some((a) => String(a).trim()))) out.push(`${p}/accept: нужен хотя бы один ответ`)
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

/**
 * Один проход: раунды своего трека вперемешку, не больше show; у раундов с вариантами — порядок показа
 * (order — индексы исходных options: проверка идёт по букве исходного порядка, как JTS.check прототипа).
 * rng — для тестов; «Ещё раз» — новый проход, новый порядок.
 */
export function buildPass(doc, track, rng = Math.random) {
  const pool = roundsForTrack(doc, track)
  const show = Number(doc?.show) > 0 ? Math.min(Number(doc.show), pool.length) : pool.length
  return shuffle(pool, rng).slice(0, show).map((round) => {
    if (CHOICE_KINDS.has(round.kind)) return { round, order: shuffle(round.options.map((_, i) => i), rng) }
    if (round.kind === 'sort') return { round, order: shuffle(round.items.map((_, i) => i), rng) }
    return { round, order: null }
  })
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

/**
 * Проверка раунда. answer: у choice / gap / weak — индекс варианта в исходных options; у type — строка; у sort —
 * { [индекс фразы]: key корзины }; у html — { score, total } из сообщения страницы (или null — «Готово» без счёта).
 * Итог: { correct: true | false | null (не в счёт), expected — что показать как верный ответ, wrongItems — у sort }.
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

/**
 * Каталог дриллов для списка: дриллы банка (kind drill), а пока банк их не отдаёт — пробные. Пробные рядом с
 * настоящими не показываются: это тестовое содержимое до первых дриллов методиста.
 * progress — { [id]: { runs, best, total } } с устройства (drillProgress.js).
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
