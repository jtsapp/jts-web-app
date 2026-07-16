'use client'

// Сохранение сессии между перезагрузками.
//
// Токен лежит в localStorage: SPA ходит в бэкенд напрямую из браузера и цепляет
// `Authorization: Bearer` клиентским JS, поэтому httpOnly-cookie тут не подошла
// бы — токен обязан быть читаем из JS. Значит XSS его достанет; защита в том,
// что он живёт 24ч, а не в хранилище.
//
// refreshToken намеренно не храним: /auth/refresh на бэкенде отдаёт 500 даже с
// валидным токеном, поэтому продлить сессию всё равно нечем. Когда его почитят
// — сюда добавится refresh, и срок жизни сессии вырастет с 24ч до 60 дней.

import { getDeviceId } from './identity.js'

const TOKEN_KEY = 'jts_access_token'

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
    return null // приватный режим / localStorage отключён — работаем как аноним
  }
}

export function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* не сохранили — сессия просто не переживёт перезагрузку */
  }
}

export function clearToken() {
  saveToken(null)
}

/**
 * Проверяет сохранённый токен через наш сервер (он ходит в бэкенд `/user/me`).
 * Возвращает { userId, name, phone, role, languageLevel } либо null — токена
 * нет, он просрочен или бэкенд недоступен. Битый токен подчищаем сразу.
 */
export async function restoreSession() {
  const token = loadToken()
  if (!token) return null

  let res
  try {
    res = await fetch('/api/auth/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
  } catch {
    // Сети нет. Токен не трогаем — он может быть ещё живой, просто оффлайн.
    return null
  }

  if (res.status === 401) {
    clearToken() // бэкенд отверг — держать его смысла нет
    return null
  }
  if (!res.ok) return null

  const data = await res.json().catch(() => null)
  return data?.user ? { ...data.user, token } : null
}
