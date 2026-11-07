'use client'

// Клиентский сбор рейтинга навыков. Работает и для гостей (локальный мираж в
// localStorage). Дельты копятся в буфере и debounce-флашатся на /api/skills
// инкрементами; без токена — только локально (на сервер не пишем, как pushModule).

import { loadToken } from '../lib/session.js'
import { userIdFromToken } from '../lib/jwt.js'
import { addDelta, addLevelDelta, mergeDeltas, mergeLevelDeltas, emptyStats, skillLevel, SKILLS } from './skillStatsCore.js'

const MIRROR_KEY = 'jts_skill_stats'
const PENDING_KEY = 'jts_skill_stats_pending'
// Навыки по уровню задания (ТЗ v2.0, 5.5): «Сильные и слабые стороны» считаются по заданиям текущего уровня.
// Отдельные ключи, а не поле в прежних: старый буфер и старое зеркало читаются как раньше.
const LEVEL_MIRROR_KEY = 'jts_skill_level_stats'
const LEVEL_PENDING_KEY = 'jts_skill_level_pending'
const FLUSH_DELAY = 800

// Уровень ученика — для заданий, чей раздел своего уровня не знает. Ставит App (уровень аккаунта, как в меню).
let currentLevel = null
export function setSkillLevel(level) {
  currentLevel = skillLevel(level)
}

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
let unsavedLevels = {} // то же по уровням
let mirrorMem = null // зеркало, которое не удалось записать
let levelMirrorMem = null

function setMirror(stats) {
  mirrorMem = writeJson(MIRROR_KEY, stats) ? null : stats
}

function setLevelMirror(byLevel) {
  levelMirrorMem = writeJson(LEVEL_MIRROR_KEY, byLevel) ? null : byLevel
}

function keepPending(deltas, levelDeltas = {}) {
  const all = mergeDeltas(readJson(PENDING_KEY, emptyStats()), deltas)
  if (!writeJson(PENDING_KEY, all)) unsaved = mergeDeltas(unsaved, deltas)
  if (!Object.keys(levelDeltas).length) return
  const byLevel = mergeLevelDeltas(readJson(LEVEL_PENDING_KEY, {}), levelDeltas)
  if (!writeJson(LEVEL_PENDING_KEY, byLevel)) unsavedLevels = mergeLevelDeltas(unsavedLevels, levelDeltas)
}

export function readLocalSkillStats() {
  const m = mirrorMem || readJson(MIRROR_KEY, null)
  return m && typeof m === 'object' ? { ...emptyStats(), ...m } : emptyStats()
}

/** Навыки уровня на этом устройстве (гость и до ответа сервера). */
export function readLocalLevelSkillStats(level) {
  const code = skillLevel(level)
  const all = levelMirrorMem || readJson(LEVEL_MIRROR_KEY, null)
  const m = code && all && typeof all === 'object' ? all[code] : null
  return m && typeof m === 'object' ? { ...emptyStats(), ...m } : emptyStats()
}

let timer = null

/**
 * Попытка задания. level — CEFR задания, если раздел его знает; иначе — уровень ученика (setSkillLevel).
 * Без уровня попытка идёт только в общий итог навыка.
 */
export function recordSkill(skill, correct, level = null) {
  if (!SKILLS.includes(skill)) return
  const code = skillLevel(level) || currentLevel
  setMirror(addDelta(readLocalSkillStats(), skill, correct))
  const levelDelta = code ? addLevelDelta({}, code, skill, correct) : {}
  if (code) {
    const all = levelMirrorMem || readJson(LEVEL_MIRROR_KEY, {}) || {}
    setLevelMirror(mergeLevelDeltas(all, levelDelta))
  }
  keepPending(addDelta(emptyStats(), skill, correct), levelDelta)
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
  const pendingLevels = mergeLevelDeltas(readJson(LEVEL_PENDING_KEY, {}), unsavedLevels)
  if (!hasPending(pending)) return
  // Оптимистично очищаем буфер перед отправкой; при сбое возвращаем.
  // removeItem, а не запись пустого: в забитом хранилище запись не пройдёт, и
  // те же дельты ушли бы второй раз.
  unsaved = emptyStats()
  unsavedLevels = {}
  try {
    localStorage.removeItem(PENDING_KEY)
    localStorage.removeItem(LEVEL_PENDING_KEY)
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
    body: JSON.stringify({ deltas: pending, ...(Object.keys(pendingLevels).length ? { byLevel: pendingLevels } : {}) }),
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
      if (sameUser()) keepPending(pending, pendingLevels)
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
  unsavedLevels = {}
  mirrorMem = null
  levelMirrorMem = null
  for (const k of [MIRROR_KEY, PENDING_KEY, LEVEL_MIRROR_KEY, LEVEL_PENDING_KEY]) {
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

/**
 * Навыки текущего уровня с сервера (GET /api/skills?level=…) — то, что показывают «Главная» и Профиль.
 * null — сервер не ответил (тогда экран берёт то, что есть на устройстве).
 */
export async function loadLevelSkillStatsRemote(token, level) {
  const code = skillLevel(level)
  if (!token || !code) return null
  try {
    const res = await fetch(`/api/skills?level=${code}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.levelStats && typeof data.levelStats === 'object') {
      const all = levelMirrorMem || readJson(LEVEL_MIRROR_KEY, {}) || {}
      setLevelMirror({ ...all, [code]: data.levelStats })
      return { ...emptyStats(), ...data.levelStats }
    }
  } catch (e) {
    console.warn('[skill.sync] level load failed', e)
  }
  return null
}
