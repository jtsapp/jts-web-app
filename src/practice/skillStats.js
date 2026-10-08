'use client'

// Клиентский сбор рейтинга навыков. Работает и для гостей (локальный мираж в
// localStorage). Дельты копятся в буфере и debounce-флашатся на /api/skills
// инкрементами; без токена — только локально (на сервер не пишем, как pushModule).

import { loadToken } from '../lib/session.js'
import { userIdFromToken } from '../lib/jwt.js'
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
    return true
  } catch {
    /* приватный режим / квота — работаем без персиста */
    return false
  }
}

// Хранилище домена забивает кэш каталогов, и запись тогда молча падает. Раньше
// флаш читал буфер только оттуда — прирост навыков не доходил до сервера
// никогда, а сводка стояла на месте (ревью 08.10.2026). Теперь то, что не
// записалось, живёт в памяти вкладки до отправки или выхода.
let unsaved = emptyStats() // дельты, не попавшие в буфер хранилища
let mirrorMem = null // зеркало, которое не удалось записать

function setMirror(stats) {
  mirrorMem = writeJson(MIRROR_KEY, stats) ? null : stats
}

function keepPending(deltas) {
  const all = mergeDeltas(readJson(PENDING_KEY, emptyStats()), deltas)
  if (!writeJson(PENDING_KEY, all)) unsaved = mergeDeltas(unsaved, deltas)
}

export function readLocalSkillStats() {
  const m = mirrorMem || readJson(MIRROR_KEY, null)
  return m && typeof m === 'object' ? { ...emptyStats(), ...m } : emptyStats()
}

let timer = null

export function recordSkill(skill, correct) {
  if (!SKILLS.includes(skill)) return
  setMirror(addDelta(readLocalSkillStats(), skill, correct))
  keepPending(addDelta(emptyStats(), skill, correct))
  clearTimeout(timer)
  timer = setTimeout(flushSkillStats, FLUSH_DELAY)
}

function hasPending(p) {
  return SKILLS.some((s) => p[s] && (p[s].done || p[s].firstTry))
}

export function flushSkillStats() {
  const token = loadToken()
  if (!token) return
  const pending = mergeDeltas(readJson(PENDING_KEY, emptyStats()), unsaved)
  if (!hasPending(pending)) return
  // Оптимистично очищаем буфер перед отправкой; при сбое возвращаем.
  // removeItem, а не запись пустого: в забитом хранилище запись не пройдёт, и
  // те же дельты ушли бы второй раз.
  unsaved = emptyStats()
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    /* приватный режим — буфера и не было */
  }
  // Ответ приходит позже, и за это время ученик мог выйти, а за ним войти
  // другой (общий компьютер класса). Тогда ни чужое зеркало, ни возврат чужих
  // дельт в буфер писать нельзя: следующий флаш отправил бы их под новым
  // токеном — в рейтинг навыков другого человека.
  //
  // Сверяем по id из токена, а не по самой строке: access-токен того же
  // ученика может смениться по refresh (lib/session.js), и сравнение строк
  // приняло бы его за чужого — ответ сервера и возврат дельт терялись бы.
  // Строки сравниваем только там, где id из токена не достать.
  const uid = userIdFromToken(token)
  const sameUser = () => {
    const now = loadToken()
    if (!now) return false
    return uid != null ? userIdFromToken(now) === uid : now === token
  }
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
      if (data?.stats && sameUser()) setMirror(data.stats) // сервер — источник истины
    })
    .catch((e) => {
      console.warn('[skill.sync] flush failed', e)
      // вернуть дельты в буфер, чтобы не потерять при следующем флаше
      if (sameUser()) keepPending(pending)
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
  unsaved = emptyStats()
  mirrorMem = null
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
      setMirror(data.stats)
      return data.stats
    }
  } catch (e) {
    console.warn('[skill.sync] load failed', e)
  }
  return null
}
