'use client'

// Сохранение сессии между перезагрузками.
//
// Access + refresh лежат в localStorage: SPA ходит в бэкенд из браузера с
// `Authorization: Bearer`, поэтому httpOnly-cookie тут не подходит — токен
// обязан быть читаем из JS. XSS его достанет; защита — короткий access (24ч)
// и refresh только для продления сессии.
//
// Важно: разлогин только при реальном 401 (токен отвергнут). Сбой сети /
// 503 бэкенда сессию не сбрасывает — иначе F5 при кратком отвале API
// выкидывает ученика на welcome.

import { getDeviceId } from './identity.js'

const TOKEN_KEY = 'jts_access_token'
const REFRESH_KEY = 'jts_refresh_token'
const USER_KEY = 'jts_user_snapshot'

/**
 * Переносит анонимный прогресс в аккаунт. Зовётся один раз сразу после входа.
 * Best-effort: любая осечка не должна ломать сам вход — человек уже вошёл,
 * прогресс никуда не делся, просто остался под device-id.
 */
export async function mergeAnonymousProgress(token) {
  if (!token) return null
  try {
    const res = await fetch('/api/profile/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ deviceId: getDeviceId() }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      console.warn('[merge] не удалось перенести прогресс:', data?.error || res.status)
      return null
    }
    return data
  } catch (e) {
    console.warn('[merge] сеть недоступна:', e)
    return null
  }
}

export function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null
  } catch {
    return null
  }
}

export function loadRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY) || null
  } catch {
    return null
  }
}

function loadUserSnapshot() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return data && typeof data === 'object' ? data : null
  } catch {
    return null
  }
}

export function saveUserSnapshot(user) {
  try {
    if (!user) {
      localStorage.removeItem(USER_KEY)
      return
    }
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        userId: user.userId ?? user.id ?? null,
        name: user.name ?? null,
        phone: user.phone ?? null,
        email: user.email ?? null,
        role: user.role ?? null,
        languageLevel: user.languageLevel ?? null,
        birthDate: user.birthDate ?? null,
        isDemoAccount: !!user.isDemoAccount,
        // Снимок — это ответ на «кто вошёл» при недоступном бэкенде. Без
        // признака класса недоступный бэкенд выкидывал бы пришедшего на
        // пробный в кабинет, которого у его аккаунта нет.
        //
        // `!!` обязателен и здесь, но по своей причине: снимок уходит в
        // JSON.stringify, а undefined из объекта там просто ИСЧЕЗАЕТ — поле
        // молча пропало бы из localStorage, и отличить «признака не было» от
        // «снимок старый» стало бы нечем.
        boothAccount: !!user.boothAccount,
      }),
    )
  } catch {
    /* ignore */
  }
}

/**
 * Дописывает поля в уже сохранённый снимок, не трогая остальные. Нужен для
 * признаков, которые узнаются отдельным запросом ПОСЛЕ входа (пример —
 * boothAccount: обработчики входа зовут saveUserSnapshot раньше, чем придёт
 * ответ getIsBoothAccount) — без дописывания снимок эти поля не увидит
 * никогда, только следующий успешный restoreSession.
 *
 * Снимка нет — не создаём: снимок без userId бесполезен и хуже отсутствия
 * (App принял бы его за «кто-то вошёл»), а раз saveUserSnapshot ещё не
 * отработал, полю всё равно неоткуда быть настоящим.
 */
export function patchUserSnapshot(fields) {
  try {
    const prev = loadUserSnapshot()
    if (!prev) return
    localStorage.setItem(USER_KEY, JSON.stringify({ ...prev, ...fields }))
  } catch {
    /* ignore */
  }
}

/**
 * Признак класса патчим в снимок только на достоверное «да». Осечку
 * (сеть/5xx) вызывающий (applyBoothAccount в App.jsx) сюда вовсе не пускает —
 * getIsBoothAccount (см. api.js) отдаёт её отдельным значением null, а не
 * false, — так что false, дошедший до этой функции, всегда настоящий ответ
 * бэкенда. И всё равно не патчим им: «этот аккаунт больше не класс» — судьба
 * не для точечного патча, она приедет целым снимком при следующем
 * restoreSession (см. saveUserSnapshot выше), а не перезаписью одного поля
 * поверх снимка, собранного другим запросом.
 */
