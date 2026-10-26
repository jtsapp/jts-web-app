import { useEffect, useSyncExternalStore } from 'react'
import { getStudentMatching, getMatchingHandoffs } from '../api.js'

// Одна карточка подбора на вкладку. Её читают меню (бейдж), «Мой учитель», профиль и окна при входе — каждый
// своим запросом это был бы десяток одинаковых обращений на каждую смену экрана. Опрос раз в 30 с, пока хоть
// кто-то подписан: ТЗ 2.1.1 требует, чтобы подтверждённый менеджером тариф оживил кнопку без перезагрузки.
const POLL_MS = 30000
const EMPTY = { token: null, status: 'idle', card: null, handoffs: [] }
let snap = EMPTY
const listeners = new Set()
let users = 0
let timer = null

function emit(next) {
  snap = next
  listeners.forEach((fn) => fn())
}

export function getMatchingSnapshot() {
  return snap
}

export function resetMatchingStore() {
  clearInterval(timer)
  timer = null
  users = 0
  snap = EMPTY
  listeners.forEach((fn) => fn())
}

export async function refreshMatching(token) {
  if (!token) return emit(EMPTY)
  if (snap.token !== token) emit({ ...EMPTY, token, status: 'loading' })
  const res = await getStudentMatching(token)
  // Ответ для прежнего входа (вышел и вошёл другим аккаунтом, пока шёл запрос) — не наш.
  if (snap.token !== token) return
  // Карточка без apiVersion — бэкенд подбора первой версии: ручек сетки и профиля учителя у него нет, и экран
  // мастера на нём не заработает. Для ученика это то же, что «раздела пока нет».
  if (res.status !== 'ready' || !(res.card?.apiVersion >= 2)) {
    return emit({ token, status: res.status === 'not_added' ? 'not_added' : 'unavailable', card: null, handoffs: [] })
  }
  const handoffs = await getMatchingHandoffs(token).catch(() => [])
  if (snap.token !== token) return
  emit({ token, status: 'ready', card: res.card, handoffs: Array.isArray(handoffs) ? handoffs : [] })
}

// Ответ действия (подтвердил, отправил заявки) — это уже свежая карточка: показываем её сразу, без запроса.
export function applyMatchingCard(card) {
  if (card) emit({ ...snap, status: 'ready', card })
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const serverSnapshot = () => EMPTY

export function useMatching(token) {
  const state = useSyncExternalStore(subscribe, getMatchingSnapshot, serverSnapshot)
  useEffect(() => {
    if (!token) return undefined
    users += 1
    if (snap.token !== token || snap.status === 'idle') refreshMatching(token)
    if (!timer) timer = setInterval(() => refreshMatching(snap.token), POLL_MS)
    return () => {
      users -= 1
      if (users <= 0) {
        users = 0
        clearInterval(timer)
        timer = null
      }
    }
  }, [token])
  return { ...state, refresh: () => refreshMatching(token) }
}
