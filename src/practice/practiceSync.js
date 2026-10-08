'use client'

// Тонкие обёртки клиентского синка практики: fetch + localStorage + window.
// Вся чистая логика — в practiceSyncCore.js (там же тесты). Синк работает только
// для залогиненных: без токена pushModule/hydrate — no-op (гость на сервер не
// пишет). Best-effort: сетевые осечки логируются, localStorage уже записан.

import { loadToken } from '../lib/session.js'
import { applyHydratedState, serializeForPush } from './practiceSyncCore.js'
import { adoptHydratedState, ownerOf, resetPracticeStores, UNSYNCED_KEY } from './progressStore.js'
import { VOCAB_KEY, GRAMMAR_KEY, LISTENING_KEY, SHADOWING_KEY, SITUATIONS_KEY, WORKBOOKS_KEY, WORKBOOK_KEY, WRITING_KEY, READING_KEY, WORDS_KEY, VERBS_KEY, LISTENCHOOSE_KEY, LISTENCHOOSE_RUN_KEY, VOCAB_LEARNED_KEY, VOCAB_MISSES_KEY } from './practiceKeys.js'
import { WRITING_ARTIFACT_KEYS } from './writing/writingStore.js'

export function isSyncEnabled() {
  return !!loadToken()
}

// Debounce на модуль: словарь пишет SRS по ходу задания, грамматика/аудирование —
// по факту прохождения; частые записи схлопываем в один POST.
export const PUSH_DELAY_MS = 600
// Паузы перед повтором неудачной отправки. Дальше не долбим: разделы общего
// хранилища (progressStore.js) помнят неподтверждённое сами и сведут его со
// следующей загрузкой; у прочих (vocab) остаётся черновик устройства.
export const RETRY_MS = [3_000, 10_000, 30_000, 60_000]
// Паузы перед повтором неудачной загрузки прогресса: без ответа сервера
// разделы-объекты не отправляются вовсе (см. progressStore.js).
export const HYDRATE_RETRY_MS = [5_000, 20_000, 60_000]
// Отправки идут по одной на раздел, поэтому зависший запрос (мобильная сеть
// держит соединение минутами) остановил бы раздел целиком — и проверку права
// на сессию, которая ждёт flushModule. Обрываем его и повторяем.
export const PUSH_TIMEOUT_MS = 25_000
// Дольше этого вызывающий flushModule не ждёт: гейт и так работает fail-open.
export const FLUSH_WAIT_MS = 10_000
const timers = {}
// модуль → { state, onAck, owner, token, seq, epoch } — ещё не улетевшее
const pending = {}
const inFlight = {} // модуль → промис отправки (своей или ждущей в очереди)
const failures = {} // модуль → неудачных попыток подряд
// Номер последней записи раздела. Отправка старше него не уходит: сервер
// хранит разделы-объекты заменой, и запоздавший повтор старого состояния
// откатил бы новое, уже принятое (независимое ревью PR, #78).
const latest = {}
// Выход и вход меняют эпоху: отправки и повторы прошлой сессии не уходят,
// даже если в аккаунт вернулся тот же ученик.
let epoch = 0
let hydrateTimer = null

// Тот же ученик? Токен меняется и по refresh, поэтому сверяем личность из
// него, а строку — только когда личности в токене нет.
function sameOwner(entry, token) {
  if (!token) return false
  const who = ownerOf(token)
  return who === entry.owner && (who !== 'user:unknown' || token === entry.token)
}

const stale = (module, entry) => entry.epoch !== epoch || entry.seq < (latest[module] || 0)

// Повтор имеет смысл при сбое сети и сервера; 4xx получит тот же отказ.
const retriable = (status) => status >= 500 || status === 408 || status === 429

function post(module, entry) {
  const token = loadToken()
  // Пока отправка ждала, ученик сменился или появилась запись новее: старое
  // не уходит.
  if (stale(module, entry) || !sameOwner(entry, token)) return Promise.resolve(false)
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), PUSH_TIMEOUT_MS) : null
  return fetch('/api/practice/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ module, state: entry.state }),
    signal: ctrl?.signal,
  })
    .then((res) => {
      // Раньше ответ не смотрели вовсе: 500 считался успехом, и правка
      // терялась молча (ревью 08.10.2026, #78).
      if (res.ok) {
        delete failures[module]
        // Ответ прошлой сессии (выход, пока летел запрос) правки нового
        // ученика не подтверждает.
        if (entry.epoch === epoch) entry.onAck?.()
        return true
      }
      console.warn('[practice.sync] push rejected', module, res.status)
      if (retriable(res.status)) retry(module, entry)
      return false
    })
    .catch((e) => {
      console.warn('[practice.sync] push failed', module, e)
      retry(module, entry)
      return false
    })
    .finally(() => clearTimeout(timer))
}

// По одной отправке на раздел: следующая ждёт предыдущую. Иначе старое
// состояние, отправленное раньше, могло доехать до сервера позже нового и
// заменить его.
function send(module, entry) {
  const prev = inFlight[module]
  const run = () => post(module, entry)
  // Очереди нет — уходим сразу: flushModule ждёт, что POST уже улетел.
  const p = (prev ? prev.catch(() => {}).then(run) : run())
    .finally(() => {
      if (inFlight[module] === p) delete inFlight[module]
    })
  inFlight[module] = p
  return p
}

function schedule(module, delay) {
  clearTimeout(timers[module])
  timers[module] = setTimeout(() => {
    delete timers[module]
    const entry = pending[module]
    delete pending[module]
    if (entry) send(module, entry)
  }, delay)
}

