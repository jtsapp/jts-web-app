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
      if (data?.stats) writeJson(MIRROR_KEY, data.stats) // сервер — источник истины
    })
    .catch((e) => {
      console.warn('[skill.sync] flush failed', e)
      // вернуть дельты в буфер, чтобы не потерять при следующем флаше
      writeJson(PENDING_KEY, mergeDeltas(readJson(PENDING_KEY, emptyStats()), pending))
    })
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
