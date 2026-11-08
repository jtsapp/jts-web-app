// Строки профиля Луны из модели ученика (ТЗ v2.0, 8.1 и 8.3; спека — раздел 6). Чистые: на входе — данные модели, на
// выходе — строки для studentContext.js; их же берёт зонд (scripts/assistant-eval/fixtures.js), чтобы мерить ровно то,
// что видит модель на сайте.
//
// Адреса в метках — только существующих вещей: тема «Грамматики · игр» (ggame.L2-03 — адрес из items/refs.js) и раздел
// «Словарь» (vocab). Что повторять и что значит «проще / сложнее», решил код; модели остаётся сказать (8.3: «Луна не
// придумывает задания»).

import { STATUS, daysSince, srStatus } from './sr.js'
import { nextTopic, stepOf, topicIdOf } from './program.js'
import { SOURCES } from './journal.js'

const MIN_TOPIC_ANSWERS = 5 // «слабее всего» — по теме хотя бы с таким числом ответов
const WEAK_SHARE = 0.8

const pct = (x) => `${Math.round(x * 100)} %`
// Русское число: 1 ответ, 3 ответа, 5 ответов (11–14 — «много»).
export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 15) return `${n} ${many}`
  if (b === 1) return `${n} ${one}`
  if (b >= 2 && b <= 4) return `${n} ${few}`
  return `${n} ${many}`
}
const answersN = (n) => plural(n, 'ответ', 'ответа', 'ответов')
const quote = (s) => `«${String(s || '').replace(/[«»]/g, '"').trim()}»`
const fmtDay = (ms) => new Date(ms).toISOString().slice(0, 10)
const clip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}

function titleIn(program, id) {
  return program?.topics?.find((t) => t.id === id)?.title || null
}

const isTopic = (it) => it?.kind === 'grammar' && topicIdOf(it.item)
const isWord = (it) => it?.kind === 'word'

/**
 * Карта тем грамматики: статусы тем ступени ученика и самая слабая тема.
 * @param {{ items: object[], program: object|null, level: string|null, now: number }} p
 */
export function topicsLine({ items, program, level, now }) {
  const topics = (items || []).filter(isTopic)
  if (!topics.length) return null
  const byId = new Map(topics.map((it) => [topicIdOf(it.item), it]))
  const count = { [STATUS.mastered]: 0, [STATUS.learning]: 0, [STATUS.due]: 0, [STATUS.new]: 0 }
  let head
  const step = stepOf(level)
  const stepTopics = program?.topics?.filter((t) => t.lv === step) || []
  if (stepTopics.length) {
    for (const t of stepTopics) count[srStatus(byId.get(t.id) || null, now)]++
    const range = program.ranges?.get(step)
    head = `Темы грамматики (программа «Грамматика · игры», ступень ${step}${range ? ` «${range}»` : ''} — ${plural(stepTopics.length, 'тема', 'темы', 'тем')}; статусы считает сайт по интервальному повторению): освоено ${count.mastered}, изучается ${count.learning}, пора повторить ${count.due}, не начато ${count.new}.`
  } else {
    for (const it of topics) count[srStatus(it, now)]++
    head = `Темы грамматики, которые ученик проходил в «Грамматике · игры» (статусы считает сайт по интервальному повторению): освоено ${count.mastered}, изучается ${count.learning}, пора повторить ${count.due}.`
  }
  const weak = topics
    .filter((it) => it.seen >= MIN_TOPIC_ANSWERS && it.correct / it.seen < WEAK_SHARE)
    .sort((a, b) => a.correct / a.seen - b.correct / b.seen)[0]
  if (!weak) return head
  const id = topicIdOf(weak.item)
  return `${head} Слабее всего: ${quote(titleIn(program, id) || weak.title || id)} — ${pct(weak.correct / weak.seen)} верных (${answersN(weak.seen)}).`
}

/** Что пора повторить сегодня: темы (по сроку) и слова. */
export function dueReview({ items, program, now }) {
  const due = (items || []).filter((it) => srStatus(it, now) === STATUS.due).sort((a, b) => a.dueAt - b.dueAt)
  const topics = due.filter(isTopic).map((it) => {
    const id = topicIdOf(it.item)
    return { id, ref: `ggame.${id}`, title: titleIn(program, id) || it.title || id, days: daysSince(it.lastAt, now) }
  })
  const words = due.filter(isWord).map((it) => it.title).filter(Boolean)
  return { topics, words }
}

/**
 * Повторение по расписанию (8.3: 1, 3, 7, 14 дней).
 * @param {{ items: object[], program: object|null, now: number }} p
 */
export function reviewLine(p) {
  const { topics, words } = dueReview(p)
  if (!topics.length && !words.length) return null
  const parts = []
  if (topics.length) {
    // «прошло 3 дн.», а не «последний раз 3 дн. назад»: его модель пересказывала «ты её проходила» — род к ученику
    // (зонд 08.11.2026, M01 и M06).
    const shown = topics.slice(0, 3).map((t) => `${quote(t.title)} (${t.days ? `прошло ${t.days} дн.` : 'срок — сегодня'}, метка [[OPEN ${t.ref}]])`)
    parts.push(`темы ${shown.join('; ')}${topics.length > 3 ? ` и ещё ${topics.length - 3}` : ''}`)
  }
  if (words.length) {
    parts.push(`слова — ${words.length}: ${words.slice(0, 5).join(', ')}${words.length > 5 ? ', …' : ''}; их повторяют в «Словаре», блок «Повторить по расписанию» (метка [[OPEN vocab]])`)
  }
  return `Повторение по расписанию (через 1, 3, 7, 14 дней — сроки считает сайт; после шагов плана на сегодня, не вместо них), сегодня пора повторить: ${parts.join('; ')}.`
}

