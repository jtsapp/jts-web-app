'use client'

// Прогресс «Чтения» — порт prog()/textScore()/save() из data/jtsreading.html
// (~:552–560, 1003–1007). На текст храним результат каждого упражнения
// (лучший из попыток) и флаг «дочитал до экрана результата».
//
// Где живёт состояние (с 05.10.2026). Раньше — только в localStorage, и это
// сломалось на живом ученике: хранилище домена забивал кэш каталогов
// (jts_catalog_*), запись прогресса молча падала, галочки «Всё верно» держал
// React, а итог читал пустое хранилище и показывал 0 %. Сервер при этом
// получал «старое + одно задание» и заменял им всё.
//
// Теперь:
// - источник истины у вошедшего — сервер (practice_state.reading), он сливает
//   дельты «лучшим результатом» (src/lib/readingState.js);
// - страница читает состояние из ПАМЯТИ (mem), загруженной с сервера и
//   дополненной своими отметками;
// - localStorage — только черновик: чтобы гость пережил перезагрузку, а
//   вошедший видел прогресс до ответа сервера. Ошибку квоты глотаем — память
//   и сервер от неё не зависят.

import { READING_KEY as KEY, READING_PROGRESS_EVENT as EVENT } from '../practiceKeys.js'
import { countUnitTowardsHomework } from '../practiceHomework.js'
import { loadToken } from '../../lib/session.js'
import { payloadOf } from '../../lib/jwt.js'
import { mergeReadingState, readingDelta } from '../../lib/readingState.js'
import { textScore } from './engine.js'

const ENDPOINT = '/api/practice/state'

// mem — состояние страницы и чьё оно. owner меняется при входе/выходе в той же
// вкладке: тогда память перечитывается из черновика (его уже переписал
// clearLocalPractice/hydratePractice), иначе следующий ученик увидел бы чужое.
let mem = null
// queue — накопленная, ещё не отправленная дельта; sending — промис текущей
// отправки. Одна отправка в полёте на вкладку: дельты, пришедшие за время
// запроса, сливаются и уходят следующей.
let queue = null
let sending = null

function owner() {
  const token = loadToken()
  if (!token) return 'guest'
  const p = payloadOf(token)
  return `user:${p?.sub ?? p?.userId ?? p?.phone ?? 'unknown'}`
}

function readDraft() {
  try {
    const raw = localStorage.getItem(KEY)
    const val = raw ? JSON.parse(raw) : null
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return { texts: val.texts && typeof val.texts === 'object' ? val.texts : {} }
    }
  } catch {
    /* приватный режим / битый JSON — начинаем с чистого стейта */
  }
  return { texts: {} }
}

function writeDraft(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* квота: черновик не обновится, но память и сервер уже держат результат */
  }
}

function notify() {
  try {
    window.dispatchEvent(new Event(EVENT))
  } catch {
    /* SSR / нет window */
  }
}

export function readState() {
  const who = owner()
  if (!mem || mem.owner !== who) {
    mem = { owner: who, state: readDraft() }
    // Неотправленное прежнего ученика под новым токеном не уходит.
    queue = null
  }
  return mem.state
}

/** Только для тестов: модульная память переживает localStorage.clear(). */
export function resetReadingMemory() {
  mem = null
  queue = null
  sending = null
}

// Ответ сервера → память. Слияние, а не замена: ответ на раннюю дельту не
// знает о поздней, ещё летящей, и не должен её откатывать.
function adopt(who, serverState) {
  if (!serverState || !mem || mem.owner !== who) return
  const next = mergeReadingState(serverState, mem.state)
  mem = { owner: who, state: next }
  writeDraft(next)
  notify()
}

async function postDelta(token, who, delta) {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ module: 'reading', state: delta }),
    })
    if (!res.ok) return false
    const data = await res.json()
    adopt(who, data?.state)
    return true
  } catch (e) {
    console.warn('[reading] не удалось отправить прогресс', e)
    return false
  }
}

// Отправляет очередь, пока она не опустеет или не случится сбой. Сбой не
// повторяем в цикле: дельта возвращается в очередь и уйдёт со следующей
// отметкой или с flushReading().
function pump() {
  if (sending) return sending
  sending = (async () => {
    let ok = true
    while (queue && ok) {
      const token = loadToken()
      const who = mem?.owner
      if (!token || !who || who === 'guest' || who !== owner()) {
        queue = null
        break
      }
      const delta = queue
      queue = null
      ok = await postDelta(token, who, delta)
      if (!ok && mem?.owner === who) queue = queue ? mergeReadingState(delta, queue) : delta
    }
    return ok
  })().finally(() => {
    sending = null
  })
  return sending
}

