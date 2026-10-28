'use client'

// Прогресс Pronunciation World: какие темы объяснены до конца (learned), три
// раунда Echo Gates у каждой темы ({done, best, plays}: пройден, лучшая доля
// «с первого раза», сколько раз начинали), видел ли ученик «Как играть»
// (tutorial), открытый уровень карты и последняя тема. Форма и ключ — как у
// прототипа (jts-pron-v2), только без его localStorage и без tr: перевод живёт
// во вкладке (sessionStorage движка).
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge в момент снимка сервера, как у
// «Чисел»: тема, объяснённая на телефоне, и пройденный там раунд не
// «распроходятся» черновиком ноутбука, лучший результат — с любого устройства.
// Уровень карты и последняя тема — этого устройства.
//
// Домашней работой раздел не отчитывается: area 'pronunciation' бэкенду неизвестна.

import { PRONUNCIATION_KEY as KEY, PRONUNCIATION_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'

const ROUNDS = 3
const TOPIC = /^[A-Z]\d\.\d{1,3}$/
const LEVEL = /^[A-Z]\d$/
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const share = (x) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0)
const count = (x) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.min(1e6, Math.floor(x)) : 0)

const emptyState = () => ({ learned: {}, rounds: {}, tutorial: false, level: null, last: null })

// Раунд в форме прототипа: нетронутый — {}, иначе только заданные поля. Движок читает r.best >= 0.85, r.done,
// rs.plays || 0 — пустой объект и нули для него одно и то же, а лишние нули раздували бы стейт на 44 темы.
function round(raw) {
  const r = {}
  if (!isObj(raw)) return r
  if (raw.done) r.done = true
  const best = share(raw.best)
  if (best) r.best = best
  const plays = count(raw.plays)
  if (plays) r.plays = plays
  return r
}

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только то, что похоже на прогресс
// известной формы.
export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw)) return out
  if (isObj(raw.learned)) for (const [id, v] of Object.entries(raw.learned)) if (v && TOPIC.test(id)) out.learned[id] = true
  if (isObj(raw.rounds)) {
    for (const [id, list] of Object.entries(raw.rounds)) {
      if (!TOPIC.test(id) || !Array.isArray(list)) continue
      out.rounds[id] = Array.from({ length: ROUNDS }, (_, i) => round(list[i]))
    }
  }
  out.tutorial = raw.tutorial === true
  if (typeof raw.level === 'string' && LEVEL.test(raw.level)) out.level = raw.level
  if (typeof raw.last === 'string' && TOPIC.test(raw.last)) out.last = raw.last
  return out
}

/**
 * Сведение двух копий (a — серверная, b — этого устройства): объяснённое где угодно — объяснено; раунд пройден
 * где угодно — пройден; лучшая доля и число запусков — максимум; «Как играть» видели — видели. Уровень карты и
 * последняя тема — этого устройства (b), если они там есть.
 */
export function mergePronunciation(a, b) {
  a = normalize(a)
  b = normalize(b)
  const out = { learned: { ...a.learned, ...b.learned }, rounds: {}, tutorial: a.tutorial || b.tutorial, level: b.level || a.level, last: b.last || a.last }
  for (const id of new Set([...Object.keys(a.rounds), ...Object.keys(b.rounds)])) {
    const x = a.rounds[id] || []
    const y = b.rounds[id] || []
    out.rounds[id] = Array.from({ length: ROUNDS }, (_, i) =>
      round({
        done: (x[i] && x[i].done) || (y[i] && y[i].done),
        best: Math.max((x[i] && x[i].best) || 0, (y[i] && y[i].best) || 0),
        plays: Math.max((x[i] && x[i].plays) || 0, (y[i] && y[i].plays) || 0),
      }),
    )
  }
  return out
}

const store = createProgressStore({
  module: 'pronunciation',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergePronunciation(server, local),
})

/** Копия: движок меняет прочитанное на месте. */
export function readPronunciation() {
  return normalize(JSON.parse(JSON.stringify(store.read())))
}

export function writePronunciation(state) {
  store.write(normalize(state))
}
