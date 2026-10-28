'use client'

// Отметки «тур экрана пройден»: у аккаунта — на сервере (/api/profile/tours, таблица tour_seen),
// localStorage — кэш. У гостя — только браузер, как было.
//
// Почему не хватало браузера (жалоба «тур идёт по несколько раз», 28.10.2026): ключ отметки строился из
// id профиля нашей базы, а пока у ученика нет строки в learner (новый ученик до теста уровня, первый
// вход до записи уровня) — из device-id. Строка появлялась, ключ менялся с device-id на user-id, и все
// туры выходили снова. Вторая дыра — гонка входа: профиль доезжал после того, как экран решил про тур,
// отметка ложилась под другой ключ. Третья — другой браузер или телефон. Теперь владелец ключа —
// аккаунт из токена (известен сразу), а решать о туре App даёт только после ответа сервера
// (tourMarksReady).
//
// Отметки прежней схемы засчитываются и переезжают на сервер при первой же проверке тура: и под
// user-id, и под device-id этого браузера. Последнее значит, что второй аккаунт на том же браузере,
// входивший до этой правки без профиля, тоже считается видевшим тур, — так он и жил до неё.

import { useSyncExternalStore } from 'react'
import { getDeviceId } from './identity.js'
import { parseTourKey, tourKeyForOwner } from './tourName.js'

// Сервер молчит дольше — туры решаются по браузеру: лучше лишний тур, чем экран без тура навсегда.
const LOAD_TIMEOUT_MS = 5000

// status: idle — аккаунта нет; loading — отметки едут; ready — сервер ответил; failed — нет базы,
// сети или ответа (тогда только браузер, на сервер ничего не пишем).
let snap = { account: null, status: 'idle' }
let token = null
let server = new Set()
// Ответ, доехавший после смены аккаунта, отбрасывается по поколению.
let generation = 0
const listeners = new Set()

function update(next) {
  snap = { ...snap, ...next }
  for (const fn of listeners) fn()
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getTourMarks() {
  return snap
}

export function useTourMarks() {
  return useSyncExternalStore(subscribe, getTourMarks, getTourMarks)
}

/**
 * Можно ли решать о туре: гостю — всегда, аккаунту — когда его отметки уже пришли (или не придут).
 * Аккаунт здесь — из токена в рендере, а не из стора: эффект, запускающий загрузку, идёт ПОСЛЕ
 * эффектов экранов, и в этом зазоре экран решил бы про тур без серверных отметок.
 */
export function tourMarksReady(marks, account) {
  return !account || (marks.account === account && marks.status !== 'loading')
}

/** App зовёт на каждую смену токена. Тот же аккаунт со свежим токеном — только запомнить токен. */
export function syncTourMarks({ token: nextToken, account }) {
  token = nextToken || null
  if (!account || !token) {
    if (snap.account !== null || snap.status !== 'idle') {
      generation += 1
      server = new Set()
      update({ account: null, status: 'idle' })
    }
    return
  }
  if (account === snap.account) return
  const gen = ++generation
  server = new Set()
  update({ account, status: 'loading' })
  fetchTours(token).then((tours) => {
    if (gen !== generation) return
    if (tours) server = new Set(tours)
    update({ status: tours ? 'ready' : 'failed' })
  })
}

async function fetchTours(tok) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null
  const timer = setTimeout(() => ctrl?.abort(), LOAD_TIMEOUT_MS)
  try {
    const res = await fetch('/api/profile/tours', { headers: { Authorization: `Bearer ${tok}` }, signal: ctrl?.signal })
    if (!res.ok) return null
    const data = await res.json()
    // configured: false — базы нет: пустой список тут не значит «туров не проходили».
    return data?.configured && Array.isArray(data.tours) ? data.tours : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function readLocal(key) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeLocal(key) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* localStorage недоступен — отметка останется только на сервере */
  }
}

// Отправляем, только когда сервер ответил: при failed базы, скорее всего, нет, а отметка в браузере
// всё равно доедет — на следующей проверке тура после удачной загрузки.
function upload(name) {
  if (snap.status !== 'ready' || !token || server.has(name)) return
  server.add(name)
  const gen = generation
  fetch('/api/profile/tours', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tours: [name] }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`tours ${res.status}`)
    })
    .catch(() => {
      // Забываем, что «отправили», — следующая проверка тура попробует снова.
      if (gen === generation) server.delete(name)
    })
}

// Ключ этого аккаунта: только его отметки уходят на сервер и читаются оттуда.
function ownKey(key) {
  const parsed = parseTourKey(key)
  return parsed && snap.account && parsed.owner === snap.account ? parsed : null
}

/** Показывали ли уже тур. localStorage недоступен и сервер молчит → false: лучше лишний тур, чем молча пропущенный. */
export function isTourSeen(key) {
  if (!key) return false
  const own = ownKey(key)
  if (readLocal(key)) {
    if (own) upload(own.name)
    return true
  }
  if (!own) return false
  if (server.has(own.name)) {
    writeLocal(key)
    return true
  }
  if (readLocal(tourKeyForOwner(own, getDeviceId()))) {
    writeLocal(key)
    upload(own.name)
    return true
  }
  return false
}

/** Тур показан: в браузер сразу, на сервер — если ключ этого аккаунта. */
export function markTourSeen(key) {
  if (!key) return
  writeLocal(key)
  const own = ownKey(key)
  if (own) upload(own.name)
}