function retry(module, entry) {
  // Есть запись новее — она и понесёт всё состояние.
  if (pending[module] || stale(module, entry)) return
  const n = (failures[module] || 0) + 1
  if (n > RETRY_MS.length) {
    delete failures[module]
    return
  }
  failures[module] = n
  pending[module] = entry
  schedule(module, RETRY_MS[n - 1])
}

/**
 * onAck — позовётся, когда сервер ПРИНЯЛ именно это состояние: хранилище по
 * нему забывает подтверждённые правки.
 */
export function pushModule(module, raw, onAck) {
  const token = loadToken()
  if (!token) return
  latest[module] = (latest[module] || 0) + 1
  pending[module] = {
    state: serializeForPush(module, raw),
    onAck,
    owner: ownerOf(token),
    token,
    seq: latest[module],
    epoch,
  }
  delete failures[module]
  schedule(module, PUSH_DELAY_MS)
}

// Досылает отложенную отметку немедленно и ждёт, пока сервер её ПРИМЕТ. Нужен
// там, где сервер сразу после этого считает тот же прогресс: право на новую
// сессию (/api/practice/entitlement) меряется по строкам в БД, и с debounce в
// 600 мс свежая проверка возвращала бы прежнее completed — лимит демо-доступа
// не удерживал бы ровно ту сессию, которая его добила.
// Best-effort, как и сам push: сетевую осечку send() уже проглотил, ждать
// нечего — гейт в этом случае работает fail-open (см. usePracticeEntitlement).
export async function flushModule(module) {
  if (timers[module]) {
    clearTimeout(timers[module])
    delete timers[module]
    const entry = pending[module]
    delete pending[module]
    if (entry) send(module, entry)
  }
  const sent = inFlight[module]
  if (!sent) return
  let wait
  await Promise.race([sent, new Promise((resolve) => { wait = setTimeout(resolve, FLUSH_WAIT_MS) })])
  clearTimeout(wait)
}

// Прогружает серверный прогресс в локальные ключи. Перезаписываем ТОЛЬКО при
// успешном ответе: сетевая осечка не должна стирать локальный кэш. Успешная
// гидратация == «сервер — источник истины»: пустой стейт модуля затирает
// локальный (изоляция аккаунтов + «гостевой прогресс не переносится»).
//
// Сбой повторяется с паузой: без ответа сервера разделы-объекты не
// отправляются (их запись заменила бы серверное), и прогресс этой загрузки
// иначе не дошёл бы до сервера вовсе.
export async function hydratePractice(token, attempt = 0) {
  if (!token) return
  const myEpoch = epoch
  const who = ownerOf(token)
  clearTimeout(hydrateTimer)
  hydrateTimer = null
  let data
  try {
    const res = await fetch('/api/practice/state', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('bad status ' + res.status)
    data = await res.json()
  } catch (e) {
    console.warn('[practice.sync] hydrate failed', e)
    if (attempt < HYDRATE_RETRY_MS.length && myEpoch === epoch) {
      hydrateTimer = setTimeout(() => {
        hydrateTimer = null
        const now = loadToken()
        if (myEpoch === epoch && now && ownerOf(now) === who) hydratePractice(now, attempt + 1)
      }, HYDRATE_RETRY_MS[attempt])
    }
    return
  }
  if (!data?.state) return
  // Ответ пришёл, а ученик уже другой (выход и вход, пока шёл запрос): чужой
  // прогресс не кладём ни в память, ни в черновики.
  const now = loadToken()
  if (myEpoch !== epoch || !now || ownerOf(now) !== who) return
  // Разделы с хранилищем (progressStore.js) берут ответ в ПАМЯТЬ сами: в
  // забитый кэшем каталогов localStorage он не лёг бы, и раздел поднял бы
  // устаревший черновик. Их черновики пишет хранилище, здесь — только прочие.
  const handled = adoptHydratedState(data.state, who)
  const rest = { ...data.state }
  for (const m of handled) delete rest[m]
  applyHydratedState(rest, {
    getItem: (k) => {
      try { return localStorage.getItem(k) } catch { return null }
    },
    setItem: (k, v) => {
      try { localStorage.setItem(k, v) } catch {}
    },
    dispatch: (name) => {
      try { window.dispatchEvent(new Event(name)) } catch {}
    },
  })
}

export function clearLocalPractice() {
  // Артефакты письма (черновики, журнал, свои слова) не синкаются, но чистятся
  // вместе с прогрессом: на общей машине черновики — это тексты ученика, и они
  // не должны достаться следующему аккаунту. «Слова в картинках» сюда сначала
  // забыли — найденные слова переезжали к следующему ученику.
  for (const k of [VOCAB_KEY, GRAMMAR_KEY, LISTENING_KEY, SHADOWING_KEY, SITUATIONS_KEY, WORKBOOKS_KEY, WORKBOOK_KEY, WRITING_KEY, READING_KEY, WORDS_KEY, VERBS_KEY, LISTENCHOOSE_KEY, LISTENCHOOSE_RUN_KEY, VOCAB_LEARNED_KEY, VOCAB_MISSES_KEY, UNSYNCED_KEY, ...WRITING_ARTIFACT_KEYS]) {
    try { localStorage.removeItem(k) } catch {}
  }
  // Отложенные и повторные отправки прежнего ученика — туда же: через 600 мс
  // они ушли бы уже под токеном следующего. Улетевшие и ждущие в очереди
  // отсекает новая эпоха.
  epoch += 1
  for (const m of Object.keys(timers)) clearTimeout(timers[m])
  for (const o of [timers, pending, failures]) for (const m of Object.keys(o)) delete o[m]
  clearTimeout(hydrateTimer)
  hydrateTimer = null
  // Память разделов и снимок сервера — туда же: иначе при забитом хранилище
  // (память там главная) следующий ученик увидел бы прогресс предыдущего.
  resetPracticeStores()
}