function enqueue(delta) {
  queue = queue ? mergeReadingState(queue, delta) : delta
  pump()
}

function commit(delta) {
  readState()
  const next = mergeReadingState(mem.state, delta)
  mem = { owner: mem.owner, state: next }
  writeDraft(next)
  notify()
  if (mem.owner !== 'guest') enqueue(delta)
}

async function fetchServerState() {
  const token = loadToken()
  if (!token) return null
  try {
    const res = await fetch(`${ENDPOINT}?module=reading`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const data = await res.json()
    const s = data?.state?.reading
    return s && typeof s === 'object' ? s : { texts: {} }
  } catch (e) {
    console.warn('[reading] не удалось получить прогресс', e)
    return null
  }
}

export function textState(textId) {
  return readState().texts[textId] || null
}

/**
 * Результат упражнения. best-of, как в прототипе (:1004): пересдача не может
 * ухудшить сохранённое — иначе ученик боялся бы повторять задания.
 * Показ ответа сюда не приходит вовсе: в прототипе он считался «visual only».
 */
export function markExercise(textId, index, score, total) {
  if (!textId) return
  const prev = textState(textId)?.ex?.[index]
  if (prev && prev.score >= score) return // ничего не улучшилось — не пишем и не будим слушателей
  commit({ texts: { [textId]: { ex: { [index]: { score, total } } } } })
}

/** Отметка «дошёл до экрана результата». Идемпотентна. */
export function markTextDone(textId) {
  if (!textId) return
  if (textState(textId)?.done) return
  commit({ texts: { [textId]: { ex: {}, done: true } } })
  // Текст — единица домашней работы, и закрывается он целиком: отчёт без
  // чисел, сервер понимает его как «пройден». Уровень выводится из id
  // (a1-sci-honey), поэтому отдельно его тащить не нужно.
  countUnitTowardsHomework('reading', String(textId).split('-')[0], textId)
}

/**
 * Подтянуть прогресс с сервера (открытие раздела). То, что есть в памяти или
 * черновике и чего нет на сервере (не долетело в прошлый раз), досылается.
 * false — гость или сервер недоступен: страница остаётся на черновике.
 */
export async function loadReadingFromServer() {
  readState()
  const who = mem.owner
  if (who === 'guest') return false
  const server = await fetchServerState()
  if (!server || !mem || mem.owner !== who) return false
  const missing = readingDelta(server, mem.state)
  adopt(who, server)
  if (missing) enqueue(missing)
  return true
}

/**
 * Для экрана итога: дождаться всех отправок и вернуть состояние С СЕРВЕРА.
 * { ok: false } — сервер не принял или не ответил; state тогда из памяти, и
 * экран показывает «Не сохранено». Гость — сразу память, { local: true }.
 */
export async function flushReading() {
  const state = readState()
  const who = mem.owner
  if (who === 'guest') return { ok: true, local: true, state }
  let ok = await pump()
  if (ok && queue) ok = await pump()
  if (!ok) ok = await pump() // одна повторная попытка — сбой мог быть разовым
  if (!ok || queue) return { ok: false, state: mem.state }
  const server = await fetchServerState()
  if (!server || !mem || mem.owner !== who) return { ok: false, state: readState() }
  adopt(who, server)
  return { ok: true, state: server }
}

/** Прогресс одного текста в процентах — тому же тексту нужен его объект данных. */
export function progressOf(text, state = readState()) {
  const saved = state.texts[text.id]
  return textScore(text, saved && saved.ex)
}

/**
 * Прогресс уровня: средний процент по всем его текстам. Требует загруженного
 * уровня — модуль прогресса намеренно не знает, где лежат данные.
 */
export function levelProgress(texts, state = readState()) {
  if (!Array.isArray(texts) || !texts.length) return 0
  let got = 0
  let total = 0
  for (const x of texts) {
    const sc = progressOf(x, state)
    got += sc.got
    total += sc.total
  }
  return total ? Math.round((got / total) * 100) : 0
}

/** Сколько текстов уровня дочитано до результата — подпись на карточке уровня. */
export function levelDoneCount(texts, state = readState()) {
  if (!Array.isArray(texts)) return 0
  return texts.filter((x) => state.texts[x.id] && state.texts[x.id].done).length
}
