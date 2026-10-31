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
      emit({ ...access, status: 'ready' })
    }).catch(() => {
      if (sequence !== entry.sequence) return
      entry.updatedAt = 0
      emit(FAILED)
    }).finally(() => {
      clearTimeout(timeout)
      if (entry.pending === task) { entry.pending = null; entry.controller = null }
    })
    entry.pending = task
    return task
  }
  const refreshVisible = () => { if (visible()) entry.refresh(true) }
  entry.subscribe = (fn) => {
    listeners.add(fn)
    if (listeners.size === 1) {
      entry.timer = setInterval(refreshVisible, STUDENT_SECTIONS_POLL_MS)
      window.addEventListener('focus', refreshVisible)
      window.addEventListener('online', refreshVisible)
      document.addEventListener('visibilitychange', refreshVisible)
    }
    return () => {
      listeners.delete(fn)
      if (listeners.size) return
      clearInterval(entry.timer)
      window.removeEventListener('focus', refreshVisible)
      window.removeEventListener('online', refreshVisible)
      document.removeEventListener('visibilitychange', refreshVisible)
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
