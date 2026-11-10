'use client'

// Прогресс Tenses World: результаты наборов практики (practice: {<набор>:
// {done, best, total}} — как пишет saveResult прототипа: «пройден», лучший счёт и
// сколько в наборе очков), открытые страницы времён (visited: {<время>: 1}) и
// последнее открытое время (last — кнопка «Continue: …» на хабе). Форма и ключ —
// как у прототипа (jts-tenses-world), только без его localStorage.
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge в момент снимка сервера, как у
// «Чисел» и Pronunciation World: набор, пройденный на телефоне, не
// «распроходится» черновиком ноутбука, лучший счёт — с любого устройства,
// открытые страницы объединяются. Последнее время — этого устройства.
//
// Домашней работой раздел не отчитывается: area 'tenses' бэкенду неизвестна.

import { TENSES_KEY as KEY, TENSES_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'

// id наборов — recognise, present-simple, c-ps-pc, m-past, final…; у времени — «группа-вид»
const SET = /^[a-z0-9][a-z0-9-]{0,47}$/
const TENSE = /^(past|present|future)-(simple|continuous|perfect|perfect-continuous)$/
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const count = (x) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.min(1e4, Math.floor(x)) : 0)

const emptyState = () => ({ practice: {}, visited: {}, last: null })

// Набор в форме прототипа. Есть запись — набор пройден (движок проверяет её наличие), поэтому записи без done не
// бывает: такую выбрасываем, а не показываем пройденной.
function setResult(raw) {
  if (!isObj(raw) || raw.done !== true) return null
  return { done: true, best: count(raw.best), total: count(raw.total) }
}

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только то, что похоже на прогресс
// известной формы.
export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw)) return out
  if (isObj(raw.practice)) {
    for (const [id, v] of Object.entries(raw.practice)) {
      const r = SET.test(id) ? setResult(v) : null
      if (r) out.practice[id] = r
    }
  }
  if (isObj(raw.visited)) for (const [id, v] of Object.entries(raw.visited)) if (v && TENSE.test(id)) out.visited[id] = 1
  if (typeof raw.last === 'string' && TENSE.test(raw.last)) out.last = raw.last
  return out
}

/**
 * Сведение двух копий (a — серверная, b — этого устройства): пройденный где угодно набор — пройден, лучший счёт и
 * размер набора — максимум, открытые страницы объединяются; последнее время — этого устройства (b), если оно есть.
 */
export function mergeTenses(a, b) {
  a = normalize(a)
  b = normalize(b)
  const out = { practice: {}, visited: { ...a.visited, ...b.visited }, last: b.last || a.last }
  for (const id of new Set([...Object.keys(a.practice), ...Object.keys(b.practice)])) {
    const x = a.practice[id]
    const y = b.practice[id]
    out.practice[id] = { done: true, best: Math.max(x?.best || 0, y?.best || 0), total: Math.max(x?.total || 0, y?.total || 0) }
  }
  return out
}

const store = createProgressStore({
  module: 'tenses',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergeTenses(server, local),
})

/** Копия: движок меняет прочитанное на месте. */
export function readTenses() {
  return normalize(JSON.parse(JSON.stringify(store.read())))
}

export function writeTenses(state) {
  store.write(normalize(state))
}
