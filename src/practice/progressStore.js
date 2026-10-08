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
//
// Разделы-объекты (ревью 08.10.2026, #78). Сервер хранит их заменой, и:
// - запись до ответа сервера уходила целиком и стирала прогресс с другого
//   устройства — теперь до снимка сервера она не уходит вовсе;
// - сведение «без действий — побеждает сервер» забывало то, что не долетело в
//   прошлую загрузку, — теперь правки ученика копятся патчем (statePatch.js),
//   переживают перезагрузку и кладутся поверх серверного, пока сервер не
//   подтвердит приём.

import { loadToken } from '../lib/session.js'
import { payloadOf } from '../lib/jwt.js'
import { normalizeDone } from '../lib/practiceContract.js'
import { applyPatch, composePatch, diffState, isEmptyPatch, isValidPatch, subtractPatch } from './statePatch.js'
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
  // Сервер сам объединяет присланное с хранимым: раннюю запись ему не
  // страшно получить, и ждать снимка незачем.
  serverUnion: true,
}

function snapshotFor(who) {
  return !!snapshot && snapshot.owner === who
}

// Неотправленные правки разделов-объектов — чтобы пережили перезагрузку:
// { owner, modules: { <модуль>: патч } }. Владелец один: вход и выход чистят
// ключ (clearLocalPractice), а чужой патч при чтении не берётся. Ключ общий у
// вкладок, поэтому запись — наложение своей правки на сохранённое, а
// подтверждение — вычитание отправленного: иначе вкладки стирали бы правки
// друг друга.
export const UNSYNCED_KEY = 'jts_practice_unsynced'

function readUnsyncedAll() {
  try {
    const all = JSON.parse(localStorage.getItem(UNSYNCED_KEY) || 'null')
    return all && typeof all === 'object' && all.modules && typeof all.modules === 'object' ? all : null
  } catch {
    return null
  }
}

function readUnsynced(owner, module) {
  const all = readUnsyncedAll()
  const p = all && all.owner === owner ? all.modules[module] : null
  // Битая или чужого формата запись не должна ронять раздел при каждой загрузке.
  return p && isValidPatch(p) ? p : null
}

// change(сохранённое) → новое сохранённое.
function updateUnsynced(owner, module, change) {
  if (owner === 'guest') return
  let all = readUnsyncedAll()
  if (!all || all.owner !== owner) all = { owner, modules: {} }
  const cur = all.modules[module]
  const patch = change(cur && isValidPatch(cur) ? cur : null)
  if (isEmptyPatch(patch)) delete all.modules[module]
  else all.modules[module] = patch
  try {
    if (Object.keys(all.modules).length) localStorage.setItem(UNSYNCED_KEY, JSON.stringify(all))
    else localStorage.removeItem(UNSYNCED_KEY)
  } catch {
    /* квота: патч живёт в памяти до конца загрузки */
  }
}

/**
 * @param module    имя модуля practice_state
 * @param key       ключ черновика в localStorage
 * @param event     событие раздела — по нему перерисовываются каталоги
 * @param empty     () => пустое состояние
 * @param normalize (сырое из черновика или с сервера) => состояние
 * @param merge     (server, local) => состояние; есть — сведение объединением,
 *                  нет — серверное плюс неподтверждённые правки ученика (патч)
 * @param serverUnion сервер сам объединяет присланное (doneListOptions); нет —
 *                  он хранит заменой, и до его снимка запись не отправляется
 * @param settle    (server, next) => состояние; после наложения патча — для
 *                  значений «лучший результат»: правка, посчитанная от
 *                  устаревшего черновика, не должна понижать серверное
 * @param atomic    разделы, чьи значения патч берёт целиком (statePatch.js)
 */
