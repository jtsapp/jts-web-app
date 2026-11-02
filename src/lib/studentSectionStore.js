'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { getMySections } from '../api.js'
import { userIdFromToken } from './jwt.js'
import { validStudentSections } from './studentSectionRules.js'

export const STUDENT_SECTIONS_POLL_MS = 30_000
export const STUDENT_SECTIONS_TIMEOUT_MS = 15_000
const LOADING = Object.freeze({ status: 'loading', allowed: [] })
const FAILED = Object.freeze({ status: 'error', allowed: [] })
// Гостевой предпросмотр не запрашивает кабинет. Ошибки авторизованного ученика сюда не попадают.
const GUEST = Object.freeze({ status: 'ready', known: false, allowed: [] })
const entries = new Map()
const ownerOf = (token) => token ? `student:${userIdFromToken(token) ?? token}` : null
const serverSnapshot = () => LOADING
const idleSubscribe = () => () => {}
const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
const sameAccess = (snapshot, access) => !access.examsRechecked && snapshot.status === 'ready' && snapshot.known === access.known
  && snapshot.tariff === access.tariff && snapshot.format === access.format
  && snapshot.allowed.length === access.allowed.length && snapshot.allowed.every((key, i) => key === access.allowed[i])

function entryFor(owner) {
  if (entries.has(owner)) return entries.get(owner)
  const listeners = new Set()
  const entry = { snapshot: LOADING, token: null, pending: null, sequence: 0, updatedAt: 0, timer: null, controller: null }
  const emit = (snapshot) => { entry.snapshot = snapshot; listeners.forEach((fn) => fn()) }
  entry.getSnapshot = () => entry.snapshot
  entry.setToken = (token) => {
    if (entry.token === token) return
    entry.token = token
    entry.sequence += 1
    entry.controller?.abort()
    entry.pending = null
    entry.updatedAt = 0
  }
  entry.refresh = (force = false) => {
    if (!entry.token) return Promise.resolve()
    if (entry.pending) return entry.pending
    if (!force && entry.updatedAt && Date.now() - entry.updatedAt < STUDENT_SECTIONS_POLL_MS) return Promise.resolve()
    if (entry.snapshot.status !== 'ready') emit(LOADING)
    const sequence = ++entry.sequence
    const token = entry.token
    const controller = new AbortController()
    entry.controller = controller
    let timeout
    const task = Promise.race([
      Promise.resolve().then(() => getMySections(token, { signal: controller.signal })),
      new Promise((_, reject) => {
        timeout = setTimeout(() => { controller.abort(); reject(new Error('Section access timeout')) }, STUDENT_SECTIONS_TIMEOUT_MS)
      }),
    ]).then((access) => {
      if (sequence !== entry.sequence) return
      if (!validStudentSections(access)) throw new Error('Invalid section access')
      entry.updatedAt = Date.now()
      // Тот же ответ — тот же снимок: иначе каждый опрос перерисовывал кабинет и перезапрашивал экзамены.
      if (!sameAccess(entry.snapshot, access)) emit({ ...access, status: 'ready' })
    }).catch(() => {
      if (sequence !== entry.sequence) return
      entry.updatedAt = 0
      // Сбой ФОНОВОЙ перепроверки не закрывает открытый урок: прежний ответ сервера остаётся, следующий опрос
      // проверит снова. Раньше таймаут или 502 подменял урок и домашку экраном «Проверьте соединение»,
      // размонтируя их с несохранёнными ответами (жалобы 02.11.2026). Ошибку видно, только пока ответа не было.
      if (entry.snapshot.status !== 'ready') emit(FAILED)
    }).finally(() => {
      clearTimeout(timeout)
      if (entry.pending === task) { entry.pending = null; entry.controller = null }
    })
    entry.pending = task
    return task
  }
  const refreshVisible = () => { if (visible()) entry.refresh(true) }
  // Возврат в окно — не чаще опроса: в уроке и домашке фокус уходит во фрейм задания и возвращается на каждом
  // клике, и принудительная перепроверка давала запрос раз в несколько секунд у каждого ученика.
  const refreshReturned = () => { if (visible()) entry.refresh(false) }
  entry.subscribe = (fn) => {
    listeners.add(fn)
    if (listeners.size === 1) {
      entry.timer = setInterval(refreshVisible, STUDENT_SECTIONS_POLL_MS)
      window.addEventListener('focus', refreshReturned)
      window.addEventListener('online', refreshVisible)
      document.addEventListener('visibilitychange', refreshReturned)
    }
    return () => {
      listeners.delete(fn)
      if (listeners.size) return
      clearInterval(entry.timer)
      window.removeEventListener('focus', refreshReturned)
      window.removeEventListener('online', refreshVisible)
      document.removeEventListener('visibilitychange', refreshReturned)
      entry.sequence += 1
      entry.controller?.abort()
      entry.controller = null
      entry.pending = null
      entry.token = null
      entry.snapshot = LOADING
      entry.updatedAt = 0
    }
  }
  entries.set(owner, entry)
  return entry
}

/** Все части кабинета читают один снимок. Обновление JWT того же ученика не размонтирует открытый урок. */
export function useStudentSections(token, navigationKey) {
  const owner = ownerOf(token)
  const entry = useMemo(() => owner ? entryFor(owner) : null, [owner])
  const snapshot = useSyncExternalStore(entry?.subscribe ?? idleSubscribe, entry?.getSnapshot ?? serverSnapshot, serverSnapshot)
  useEffect(() => {
    if (!entry || !token) return
    entry.setToken(token)
    entry.refresh(navigationKey !== undefined)
  }, [entry, token, navigationKey])
  return entry ? snapshot : GUEST
}

export function refreshStudentSections(token) {
  if (!token) return Promise.resolve()
  const entry = entryFor(ownerOf(token))
  entry.setToken(token)
  return entry.refresh(true)
}
