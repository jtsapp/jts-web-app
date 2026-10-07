'use client'

// Цель уровня на клиенте: кэш в localStorage + синхронизация с
// /api/profile/level-goal.
//
// Кэш нужен не для скорости ради скорости: без него карточка уровня секунду
// рисовала бы дорожку «без цели», а потом перескакивала на выбранную. И он же
// держит цель, когда базы нет (локальная разработка без DATABASE_URL), — тур
// тогда не переспрашивает её на каждом заходе.
//
// Ключ — по id пользователя из токена: на общем компьютере класса цель одного
// ученика не должна доставаться следующему (см. clearLocalSkillStats — там та
// же беда решена чисткой на выходе, здесь хватает ключа).

import { userIdFromToken } from './jwt.js'
import { sanitizeGoal } from './levelProgress.js'

const keyFor = (token) => {
  const uid = userIdFromToken(token)
  return uid != null ? `jts_level_goal:${uid}` : null
}

export function readCachedGoal(token) {
  const key = keyFor(token)
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? sanitizeGoal(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeCache(token, goal) {
  const key = keyFor(token)
  if (!key) return
  try {
    if (goal) localStorage.setItem(key, JSON.stringify(goal))
    else localStorage.removeItem(key)
  } catch {
    /* приватный режим — живём без кэша */
  }
}

/**
 * Цель с сервера. undefined — сервер ничего определённого не сказал (нет базы,
 * сеть, 5xx): тогда вызывающий остаётся при кэше, а не стирает выбор.
 */
export async function loadLevelGoal(token) {
  if (!token) return undefined
  try {
    const res = await fetch('/api/profile/level-goal', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return undefined
    const data = await res.json()
    if (!data?.configured) return undefined
    const goal = sanitizeGoal(data.goal)
    writeCache(token, goal)
    return goal
  } catch {
    return undefined
  }
}

/**
 * Сохраняет цель (или снимает — goal = null). Кэш пишется сразу: экран уже
 * показал выбор, и сетевая осечка не должна откатить его до следующего захода.
 */
export async function saveLevelGoal(token, goal) {
  const clean = goal === null ? null : sanitizeGoal(goal)
  if (goal !== null && !clean) return
  writeCache(token, clean)
  if (!token) return
  try {
    await fetch('/api/profile/level-goal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(clean ?? { target: null }),
    })
  } catch {
    /* офлайн — останется кэш; следующий выбор перезапишет и сервер */
  }
}