export function createProgressStore({ module, key, event, empty, normalize, merge = null, serverUnion = false, settle = null, atomic = [] }) {
  // mem: { owner, state, raw, draftOk } — raw: строка, которую мы последней
  // видели/писали в черновике; draftOk: последняя наша запись прошла.
  let mem = null
  // Были ли действия, отложенные до ответа сервера.
  let dirty = false
  // Правки ученика, которых сервер ещё не подтвердил (только без merge).
  let patch = null

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
    } else if (!isEmptyPatch(patch)) {
      // Серверное плюс правки ученика: раньше при действиях до ответа здесь
      // побеждала память целиком и стирала чужое серверное, а без действий —
      // сервер, и не долетевшее в прошлую загрузку пропадало (#78).
      next = normalize(applyPatch(server, patch))
      if (settle) next = normalize(settle(server, next))
      send = JSON.stringify(next) !== JSON.stringify(server)
      // Патч ничего не меняет поверх серверного: сервер уже принял эти правки
      // (ответ мог потеряться — закрытая вкладка, 524) или лучший результат
      // их перекрыл. Считаем подтверждёнными, иначе патч жил бы вечно и
      // однажды откатил бы правку с другого устройства.
      if (!send) {
        const done = patch
        patch = null
        updateUnsynced(mem.owner, module, (stored) => subtractPatch(stored, done))
      }
    } else {
      next = server
    }
    mem.state = next
    dirty = false
    persist(next)
    if (!quiet) notify()
    if (send && mem.owner !== 'guest') push(next)
  }

  // Сервер ответил «принял» — отправленные правки больше не нужны. Вычитаем
  // ровно их: то, что ученик поменял после отправки, и правки соседней
  // вкладки в общем ключе остаются.
  function acked(who, sent) {
    // Ответ пришёл уже другому ученику (выход и вход, пока летел запрос):
    // его неподтверждённое не трогаем.
    if (currentOwner() !== who) return
    if (mem && mem.owner === who) patch = subtractPatch(patch, sent)
    updateUnsynced(who, module, (stored) => subtractPatch(stored, sent))
  }

  function push(next) {
    if (merge || isEmptyPatch(patch)) pushModule(module, next)
    else {
      const who = mem.owner
      const sent = patch
      pushModule(module, next, () => acked(who, sent))
    }
  }

  function load(who) {
    const raw = readRaw()
    mem = { owner: who, state: parse(raw), raw, draftOk: true }
    dirty = false
    patch = !merge && who !== 'guest' ? readUnsynced(who, module) : null
    if (snapshotFor(who)) {
      if (snapshot.state && module in snapshot.state) reconcile(snapshot.state[module], { quiet: true })
      // Раздела на сервере нет — стирать нечего, наше и есть всё.
      else if (!isEmptyPatch(patch)) push(mem.state)
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
    const prev = mem.state
    mem.state = next
    persist(next)
    notify()
    if (!sync) return
    // Гостю pushModule сам ничего не шлёт — зовём его всегда, как раньше
    // звали модули: в одном месте решается, кому синк положен.
    if (mem.owner === 'guest') {
      pushModule(module, next)
      return
    }
    if (!merge) {
      const delta = diffState(prev, next, { atomic })
      if (!isEmptyPatch(delta)) {
        patch = composePatch(patch, delta)
        updateUnsynced(mem.owner, module, (stored) => composePatch(stored, delta))
      }
    }
    // Сервер хранит раздел заменой: запись раньше его снимка стёрла бы то,
    // чего в черновике этого устройства нет. Уйдёт сведённой (reconcile).
    if (!serverUnion && !snapshotFor(mem.owner)) {
      dirty = true
      return
    }
    push(next)
  }

  function adopt(serverRaw) {
    const who = currentOwner()
    if (!mem || mem.owner !== who) load(who) // снимок уже выставлен — load сведёт
    else reconcile(serverRaw, { quiet: true })
    notify()
  }

  // Снимок пришёл, а раздела в нём нет (строки на сервере ещё не было):
  // отложенное уходит как есть — стирать на сервере нечего.
  function adoptAbsent() {
    const who = currentOwner()
    // Раздел в этой загрузке не открывали: load сам посмотрит в снимок и
    // дошлёт неподтверждённое из прошлой загрузки.
    if (!mem || mem.owner !== who) {
      load(who)
      return
    }
    if (dirty || !isEmptyPatch(patch)) {
      dirty = false
      push(mem.state)
    }
  }

  function reset() {
    mem = null
    dirty = false
    patch = null
  }

  stores.set(module, { adopt, adoptAbsent, reset })
  return { read, write }
}

/**
 * Ответ hydratePractice → память разделов. Возвращает модули, которые взяли
 * хранилища, — их черновики practiceSync уже не пишет сам.
 */
export function adoptHydratedState(serverState, owner = currentOwner()) {
  if (!serverState || typeof serverState !== 'object') return []
  const handled = []
  // Чужой ответ (токен сменился, пока шёл запрос) не берём вовсе: и в память,
  // и в снимок — поздний ответ прежнего ученика затёр бы снимок нового, и его
  // разделы-объекты ждали бы снимка до конца загрузки.
  if (owner !== currentOwner()) return handled
  snapshot = { owner, state: serverState }
  for (const [module, store] of stores) {
    if (Object.prototype.hasOwnProperty.call(serverState, module)) {
      store.adopt(serverState[module])
      handled.push(module)
    } else {
      store.adoptAbsent()
    }
  }
  return handled
}

/** Пришёл ли уже ответ сервера для текущего ученика (в этой загрузке). */
export function hasServerSnapshot() {
  return !!snapshot && snapshot.owner === currentOwner()
}

/** Выход/вход: забыть снимок и память всех разделов. */
export function resetPracticeStores() {
  for (const fn of resets) fn()
}
