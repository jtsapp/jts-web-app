// Что уходит на бэкенд по итогам пробного урока и что показывается на экране
// результата. Отдельным модулем — это единственная часть урока, которую надо
// проверять числами (payload уезжает в базу и попадает преподавателю), а не
// глазами по экрану.

import { placementLevel, placementFlags } from '../lib/placement.js'

/** Пауза перед повтором отправки результата. */
const RETRY_DELAY_MS = 2000

/** Названия блоков для экрана результата и карточки преподавателя. */
export const SKILL_TITLES = {
  routing: 'Разминка',
  uoe2: 'Грамматика',
  listening: 'Аудирование',
  minpair: 'Восприятие на слух',
  clip: 'Видео',
  reading: 'Чтение',
  uoe: 'Грамматика и лексика',
  vocab_match: 'Словарь и идиомы',
}

/** Доля верных по блоку: у градуированных заданий движок пишет score
 *  (частичный зачёт), у обычных — correct. */
function ratioOf(stat) {
  if (!stat || !stat.n) return null
  const scored = stat.score != null ? stat.score : stat.correct
  return scored / stat.n
}

/** Сильные стороны и зоны роста — то, что преподаватель проговаривает вслух.
 *  Порог 0.6 и «хотя бы одна сильная сторона» — из бандла: на пробном уроке
 *  ученик не должен получить экран, где у него нет ни одного плюса. */
export function strengthsAndGrowth(result, vocabMatch) {
  const ratios = []
  Object.entries(result?.skills || {}).forEach(([key, stat]) => {
    if (!stat || stat.n < 2) return
    ratios.push({ name: SKILL_TITLES[key] || key, ratio: ratioOf(stat) })
  })
  if (result?.lex) ratios.push({ name: 'Словарь', ratio: result.lex.score100 / 100 })
  if (vocabMatch?.n) ratios.push({ name: SKILL_TITLES.vocab_match, ratio: vocabMatch.score / vocabMatch.n })

  ratios.sort((a, b) => b.ratio - a.ratio)
  let strengths = ratios.filter((x) => x.ratio >= 0.6).slice(0, 3)
  if (!strengths.length && ratios.length) strengths = ratios.slice(0, 1)
  const growth = ratios
    .slice()
    .reverse()
    .filter((x) => x.ratio < 0.6 && !strengths.includes(x))
    .slice(0, 3)
  return { strengths, growth }
}

/** Задания словарного матчинга живут в логе, а не в skills: движок про блок
 *  vocab_match ничего не знает, он приехал со слоем урока. */
export function vocabMatchScore(log) {
  const entries = (log || []).filter((e) => e.block === 'vocab_match' && e.correct != null)
  if (!entries.length) return null
  return {
    n: entries.length,
    score: Math.round(entries.reduce((a, e) => a + e.correct, 0) * 10) / 10,
  }
}

/**
 * Тело запроса POST /trial/link/{token}/result.
 *
 * `raw` — полный экспорт сессии: бэкенд кладёт его в jsonb, чтобы после
 * калибровки банка пересчитать уровень по тем же ответам. Возвращает null,
 * если уровень не распознан: писать в базу диагностику без уровня незачем,
 * а бэкенд такой запрос всё равно отклонит.
 */
export function trialResultPayload({ result, session, startCando, lang, startedAt, now }) {
  const level = placementLevel(result)
  if (!level) return null
  const num = (v) => (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null)
  return {
    level,
    theta: num(result.theta),
    standardError: num(result.se),
    startCando,
    lang,
    durationSeconds: startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : null,
    skills: result.skills || {},
    flags: placementFlags(result),
    raw: session ? session.exportJson() : null,
  }
}

/**
 * Отправка результата с одним повтором.
 *
 * Результат уходит ровно один раз за урок и после этого нигде на клиенте не
 * хранится: потеряли — потеряли всю диагностику, ради которой урок и был.
 * Один повтор закрывает обычную причину потери — секундный обрыв связи в конце
 * занятия; дальше преподаватель видит предупреждение в своей карточке и
 * переписывает уровень руками.
 */
export async function sendResultWithRetry(send, payload, { delayMs = RETRY_DELAY_MS, wait } = {}) {
  try {
    return await send(payload)
  } catch {
    await (wait ? wait(delayMs) : new Promise((resolve) => setTimeout(resolve, delayMs)))
    return send(payload)
  }
}
