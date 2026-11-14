'use client'

// Прогресс Parts of Speech World — четыре ключа хранилища прототипа одним
// объектом:
// - acts  (pos:progress)  — результат упражнения юнита: { <упражнение>: { score, total } };
//   есть запись — упражнение пройдено (так движок красит шаг и считает юнит);
// - cases (pos:g:prog)    — дела игры: { <дело>: { done: [решённые стадии],
//   first: { <стадия>: [верно с первой попытки, заданий] }, complete } };
// - clues (pos:g:clues)   — найденные подсказки на картинке дела: { <дело>: [номера] };
// - seen  (pos:g:seen)    — какие «How to play» уже показаны: { <движок стадии>: 1 }.
// Язык перевода, звук, подписи слов и черновики письма живут на устройстве
// (device.js).
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge в момент снимка сервера, как у
// Tenses и Punctuation World: упражнение и стадия, решённые на телефоне, не
// «разрешаются» черновиком ноутбука, счёт — лучший с любого устройства.
//
// Домашней работой раздел не отчитывается: area 'partsofspeech' бэкенду неизвестна.

import { PARTSOFSPEECH_KEY as KEY, PARTSOFSPEECH_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'

// id упражнений (u01a1), дел (c01) и движков стадий (hunt) — латиница и цифры; чужой ключ в хранилище не берём
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/
const MAX_STAGES = 40
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const count = (x) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.min(1e4, Math.floor(x)) : 0)
const index = (x) => (Number.isInteger(x) && x >= 0 && x < MAX_STAGES ? x : -1)
const indexes = (list) => [...new Set((Array.isArray(list) ? list : []).map(index).filter((k) => k >= 0))].sort((a, b) => a - b)

const emptyState = () => ({ acts: {}, cases: {}, clues: {}, seen: {} })

// «Верно из стольких-то»: счёт не больше числа заданий, пустой набор — не результат.
function score(right, total) {
  const t = count(total)
  return t ? [Math.min(count(right), t), t] : null
}

function caseState(raw) {
  if (!isObj(raw)) return null
  const done = indexes(raw.done)
  const first = {}
  if (isObj(raw.first)) {
    for (const [k, v] of Object.entries(raw.first)) {
      const s = Array.isArray(v) ? score(v[0], v[1]) : null
      if (s && index(Number(k)) >= 0 && /^\d+$/.test(k)) first[k] = s
    }
  }
  const complete = raw.complete === true
  // Открытое, но не начатое дело (движок заводит пустую запись при входе) и сброшенное «Replay» — не прогресс.
  if (!done.length && !complete) return null
  return { done, first, complete }
}

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только то, что похоже на прогресс.
export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw)) return out
  if (isObj(raw.acts)) {
    for (const [id, v] of Object.entries(raw.acts)) {
      const s = ID.test(id) && isObj(v) ? score(v.score, v.total) : null
      if (s) out.acts[id] = { score: s[0], total: s[1] }
    }
  }
  if (isObj(raw.cases)) {
    for (const [id, v] of Object.entries(raw.cases)) {
      const c = ID.test(id) ? caseState(v) : null
      if (c) out.cases[id] = c
    }
  }
  if (isObj(raw.clues)) {
    for (const [id, v] of Object.entries(raw.clues)) {
      const list = ID.test(id) ? indexes(v) : []
      if (list.length) out.clues[id] = list
    }
  }
  if (isObj(raw.seen)) for (const [id, v] of Object.entries(raw.seen)) if (v && ID.test(id)) out.seen[id] = 1
  return out
}

// Лучший из двух результатов — по доле верных; при равенстве — этого устройства (y): он свежее.
const better = (x, y) => (!y ? x : !x ? y : x[0] * y[1] > y[0] * x[1] ? x : y)

/**
 * Сведение двух копий (a — серверная, b — этого устройства): упражнения, решённые стадии, подсказки и показанные
 * «How to play» объединяются; счёт упражнения и первой попытки стадии — лучший; дело закрыто, если закрыто где угодно.
 */
export function mergePartsOfSpeech(a, b) {
  a = normalize(a)
  b = normalize(b)
  const out = emptyState()
  for (const id of new Set([...Object.keys(a.acts), ...Object.keys(b.acts)])) {
    const x = a.acts[id]
    const y = b.acts[id]
    const s = better(x && [x.score, x.total], y && [y.score, y.total])
    out.acts[id] = { score: s[0], total: s[1] }
  }
  for (const id of new Set([...Object.keys(a.cases), ...Object.keys(b.cases)])) {
    const x = a.cases[id] || { done: [], first: {}, complete: false }
    const y = b.cases[id] || { done: [], first: {}, complete: false }
    const first = {}
    for (const k of new Set([...Object.keys(x.first), ...Object.keys(y.first)])) first[k] = better(x.first[k], y.first[k])
    out.cases[id] = { done: indexes([...x.done, ...y.done]), first, complete: x.complete || y.complete }
  }
  for (const id of new Set([...Object.keys(a.clues), ...Object.keys(b.clues)])) out.clues[id] = indexes([...(a.clues[id] || []), ...(b.clues[id] || [])])
  out.seen = { ...a.seen, ...b.seen }
  return out
}

const store = createProgressStore({
  module: 'partsofspeech',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergePartsOfSpeech(server, local),
})

/** Копия: движок меняет прогресс на месте. */
export function readPartsOfSpeech() {
  return normalize(JSON.parse(JSON.stringify(store.read())))
}

export function writePartsOfSpeech(state) {
  store.write(normalize(state))
}

/**
 * Запись от движка. Движок держит копию прогресса и перечитывает её только на смене экрана: снимок сервера,
 * пришедший посреди упражнения, иначе затёрся бы его старой копией (сервер хранит модуль заменой) — поэтому запись
 * сводится с тем, что уже лежит в хранилище. Единственное, что в разделе убывает, — «Replay this quest»: движок
 * называет сброшенное дело (reset), и его прежняя запись в сведение не идёт.
 */
export function savePartsOfSpeech(state, reset) {
  const base = readPartsOfSpeech()
  if (reset) delete base.cases[reset]
  writePartsOfSpeech(mergePartsOfSpeech(base, state))
}
