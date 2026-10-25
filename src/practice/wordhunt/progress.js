'use client'

// Прогресс Word Hunt: собранные слова («звёзды»), шаги кроссворда и пройденные
// сложности поиска по планетам, «кометы» (слова, где понадобилась подсказка),
// награды, дни игры, миры, счётчики. Форма и ключ — как у прототипа
// (jts_lexiverse_v1), только без его localStorage.
//
// Хранение — общее хранилище «Практики» (память + черновик + сервер, replace,
// см. progressStore.js) со сведением merge в момент снимка сервера: слово,
// собранное на телефоне, и пройденный там шаг не «распроходятся» черновиком
// ноутбука. Недорешённые сетки (wip) в синк не идут — это устройство
// (WORDHUNT_WIP_KEY): недописанные буквы на другое устройство не везём.
//
// Кометы сводятся объединением: снятая на другом устройстве комета может
// вернуться из старого черновика этого. Отметки «когда снята» у прототипа нет,
// а лишний раз повторить слово безопаснее, чем потерять слово на повторение.
//
// Домашней работой раздел не отчитывается: area 'wordhunt' бэкенду неизвестна.

import { WORDHUNT_KEY as KEY, WORDHUNT_PROGRESS_EVENT as EVENT, WORDHUNT_WIP_KEY as WIP_KEY } from '../practiceKeys.js'
import { createProgressStore } from '../progressStore.js'

const DIFFS = ['easy', 'medium', 'hard']
const DAY = /^\d{4}-\d{1,2}-\d{1,2}$/
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x)
const okKey = (k, max) => typeof k === 'string' && k.length > 0 && k.length <= max
const count = (x) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.floor(x) : 0)
// Значение метки — время (Date.now()); у старой или чужой копии могло быть 1/true — это тоже «есть».
const stamp = (x) => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.round(x) : x === true ? 1 : 0)

const emptyState = () => ({ stars: {}, pl: {}, comets: {}, ach: {}, days: {}, gals: {}, games: 0, cleared: 0, pure: 0 })

function stamps(raw, max) {
  const out = {}
  if (!isObj(raw)) return out
  for (const [k, v] of Object.entries(raw)) {
    const s = stamp(v)
    if (okKey(k, max) && s) out[k] = s
  }
  return out
}

function planet(raw) {
  const x = [0, 1, 2].map((i) => (Array.isArray(raw.x) && raw.x[i] ? 1 : 0))
  const h = {}
  if (isObj(raw.h)) {
    for (const d of DIFFS) {
      const v = raw.h[d]
      if (!v) continue
      const best = isObj(v) ? count(v.best) : 0
      h[d] = best ? { best } : {}
    }
  }
  return { x, h }
}

// Стейт мог приехать с сервера, от старой версии или быть побитым: берём только то, что похоже на прогресс
// известной формы. wip и lang прототипа сюда не попадают (устройство и язык приложения).
export function normalize(raw) {
  const out = emptyState()
  if (!isObj(raw)) return out
  out.stars = stamps(raw.stars, 160)
  out.comets = stamps(raw.comets, 160)
  out.ach = stamps(raw.ach, 40)
  out.gals = stamps(raw.gals, 40)
  if (isObj(raw.days)) for (const [k, v] of Object.entries(raw.days)) if (DAY.test(k) && v) out.days[k] = 1
  if (isObj(raw.pl)) for (const [pid, r] of Object.entries(raw.pl)) if (okKey(pid, 160) && isObj(r)) out.pl[pid] = planet(r)
  out.games = count(raw.games)
  out.cleared = count(raw.cleared)
  out.pure = count(raw.pure)
  if (okKey(raw.last, 160)) out.last = raw.last
  if (raw.optTimed === true) out.optTimed = true
  if (raw.cleanHunt) out.cleanHunt = 1
  return out
}

const freshness = (s) => Math.max(0, ...[s.stars, s.comets, s.ach].flatMap((o) => Object.values(o)))

function unite(a, b, pick) {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? pick(out[k], v) : v
  return out
}

/**
 * Сведение двух копий: собранное слово, шаг кроссворда, сложность поиска, награда — где угодно есть, там и
 * есть; рекорд времени — лучший; счётчики — максимум. «Последний урок» и «на время» — у копии со свежей
 * игрой (при равенстве — у второй, локальной).
 */
export function mergeWordHunt(a, b) {
  a = normalize(a)
  b = normalize(b)
  const out = {
    stars: unite(a.stars, b.stars, Math.min),
    comets: unite(a.comets, b.comets, Math.max),
    ach: unite(a.ach, b.ach, Math.min),
    days: { ...a.days, ...b.days },
    gals: unite(a.gals, b.gals, Math.min),
    pl: {},
    games: Math.max(a.games, b.games),
    cleared: Math.max(a.cleared, b.cleared),
    pure: Math.max(a.pure, b.pure),
  }
  for (const pid of new Set([...Object.keys(a.pl), ...Object.keys(b.pl)])) {
    const x = a.pl[pid]
    const y = b.pl[pid]
    if (!x || !y) {
      out.pl[pid] = x || y
      continue
    }
    const h = {}
    for (const d of DIFFS) {
      if (!x.h[d] && !y.h[d]) continue
      const bests = [x.h[d]?.best, y.h[d]?.best].filter(Boolean)
      h[d] = bests.length ? { best: Math.min(...bests) } : {}
    }
    out.pl[pid] = { x: x.x.map((v, i) => (v || y.x[i] ? 1 : 0)), h }
  }
  if (a.cleanHunt || b.cleanHunt) out.cleanHunt = 1
  const fresh = freshness(a) > freshness(b) ? a : b
  const other = fresh === a ? b : a
  const last = fresh.last || other.last
  if (last) out.last = last
  if (fresh.optTimed) out.optTimed = true
  // Порядок полей — как у normalize: хранилище сравнивает сведённое с серверным строкой и при расхождении
  // отправляет стейт заново; другой порядок ключей слал бы весь прогресс на каждом входе.
  return normalize(out)
}

const store = createProgressStore({
  module: 'wordhunt',
  key: KEY,
  event: EVENT,
  empty: emptyState,
  normalize,
  merge: (server, local) => mergeWordHunt(server, local),
})

/** Копия: движок её меняет на месте. */
export function readWordHunt() {
  return normalize(JSON.parse(JSON.stringify(store.read())))
}

export function writeWordHunt(state) {
  store.write(normalize(state))
}

// Недорешённые сетки: { <пид:шаг | comet>: { seed, keys, v, r, h } } — как wip прототипа.
function normWip(raw) {
  const out = {}
  if (!isObj(raw)) return out
  for (const [k, w] of Object.entries(raw)) {
    if (okKey(k, 200) && isObj(w) && typeof w.seed === 'string' && typeof w.v === 'string' && typeof w.r === 'string' && Array.isArray(w.h)) {
      out[k] = { seed: w.seed, keys: typeof w.keys === 'string' ? w.keys : '', v: w.v, r: w.r, h: w.h.map((n) => (Number.isInteger(n) ? n : 0)) }
    }
  }
  return out
}

export function readWip() {
  try {
    return normWip(JSON.parse(localStorage.getItem(WIP_KEY) || 'null'))
  } catch {
    return {}
  }
}

export function writeWip(wip) {
  try {
    const w = normWip(wip)
    if (Object.keys(w).length) localStorage.setItem(WIP_KEY, JSON.stringify(w))
    else localStorage.removeItem(WIP_KEY)
  } catch {
    /* квота: недорешённая сетка не переживёт перезагрузку, прогресс не страдает */
  }
}
