// Программа грамматики для карты тем (спека модели ученика, раздел 2): 125 тем «Грамматики · игр» по пяти ступеням.
//
// Источник — GET /mobile/grammar-games. Бэкенд и фикстура прототипа отдают его по-разному: бэкенд — `topics` с
// названием по языкам (`title.ru`), прототип — `index.program` со строкой `t`. Сводим к одному виду, порядок —
// порядок программы: по нему «следующая тема» (шаг сложнее, pace.js).

import { levelOf } from '../../practice/grammar-games/levelOf.js'

const TOPIC_ID = /^L[1-5]-\d{2}$/

const clean = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

/**
 * @param {object|null} data ответ /mobile/grammar-games
 * @returns {{ topics: {id: string, lv: string, title: string}[], ranges: Map<string, string> } | null}
 */
export function normalizeProgram(data) {
  if (!data || typeof data !== 'object') return null
  const raw = Array.isArray(data.topics) ? data.topics : Array.isArray(data.index?.program) ? data.index.program : Array.isArray(data.program) ? data.program : []
  const levels = Array.isArray(data.levels) ? data.levels : Array.isArray(data.index?.levels) ? data.index.levels : []
  const topics = raw
    .map((t) => {
      const id = String(t?.id || '')
      const title = clean(typeof t?.title === 'object' ? t.title?.ru || t.title?.en : t?.title || t?.t)
      const lv = String(t?.lv || id.slice(0, 2))
      return TOPIC_ID.test(id) ? { id, lv, title: title || id } : null
    })
    .filter(Boolean)
  if (!topics.length) return null
  return { topics, ranges: new Map(levels.map((l) => [String(l.id), clean(l.range)])) }
}

/** Ступень программы для уровня ученика — та же, что открывает экран (levelOf: A2 → L3 «A2 → B1»). */
export const stepOf = (level) => levelOf(level)

/** id темы из ключа вещи модели: 'ggame:L2-03' → 'L2-03'. */
export function topicIdOf(item) {
  const m = /^ggame:(L[1-5]-\d{2})$/.exec(String(item || ''))
  return m ? m[1] : null
}

/**
 * Следующая неосвоенная тема после данной в порядке программы — «шаг сложнее». Только той же ступени и следующей: на две
 * ступени вперёд — не i+1.
 * @param {{topics: object[]}} program
 * @param {string} id
 * @param {(id: string) => boolean} mastered
 */
export function nextTopic(program, id, mastered = () => false) {
  const list = program?.topics || []
  const i = list.findIndex((t) => t.id === id)
  if (i < 0) return null
  const lv = Number(list[i].lv.slice(1))
  for (let k = i + 1; k < list.length; k++) {
    const t = list[k]
    if (Number(t.lv.slice(1)) > lv + 1) break
    if (!mastered(t.id)) return t
  }
  return null
}
