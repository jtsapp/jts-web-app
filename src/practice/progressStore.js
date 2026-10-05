'use client'

// Общее хранилище прогресса разделов «Практики»: память + черновик в
// localStorage + сервер.
//
// Зачем (05.10.2026). Разделы читали прогресс прямо из localStorage, а его под
// входом забивает кэш каталогов (jts_catalog_*). Запись молча падала, и:
// - у «галочек» (грамматика, аудирование…) пройденное пропадало с экрана, хотя
//   сервер его объединял и помнил;
// - у «объектов» (воркбук, «Письмо»…) после перезагрузки hydratePractice не мог
//   записать серверное в полный localStorage, раздел поднимал старый черновик и
//   первым же действием отправлял его на сервер (replace) — прогресс стирался.
//
// Теперь раздел читает ПАМЯТЬ. Черновик в localStorage — чтобы гость пережил
// перезагрузку и чтобы видеть записи соседней вкладки; сервер — источник
// истины для вошедшего, его ответ попадает в память напрямую, минуя хранилище.
// Серверная семантика прежняя: union для «галочек», replace для объектов.

import { loadToken } from '../lib/session.js'
import { payloadOf } from '../lib/jwt.js'
import { normalizeDone } from '../lib/practiceContract.js'
// Только pushModule: тесты модулей прогресса мокают practiceSync одной этой
// функцией, а сам practiceSync зовёт сюда (adoptHydratedState) — цикл импорта
// безопасен, пока ни одна сторона не трогает другую на верхнем уровне модуля.
import { pushModule } from './practiceSync.js'

/** Чей прогресс в памяти: личность токена или гость. */
export function ownerOf(token) {
  if (!token) return 'guest'
  const p = payloadOf(token)
  return `user:${p?.sub ?? p?.userId ?? p?.phone ?? 'unknown'}`
}

function currentOwner() {
  return ownerOf(loadToken())
}

const stores = new Map() // module → внутренний API хранилища
// Последний ответ hydratePractice: { owner, state }. Нужен разделам, которые в
// этой загрузке ещё не открывали, — их хранилище создаётся позже ответа.
let snapshot = null

// Сброс памяти между тестами. Импортировать модуль в vitest.setup.js нельзя:
// тесты мокают practiceSync, и хранилище, загруженное из setup, держало бы
// настоящий pushModule вместо мока. Поэтому setup зовёт сбросы через глобал.
const resets = (globalThis.__jtsPracticeStores ??= new Set())
resets.add(() => {
  snapshot = null
  for (const s of stores.values()) s.reset()
})

/** «Галочки»: состояние — массив id, сервер хранит { done: [...] }. */
export const doneListOptions = {
  empty: () => [],
  normalize: (raw) => normalizeDone(Array.isArray(raw) ? raw : raw?.done),
  merge: (server, local) => normalizeDone([...server, ...local]),
}

/**
 * @param module    имя модуля practice_state
 * @param key       ключ черновика в localStorage
 * @param event     событие раздела — по нему перерисовываются каталоги
 * @param empty     () => пустое состояние
 * @param normalize (сырое из черновика или с сервера) => состояние
 * @param merge     (server, local) => состояние; есть — сведение объединением,
 *                  нет — побеждает сервер, если в этой загрузке не было действий
 */
export function createProgressStore({ module, key, event, empty, normalize, merge = null }) {
  // mem: { owner, state, raw, draftOk } — raw: строка, которую мы последней
  // видели/писали в черновике; draftOk: последняя наша запись прошла.
  let mem = null
  // Были ли действия в этой загрузке, ещё не сведённые с ответом сервера.
  let dirty = false

  function readRaw() {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  function parse(raw) {
    try {
      return normalize(raw ? JSON.parse(raw) : null)
    } catch {
      return empty()
    }
  }

  function persist(state) {
    const raw = JSON.stringify(state)
    try {
      localStorage.setItem(key, raw)
      mem.raw = raw
      mem.draftOk = true
    } catch {
      // Квота: черновик устарел, главная теперь память (см. read).
      mem.draftOk = false
    }
  }

  function notify() {
    try {
      window.dispatchEvent(new Event(event))
    } catch {
      /* SSR / нет window */
    }
  }

  // Сведение ответа сервера с памятью. quiet — без события: при первом read()
  // это зовётся из рендера, а событие будит setState соседних компонентов.
  function reconcile(serverRaw, { quiet = false } = {}) {
    const server = normalize(serverRaw)
    let next
    let send = false
    if (merge) {
      next = merge(server, mem.state)
      send = JSON.stringify(next) !== JSON.stringify(server)
    } else if (dirty) {
      next = mem.state
      send = true
    } else {
      next = server
    }
    mem.state = next
    dirty = false
    persist(next)
    if (!quiet) notify()
    if (send && mem.owner !== 'guest') pushModule(module, next)
  }

  function load(who) {
    const raw = readRaw()
    mem = { owner: who, state: parse(raw), raw, draftOk: true }
    dirty = false
    if (snapshot && snapshot.owner === who && snapshot.state && module in snapshot.state) {
      reconcile(snapshot.state[module], { quiet: true })
    }
  }

  function read() {
    const who = currentOwner()
    if (!mem || mem.owner !== who) load(who)
    else if (mem.draftOk) {
      // Черновик поменял кто-то другой — соседняя вкладка или уборка при
      // выходе. Пока наши записи туда проходят, он актуален; когда нет —
      // актуальна память, а черновик устарел.
      const raw = readRaw()
      if (raw !== mem.raw) mem = { owner: who, state: parse(raw), raw, draftOk: true }
    }
    return mem.state
  }

  function write(next, { sync = true } = {}) {
    read()
    mem.state = next
    persist(next)
    notify()
    if (sync) {
      if (mem.owner !== 'guest') dirty = true
      // Гостю pushModule сам ничего не шлёт — зовём его всегда, как раньше
      // звали модули: в одном месте решается, кому синк положен.
      pushModule(module, next)
    }
  }

  function adopt(serverRaw) {
    const who = currentOwner()
    if (!mem || mem.owner !== who) load(who) // снимок уже выставлен — load сведёт
    else reconcile(serverRaw, { quiet: true })
    notify()
  }

  function reset() {
    mem = null
    dirty = false
  }

  stores.set(module, { adopt, reset })
  return { read, write }
}

/**
 * Ответ hydratePractice → память разделов. Возвращает модули, которые взяли
 * хранилища, — их черновики practiceSync уже не пишет сам.
 */
export function adoptHydratedState(serverState, owner = currentOwner()) {
  if (!serverState || typeof serverState !== 'object') return []
  snapshot = { owner, state: serverState }
  const handled = []
  // Чужой ответ (токен сменился, пока шёл запрос) в память не кладём: снимок
  // по владельцу и так не применится, а живые хранилища смотрят на текущего.
  if (owner !== currentOwner()) return handled
  for (const [module, store] of stores) {
    if (Object.prototype.hasOwnProperty.call(serverState, module)) {
      store.adopt(serverState[module])
      handled.push(module)
    }
  }
  return handled
}

/** Выход/вход: забыть снимок и память всех разделов. */
export function resetPracticeStores() {
  for (const fn of resets) fn()
}