/**
 * «Совет сайта» про повторение — когда плана на сегодня нет или он сделан (adviceLine): тема первой, её не открыть без
 * адреса; слова — блоком «Словаря».
 * @returns {{ id: string, name: string, reason: string } | null}
 */
export function reviewAdvice(p) {
  const { topics, words } = dueReview(p)
  if (topics.length) {
    const t = topics[0]
    return { id: t.ref, name: `тема ${quote(t.title)} в «Грамматике · игры»`, reason: `пора повторить по расписанию${t.days ? ` (прошло ${t.days} дн.)` : ''}` }
  }
  if (words.length) return { id: 'vocab', name: '«Словарь» → «Повторить по расписанию»', reason: `пора повторить слов: ${words.length}` }
  return null
}

/**
 * Журнал ошибок заданий (journal.js) строкой.
 * @param {ReturnType<import('./journal.js').buildJournal>} journal
 */
export function journalLine(journal, max = 4) {
  const list = (journal || []).filter((g) => g.count > 0).slice(0, max)
  if (!list.length) return null
  const items = list.map((g) => {
    const name = g.source === 'vocab' ? `слова${g.words?.length ? ` (${g.words.slice(0, 4).join(', ')})` : ''}` : quote(g.rule)
    const times = plural(g.count, 'раз', 'раза', 'раз')
    const where = g.source === 'lesson' ? 'урок курса' : SOURCES[g.source]
    const ex = g.example ? `: ${quote(clip(g.example, 90))}` : ''
    return `${name} — ${times} (${where}, последняя ${fmtDay(g.lastAt)}${ex})`
  })
  return `Ошибки в заданиях за 30 дней (журнал сайта, повторяющиеся первыми): ${items.join('; ')}.`
}

/** Как занимается (behavior.js). */
export function behaviorLine(b) {
  if (!b || !b.sessions || b.medianMin == null) return null
  const parts = [`дней с заданиями ${b.days}`]
  if (b.window && b.window.share >= 0.4) parts.push(`чаще всего с ${b.window.from} до ${b.window.to} ч (по Алматы)`)
  parts.push(`подряд обычно около ${b.medianMin} мин${b.longestMin && b.longestMin > b.medianMin ? `, самое долгое — ${b.longestMin} мин` : ''}`)
  return `Как занимается (по ответам в заданиях за 30 дней): ${parts.join('; ')}.`
}

/**
 * Темп сейчас и совет методики (pace.js). Шаг проще у темы игр — её правило, сложнее — следующая неосвоенная тема.
 * @param {{ pace: import('./pace.js').Pace, program: object|null, items?: object[], now: number }} p
 */
export function paceLine({ pace, program, items = [], now }) {
  if (!pace || pace.verdict === 'none' || (pace.verdict === 'hold' && pace.n < 8)) return null
  const stats = `последние 90 минут: ${answersN(pace.n)}, ${pct(pace.accuracy)} верных`
  if (pace.verdict === 'hold') return `Темп сейчас (${stats}) — в норме: держим около 80 % верных.`
  const id = topicIdOf(pace.item)
  const name = id ? quote(titleIn(program, id) || pace.title || id) : pace.title ? quote(pace.title) : null
  if (pace.verdict === 'easier') {
    const head = pace.why === 'streak'
      ? `Темп сейчас: ${plural(pace.streak, 'ошибка', 'ошибки', 'ошибок')} подряд${name ? ` в ${id ? 'теме' : String(pace.item || '').startsWith('lesson:') ? 'уроке' : 'задании'} ${name}` : ''} (${stats}).`
      : `Темп сейчас (${stats}) — ниже нормы: держим около 80 % верных.`
    const step = id
      ? `объясни правило этой темы простыми словами, с одним примером на другом слове (не из задания на экране), и предложи шаг проще — вернуться к её правилу (метка [[OPEN ggame.${id}]]); нового задания не придумывай, ответ задания на экране не называй.`
      : 'объясни правило задания простыми словами, по шагам, с одним примером на другом слове; нового задания не придумывай, ответ задания на экране не называй.'
    return `${head} Совет методики (${pace.why === 'streak' ? '3 ошибки подряд — шаг проще' : 'ниже 80 % — объяснение и упрощение'}): ${step}`
  }
  // harder
  const mastered = (tid) => srStatus((items || []).find((it) => topicIdOf(it.item) === tid) || null, now) === STATUS.mastered
  const next = id ? nextTopic(program, id, mastered) : null
  const head = `Темп сейчас (${stats}${pace.why === 'fast' ? `, ${plural(pace.streak, 'верный быстрый ответ', 'верных быстрых ответа', 'верных быстрых ответов')} подряд` : ', быстро'}) — выше нормы.`
  const step = next
    ? `похвали конкретно и предложи шаг сложнее — следующую тему ${quote(next.title)} (метка [[OPEN ggame.${next.id}]]).`
    : 'похвали конкретно и скажи, что можно браться за задания сложнее — следующий шаг плана.'
  return `${head} Совет методики (всё верно и быстро — сложнее): ${step}`
}
