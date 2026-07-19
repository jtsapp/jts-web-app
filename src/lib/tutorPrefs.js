'use client'

// Выбор тьютора, интересы и профессия, закреплённые за учеником.
//
// Хранилище — профиль в Neon (/api/profile): у залогиненного ключ user-<id>
// (сервер берёт его из Bearer и игнорирует deviceId), у анонима — device-id.
// mergeAnonymousProgress при входе перевешивает анонимный профиль на аккаунт,
// поэтому выбор, сделанный до регистрации, тоже не теряется.

import { getDeviceId, authHeaders } from './identity.js'

/**
 * Профиль ученика для восстановления UI (tutor, interests, profession, …).
 * null — профиля ещё нет, БД не поднята или сеть недоступна: работаем с
 * дефолтами, онбординг покажется заново. Это осознанный fail-open.
 */
export async function loadTutorProfile(token) {
  try {
    const res = await fetch(`/api/profile?deviceId=${encodeURIComponent(getDeviceId())}`, {
      headers: authHeaders(token),
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    return data?.profile ?? null
  } catch {
    return null
  }
}

/**
 * Пишет CEFR-уровень в Neon-профиль (/api/placement/complete) — стор, из
 * которого голосовой тьютор берёт память ученика. Уровень из письменного
 * CEFR-теста и из голосового placement должен попадать сюда наравне с
 * backend'ом (/user/language-level), иначе сторы расходятся. Источник правды
 * при входе — backend; эта запись best-effort и осечка не фатальна.
 */
export function savePlacementLevel(token, level) {
  return fetch('/api/placement/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ deviceId: getDeviceId(), level }),
  }).catch((e) => {
    console.warn('[tutorPrefs] уровень не сохранился в Neon-профиль:', e)
    return null
  })
}

/**
 * Сохраняет часть профиля (например { tutor: 'dexter' } или { interests }).
 * Fire-and-forget: осечка не должна ломать онбординг — выбор остаётся в
 * стейте, просто не переживёт перезагрузку.
 */
export function saveTutorPrefs(token, patch) {
  return fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ deviceId: getDeviceId(), ...patch }),
  }).catch((e) => {
    console.warn('[tutorPrefs] не сохранилось:', e)
    return null
  })
}
