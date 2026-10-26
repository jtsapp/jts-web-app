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
  // try, а не .catch: тесты экранов, подменяющие api.js без этой ручки, бросают уже при обращении к ней.
  let res
  try {
    res = await getStudentMatching(token)
  } catch {
    res = { status: 'unavailable' }
  }
  // Ответ для прежнего входа (вышел и вошёл другим аккаунтом, пока шёл запрос) — не наш.
  if (snap.token !== token) return
  // Карточка без apiVersion — бэкенд подбора первой версии: ручек сетки и профиля учителя у него нет, и экран
  // мастера на нём не заработает. Для ученика это то же, что «раздела пока нет».
  if (res.status !== 'ready' || !(res.card?.apiVersion >= 2)) {
    return emit({ token, status: res.status === 'not_added' ? 'not_added' : 'unavailable', card: null, handoffs: [], at: Date.now() })
  }
  let handoffs = []
  try {
    handoffs = await getMatchingHandoffs(token)
  } catch {
    handoffs = []
  }
  if (snap.token !== token) return
  emit({ token, status: 'ready', card: res.card, handoffs: Array.isArray(handoffs) ? handoffs : [] })
}

// Тост, который переживает смену экрана: «Заявки отправлены» говорит мастер, а видно его уже на «Мой учитель».
let flash = null
export function flashMatching(text) {
  flash = text
}
export function takeMatchingFlash() {
  const f = flash
  flash = null
  return f
}

// Ответ действия (подтвердил, отправил заявки) — это уже свежая карточка: показываем её сразу, без запроса.
export function applyMatchingCard(card) {
  if (card) emit({ ...snap, status: 'ready', card })
}

// Без подбора на стенде (прод со старым бэкендом) или без абонемента спрашивать каждые 30 с незачем — раз в
// 10 минут хватит, чтобы заметить выкатку или купленный абонемент.
const IDLE_RECHECK_MS = 10 * 60 * 1000
function poll() {
  if (!snap.token) return
  if ((snap.status === 'unavailable' || snap.status === 'not_added') && Date.now() - (snap.at || 0) < IDLE_RECHECK_MS) return
  refreshMatching(snap.token)
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
    if (!timer) timer = setInterval(poll, POLL_MS)
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
