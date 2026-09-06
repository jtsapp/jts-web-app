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
