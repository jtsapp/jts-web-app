import { useEffect, useSyncExternalStore } from 'react'
import { getStudentMatching, getMatchingHandoffs } from '../api.js'
import { userIdFromToken } from '../lib/jwt.js'

// Одна карточка подбора на вкладку. Её читают меню (бейдж), «Мой учитель», профиль и окна при входе — каждый
// своим запросом это был бы десяток одинаковых обращений на каждую смену экрана. Опрос раз в 30 с, пока хоть
// кто-то подписан: ТЗ 2.1.1 требует, чтобы подтверждённый менеджером тариф оживил кнопку без перезагрузки.
//
// Снимок привязан к ВЛАДЕЛЬЦУ токена, а не к строке токена: тихое обновление access меняет строку, и снимок по
// строке пустел бы посреди мастера — экран терял сетку, выбор и открытое окно (та же ловушка, что у «Чисел»).
const POLL_MS = 30000
// Без подбора на стенде (прод со старым бэкендом) или без абонемента спрашивать каждые 30 с незачем — раз в
// 10 минут хватит, чтобы заметить выкатку или купленный абонемент.
const IDLE_RECHECK_MS = 10 * 60 * 1000
const EMPTY = { owner: null, token: null, status: 'idle', card: null, handoffs: [] }
let snap = EMPTY
// Номер поколения: ответ действия (applyMatchingCard) свежее любого опроса, начатого до него, — такой опрос
// вернул бы прежнюю карточку и, например, снова показал бы «Подтвердите расписание» после подтверждения.
let generation = 0
const listeners = new Set()
let users = 0
let timer = null

const ownerOf = (token) => (token ? userIdFromToken(token) ?? token : null)

function emit(next) {
  snap = next
  listeners.forEach((fn) => fn())
}

export function getMatchingSnapshot() {
  return snap
}

// Выход из аккаунта: карточка прежнего ученика не должна мелькнуть следующему на той же вкладке.
export function resetMatchingStore() {
  clearInterval(timer)
  timer = null
  users = 0
  generation += 1
  snap = EMPTY
  listeners.forEach((fn) => fn())
}

export async function refreshMatching(token) {
  if (!token) return emit(EMPTY)
  const owner = ownerOf(token)
  if (snap.owner !== owner) emit({ ...EMPTY, owner, token, status: 'loading' })
  else if (snap.token !== token) emit({ ...snap, token })
  const started = generation
  // try, а не .catch: тесты экранов, подменяющие api.js без этой ручки, бросают уже при обращении к ней.
  let res
  try {
    res = await getStudentMatching(token)
  } catch {
    res = { status: 'unavailable' }
  }
  // Ответ для прежнего входа или устаревший рядом с ответом действия — не наш.
  if (snap.owner !== owner || generation !== started) return
  // Карточка без apiVersion — бэкенд подбора первой версии: ручек сетки и профиля учителя у него нет, и мастер на
  // нём не заработает. Для ученика это то же, что «раздела пока нет».
  const ready = res.status === 'ready' && res.card?.apiVersion >= 2
  if (!ready) {
    // Уже показанную карточку сбой опроса (сеть, 502 на выкатке, 401 до обновления токена) не стирает: иначе
    // ученика выбрасывало бы из мастера на «Раздел скоро появится». Окончательный ответ — только «не в подборе».
    if (snap.status === 'ready' && res.status !== 'not_added') return
    return emit({ owner, token, status: res.status === 'not_added' ? 'not_added' : 'unavailable', card: null, handoffs: [], at: Date.now() })
  }
  let handoffs = []
  try {
    handoffs = await getMatchingHandoffs(token)
  } catch {
    handoffs = snap.handoffs || []
  }
  if (snap.owner !== owner || generation !== started) return
  emit({ owner, token, status: 'ready', card: res.card, handoffs: Array.isArray(handoffs) ? handoffs : [] })
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
  if (!card) return
  generation += 1
  emit({ ...snap, status: 'ready', card })
}

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
    if (snap.owner !== ownerOf(token) || snap.status === 'idle' || snap.token !== token) refreshMatching(token)
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
  // Снимок другого ученика (вход сменился, эффект ещё не успел) — для этого экрана его нет.
  const own = token && state.owner === ownerOf(token) ? state : EMPTY
  return { ...own, refresh: () => refreshMatching(token) }
}