export function patchBoothAccount(isBooth) {
  if (isBooth) patchUserSnapshot({ boothAccount: true })
}

/** access обязателен; refresh/user — по возможности с ответа логина. */
export function saveToken(token, refreshToken) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)

    if (refreshToken !== undefined) {
      if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
      else localStorage.removeItem(REFRESH_KEY)
    }
  } catch {
    /* не сохранили — сессия просто не переживёт перезагрузку */
  }
}

export function saveAuthSession({ accessToken, refreshToken, user } = {}) {
  if (!accessToken) {
    clearToken()
    return
  }
  saveToken(accessToken, refreshToken ?? null)
  if (user) saveUserSnapshot(user)
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    /* ignore */
  }
}

const BOOTH_LESSON_KEY = 'jts_booth_lesson_id'

/**
 * Урок, который эта вкладка уже открыла как класс преподавателя (App.jsx,
 * состояние boothLessonId). sessionStorage, а не localStorage: эта память
 * обязана умереть вместе со вкладкой — закрыли её, значит за общий планшет
 * сел следующий посетитель, и ему положен собственный /trial/booth/enter, а
 * не реанимированный чужой сеанс. Но именно F5/восстановление ЭТОЙ ЖЕ вкладки
 * sessionStorage переживает — а раньше boothLessonId жил только в
 * React-состоянии, и такая перезагрузка стирала его: экран класса слал
 * лишний /enter, и бэкенд закрывал ещё живой сеанс как забытый
 * (closed_by_next_entry, TrialBoothSessionService.enter() на бэкенде).
 *
 * Ставится и стирается в одном месте — там же, где App.jsx меняет сам
 * boothLessonId: вход в урок (case 'booth' → onEnter) пишет, забывание урока
 * (выход из аккаунта) стирает. Восстановленному отсюда id всё равно не верят
 * на слово: прежде чем предложить «Вернуться в класс», BoothEntryPage
 * перепроверяет статус занятия у бэкенда (getLessonById) — память вкладки
 * доказывает только то, что сеанс был жив, когда его в последний раз видели.
 */
export function saveBoothLessonId(id) {
  try {
    if (id == null) sessionStorage.removeItem(BOOTH_LESSON_KEY)
    else sessionStorage.setItem(BOOTH_LESSON_KEY, String(id))
  } catch {
    /* приватное окно и т.п. — сеанс тогда просто не переживёт перезагрузку */
  }
}

export function loadBoothLessonId() {
  try {
    const raw = sessionStorage.getItem(BOOTH_LESSON_KEY)
    if (raw == null) return null
    const id = Number(raw)
    return Number.isFinite(id) ? id : null
  } catch {
    return null
  }
}

async function fetchMe(token) {
  const res = await fetch('/api/auth/me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  return res
}

async function tryRefresh() {
  const refreshToken = loadRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (res.status === 401) return null
    if (!res.ok) return 'unavailable'
    const data = await res.json().catch(() => null)
    if (!data?.accessToken) return null
    saveToken(data.accessToken, data.refreshToken || refreshToken)
    const prev = loadUserSnapshot() || {}
    saveUserSnapshot({
      ...prev,
      userId: data.userId ?? prev.userId ?? null,
      name: data.name ?? prev.name ?? null,
      phone: data.phone ?? prev.phone ?? null,
      email: data.email ?? prev.email ?? null,
      role: data.role ?? prev.role ?? null,
    })
    return data.accessToken
  } catch {
    return 'unavailable'
  }
}

function sessionFromSnapshot(token) {
  const snap = loadUserSnapshot()
  if (!token) return null
  // Даже без снимка держим токен: App хотя бы не уйдёт на welcome зря.
  return { ...(snap || {}), token }
}

/**
 * Проверяет сохранённый токен через наш сервер (он ходит в бэкенд `/user/me`).
 * Возвращает { userId, name, phone, role, languageLevel, token } либо null.
 * Чистим storage только если бэкенд явно отверг access и refresh.
 */
