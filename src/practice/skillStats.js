'use client'

// Клиентский сбор рейтинга навыков. Работает и для гостей (локальный мираж в
// localStorage). Дельты копятся в буфере и debounce-флашатся на /api/skills
// инкрементами; без токена — только локально (на сервер не пишем, как pushModule).

import { loadToken } from '../lib/session.js'
import { addDelta, mergeDeltas, emptyStats, SKILLS } from './skillStatsCore.js'

const MIRROR_KEY = 'jts_skill_stats'
const PENDING_KEY = 'jts_skill_stats_pending'
const FLUSH_DELAY = 800

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function writeJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* приватный режим / квота — работаем без персиста */
  }
}

export function readLocalSkillStats() {
  const m = readJson(MIRROR_KEY, null)
  return m && typeof m === 'object' ? { ...emptyStats(), ...m } : emptyStats()
}

let timer = null

export function recordSkill(skill, correct) {
  if (!SKILLS.includes(skill)) return
  writeJson(MIRROR_KEY, addDelta(readLocalSkillStats(), skill, correct))
  const pending = addDelta(readJson(PENDING_KEY, emptyStats()), skill, correct)
  writeJson(PENDING_KEY, pending)
  clearTimeout(timer)
  timer = setTimeout(flushSkillStats, FLUSH_DELAY)
}

function hasPending(p) {
  return SKILLS.some((s) => p[s] && (p[s].done || p[s].firstTry))
}

export function flushSkillStats() {
  const token = loadToken()
  if (!token) return
  const pending = readJson(PENDING_KEY, emptyStats())
  if (!hasPending(pending)) return
  // Оптимистично очищаем буфер перед отправкой; при сбое возвращаем.
  writeJson(PENDING_KEY, emptyStats())
  // Ответ приходит позже, и за это время ученик мог выйти, а за ним войти
  // другой (общий компьютер класса). Тогда ни чужое зеркало, ни возврат чужих
  // дельт в буфер писать нельзя: следующий флаш отправил бы их под новым
  // токеном — в рейтинг навыков другого человека.
  const sameUser = () => loadToken() === token
  fetch('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ deltas: pending }),
  })
    .then((res) => {
      if (!res.ok) throw new Error('bad status ' + res.status)
      return res.json()
    })
    .then((data) => {
      if (data?.stats && sameUser()) writeJson(MIRROR_KEY, data.stats) // сервер — источник истины
    })
    .catch((e) => {
      console.warn('[skill.sync] flush failed', e)
      // вернуть дельты в буфер, чтобы не потерять при следующем флаше
      if (sameUser()) writeJson(PENDING_KEY, mergeDeltas(readJson(PENDING_KEY, emptyStats()), pending))
    })
}

/**
 * Забыть навыки этого устройства — при выходе из аккаунта.
 *
 * Не при входе: гость копит навыки локально, и первый флаш после входа
 * законно уносит их в его новый аккаунт. А вот оставшееся от вышедшего
 * ученика ушло бы тем же флашем следующему — поэтому чистим на выходе.
 */
export function clearLocalSkillStats() {
  clearTimeout(timer)
  timer = null
  for (const k of [MIRROR_KEY, PENDING_KEY]) {
    try {
      localStorage.removeItem(k)
    } catch {
      /* приватный режим — чистить нечего */
    }
  }
}

export async function loadSkillStatsRemote(token) {
  if (!token) return null
  try {
    const res = await fetch('/api/skills', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.stats) {
      writeJson(MIRROR_KEY, data.stats)
      return data.stats
    }
  } catch (e) {
    console.warn('[skill.sync] load failed', e)
  }
  return null
}
