// Проверка банка вопросов SAT — порт JTS.bank.validateAll прототипа jts-sat-platform (js/core.js).
// Экспорт падает на первой же ошибке банка: в бэкенд и админку не должен уехать вопрос, который прототип сам бы
// отверг. Те же правила потом живут в SatDocument бэкенда (импорт из админки) — источник у них один, этот файл.
//
// Отличия от прототипа (SAT-SYNC-PLAN.md A2) — там, где прототип лишь пишет предупреждение в консоль, а вопрос всё равно
// показывает:
//   - вопрос юнита или пробника может быть без навыка (Challenge-наборы смешивают темы, бумажные тесты их не пишут);
//     названный навык обязан существовать;
//   - разбор вариантов R&W обязателен только банку практики: наборы юнитов идут за письменным уроком;
//   - у Challenge (CH1–CH12) разбора может не быть вовсе — это тренировка «hard»-модуля, как пробник;
//   - acceptedAnswers (другие формы ответа вписывания) — только у spr и только числа;
//   - картинка — только `sat-media:<имя>` (или полный адрес/data:); относительный путь значит, что файл не нашли
//     через assetBase и ученик увидит битую картинку.

const SECTIONS = ['rw', 'math']
const LICENSES = ['original', 'licensed', 'link-only']
const REVIEW = ['draft', 'reviewed']
const KINDS = ['bank', 'lesson', 'paper']

// SPR: тот же разбор числа, что в src/sat/model/spr.js (дробь, десятичная, минус)
function sprValue(raw) {
  const n = String(raw ?? '').trim().replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(/^\+/, '')
  if (!n) return null
  const m = n.match(/^(-?)(\d+)\/(\d+)$/)
  if (m) return Number(m[3]) ? (m[1] ? -1 : 1) * (Number(m[2]) / Number(m[3])) : null
  return /^-?(\d+\.?\d*|\.\d+)$/.test(n) ? Number(n) : null
}

const IMG_SRC = /<img\b[^>]*?\bsrc="([^"]*)"/gi
function relativeImages(q) {
  const out = []
  for (const m of JSON.stringify(q).replace(/\\"/g, '"').matchAll(IMG_SRC)) {
    if (!/^(sat-media:|https?:|data:|assets\/)/.test(m[1])) out.push(m[1])
  }
  return out
}

/**
 * @param {object[]} items  вопросы банка (bank / paper / lesson вместе)
 * @param {{ skillIds: Set<string>, lessonCodes: Set<string> }} ctx
 * @returns {{ id: string, message: string }[]}
 */
function validateBank(items, ctx) {
  const problems = []
  const ids = new Set()
  for (const q of items) {
    const bad = (message) => problems.push({ id: q.id || '(none)', message })
    if (!q.id) {
      bad('missing id')
      continue
    }
    if (ids.has(q.id)) bad('duplicate id')
    ids.add(q.id)
    if (!SECTIONS.includes(q.section)) bad('bad section')
    const kind = q.meta?.kind || 'bank'
    if (!KINDS.includes(kind)) bad(`bad meta.kind ${kind}`)
    const topicless = q.skillId == null && (kind === 'lesson' || kind === 'paper')
    if (!topicless && !ctx.skillIds.has(q.skillId)) bad(`unknown skillId ${q.skillId}`)
    if (![1, 2, 3].includes(q.difficulty)) bad('difficulty must be 1|2|3')
    if (!['mcq', 'spr'].includes(q.type)) bad('bad type')
    if (q.type === 'mcq') {
      if (!Array.isArray(q.options) || q.options.length !== 4) bad('mcq needs 4 options')
      if (!['A', 'B', 'C', 'D'].includes(q.answer)) bad('mcq answer must be A-D')
      if (q.section === 'rw' && !q.distractors && kind === 'bank') bad('R&W mcq needs distractor rationales')
      if (q.acceptedAnswers != null) bad('acceptedAnswers is for spr only')
    }
    if (q.type === 'spr') {
      if (!Array.isArray(q.answer) || !q.answer.length) bad('spr answer must be a non-empty array')
      else for (const a of q.answer) if (sprValue(a) === null) bad(`spr answer not numeric: ${a}`)
      if (q.acceptedAnswers != null) {
        if (!Array.isArray(q.acceptedAnswers)) bad('acceptedAnswers must be an array')
        else for (const a of q.acceptedAnswers) if (sprValue(a) === null) bad(`accepted answer not numeric: ${a}`)
      }
    }
    // пробник — это экзамен, а не урок: учебного слоя у него нет вовсе, и это проверяется, а не помнится
    if (kind === 'paper') {
      if (q.explanation || q.distractors || q.hints || q.methods) bad('a paper item carries no explanation, distractors, hints or methods')
    } else if (kind === 'lesson') {
      const code = q.meta?.lessonCode
      if (!ctx.lessonCodes.has(code)) bad(`lesson item names no class of the course: ${code}`)
      else if (!/^CH/.test(code) && !q.explanation?.en) bad('explanation needs en')
    } else if (!q.explanation?.en || !q.explanation?.ru || !q.explanation?.kk) {
      bad('explanation needs en/ru/kk')
    }
    if (q.calculator !== (q.section === 'math')) bad('calculator must be true for math and false for rw')
    if (!q.meta) bad('missing meta')
    else {
      if (!q.meta.source) bad('meta.source required')
      if (!LICENSES.includes(q.meta.licenseStatus)) bad('bad licenseStatus')
      if (!REVIEW.includes(q.meta.reviewStatus)) bad('bad reviewStatus')
    }
    if (q.methods && q.methods.length === 1) bad('methods[] with a single entry: drop it or add a real alternative')
    for (const src of relativeImages(q)) bad(`image path not resolved against assetBase: ${src}`)
  }
  return problems
}

module.exports = { validateBank, sprValue }