export async function restoreSession() {
  let token = loadToken()
  if (!token) return null

  let res
  try {
    res = await fetchMe(token)
  } catch {
    return sessionFromSnapshot(token)
  }

  if (res.ok) {
    const data = await res.json().catch(() => null)
    if (data?.user) {
      saveUserSnapshot(data.user)
      return { ...data.user, token }
    }
  }

  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed === 'unavailable') return sessionFromSnapshot(token)
    if (typeof refreshed === 'string' && refreshed) {
      token = refreshed
      try {
        res = await fetchMe(token)
        if (res.ok) {
          const data = await res.json().catch(() => null)
          if (data?.user) {
            saveUserSnapshot(data.user)
            return { ...data.user, token }
          }
        }
        if (res.status !== 401) return sessionFromSnapshot(token)
      } catch {
        return sessionFromSnapshot(token)
      }
    }
    clearToken()
    return null
  }

  // 503 / 5xx / прочее — токен не трогаем
  return sessionFromSnapshot(token)
}

// ─── Сессия кончилась посреди работы ────────────────────────────────────────
//
// На старте протухший токен чинится (refresh) или стирается — restoreSession
// выше. Но вкладка может простоять сутки открытой: access живёт 24 часа, и по
// истечении КАЖДЫЙ запрос получает 401. Раньше никто на это не реагировал:
// запросы падали молча, каталоги рисовали «Нет данных», кнопки ничего не
// делали, а человек не понимал, почему приложение «сломалось».
//
// Здесь одна точка, куда хелперы api.js сообщают о 401. Она решает, КОНЧИЛАСЬ ли
// сессия — не каждый 401 про срок:
//   * 401 у запроса с живым токеном бывает и про права (ручка не для этой
//     роли) — разлогинивать за это нельзя, человек потеряет всё, что вводил;
//   * 401 у гостевого демо-токена — не сессия вовсе: пользователь не входил.
// Поэтому токен сверяется с сервером тем же /api/auth/me, что и на старте, и
// только настоящий 401 на нём — повод действовать.

let sessionHooks = {}
let recovering = null

/**
 * Подписка App.jsx на события сессии.
 * `onRefreshed(token)` — access обновлён по refresh, его надо положить в
 * состояние; `onExpired()` — сессии больше нет, надо выйти и сказать об этом.
 */
export function setSessionHooks(hooks) {
  sessionHooks = hooks || {}
}

/**
 * Хелперы api.js зовут это на каждый 401 запроса, который нёс токен.
 * Синхронно ничего не возвращает: разбор идёт в фоне, а упавший запрос
 * по-прежнему пробрасывает свою ошибку вызывающему.
 */
export function reportUnauthorized(token) {
  // Только токен ВХОДЯЩЕГО человека. Гостевой демо-токен (getPracticeToken) в
  // хранилище сессии не лежит, и «сессия истекла» гостю не про что говорить.
  if (!token || token !== loadToken()) return
  // Пачка параллельных запросов упирается в одну и ту же смерть токена — разбор
  // один на всех, иначе человек получил бы десяток плашек и десяток refresh.
  if (!recovering) {
    recovering = verifyAndRecover(token)
      .catch(() => {})
      .finally(() => {
        recovering = null
      })
  }
}

async function verifyAndRecover(token) {
  let res
  try {
    res = await fetchMe(token)
  } catch {
    return // сеть пропала — это не конец сессии, как и на старте
  }
  // Токен принят: 401 был про права на конкретную ручку, а не про срок.
  if (res.status !== 401) return

  const refreshed = await tryRefresh()
  // Бэкенд сейчас недоступен — решать рано. Сессию рвём только по настоящему
  // отказу, как и restoreSession.
  if (refreshed === 'unavailable') return
  if (typeof refreshed === 'string' && refreshed) {
    sessionHooks.onRefreshed?.(refreshed)
    return
  }
  // Ни access, ни refresh бэкенд не принял — сессии нет.
  clearToken()
  sessionHooks.onExpired?.()
}
