// Профиль ученика для помощника: домашка, расписание, прогресс уровня, минуты
// Speaking Buddy, навыки, фактические минуты за неделю, последние баллы IELTS.
// Нужен только для того, чтобы помощник мог ответить на «дай план на неделю» —
// без этого он видит только текущий экран (см. screenSnapshot.js) и ничего не
// знает о ходе учёбы в целом.
//
// Источники — те же ручки, что уже дёргает сам ученик с клиента (HomePage,
// профиль), плюс своя база (Neon) для навыков/экосистемы/IELTS — читаем её
// напрямую, без похода через собственный /api/skills: тот же процесс, лишний
// HTTP-прыжок не нужен.
//
// Отказоустойчиво по каждому полю: одна упавшая ручка не должна ронять
// остальные и не должна ронять сам чат — ученик получит план из того, что
// удалось собрать, а не 500-ю.
//
// Кэш на профиль ученика: «дай план» — это обычно несколько вопросов подряд
// («…а если начать с грамматики?»), и дёргать шесть источников на каждый было
// бы и медленно, и лишней нагрузкой на бэкенд. TTL короткий: план не должен
// расходиться с реальностью дольше, чем на несколько минут.

import { BACKEND_URL, profileIdForUser, fetchTutorLimitOverride } from '../auth-server.js'
import { isDbConfigured } from '../db/sql.js'
import { loadSkillStats } from '../db/skillStats.js'
import { rankSkills } from '../levelProgress.js'
import { loadEcosystemWeek, buildWeeklySummary } from '../db/ecosystem.js'
import { listIeltsScores } from '../db/ielts.js'

export const CONTEXT_TTL_MS = 3 * 60 * 1000
const IELTS_HISTORY_LIMIT = 3

const cache = new Map() // profileId → { at, text }

async function authGetJson(path, token) {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const settled = (r) => (r.status === 'fulfilled' ? r.value : null)

const dueSoonMs = 4 * 24 * 60 * 60 * 1000 // домашка в горизонте плана «на неделю»
const OPEN_HOMEWORK_DONE = new Set(['SUBMITTED', 'CHECKED', 'COMPLETED', 'GRADED'])

function fmtDate(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function homeworkLines(homework, now) {
  const open = (Array.isArray(homework) ? homework : [])
    .filter((h) => !OPEN_HOMEWORK_DONE.has(String(h?.status || '').toUpperCase()))
    .filter((h) => {
      const t = h?.dueDate ? new Date(h.dueDate).getTime() : NaN
      return Number.isNaN(t) || t - now <= dueSoonMs
    })
  if (!open.length) return null
  const items = open
    .slice(0, 5)
    .map((h) => `«${String(h.title || 'задание').slice(0, 80)}»${h.dueDate ? ` — до ${fmtDate(h.dueDate)}` : ' — без срока'}`)
  return `Домашка (${open.length} к сроку на этой неделе): ${items.join('; ')}.`
}

function scheduleLines(occurrences, now) {
  // null отличаем от []: null значит «сеть не ответила», а не «занятий нет» —
  // писать «нет занятий» по несобранным данным значило бы врать ученику.
  if (!Array.isArray(occurrences)) return null
  const upcoming = occurrences
    .filter((o) => {
      const t = new Date(o?.scheduledAt).getTime()
      return Number.isFinite(t) && t >= now
    })
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 3)
  if (!upcoming.length) return 'Ближайших занятий в расписании нет.'
  const items = upcoming.map((o) => `${fmtDate(o.scheduledAt)}${o.teacherName ? ` с ${o.teacherName}` : ''}`)
  return `Ближайшие занятия: ${items.join('; ')}.`
}

function skillsLine(stats) {
  const ranked = rankSkills(stats)
  if (!ranked.length || ranked.every((r) => r.percent === 0)) return null
  const named = ranked.map((r) => `${r.skill} ${r.percent}%`)
  return `Точность по навыкам (первая попытка): ${named.join(', ')}.`
}

function tutorLine(limit, ecosystemWeek) {
  const parts = []
  if (limit) {
    if (limit.dailyLimitSeconds) parts.push(`дневной лимит ${Math.round(limit.dailyLimitSeconds / 60)} мин`)
    if (limit.monthlyLimitSeconds) parts.push(`месячный лимит ${Math.round(limit.monthlyLimitSeconds / 60)} мин`)
    if (limit.totalLimitSeconds) parts.push(`пул тарифа ${Math.round(limit.totalLimitSeconds / 60)} мин`)
  }
  const weekMin = ecosystemWeek?.ai_tutor?.actualMinutes
  if (Number.isFinite(weekMin)) parts.push(`на этой неделе уже позанимался ${weekMin} мин`)
  if (!parts.length) return null
  return `Speaking Buddy: ${parts.join(', ')}.`
}

function ecosystemLine(ecosystemWeek) {
  if (!ecosystemWeek) return null
  const named = { workbooks: 'воркбуки', shadowing: 'шэдоуинг', vocabulary_sr: 'словарь' }
  const items = Object.entries(named)
    .map(([key, label]) => [label, ecosystemWeek[key]])
    .filter(([, m]) => m && m.tracked === 'measured')
    .map(([label, m]) => `${label} ${m.actualMinutes} мин`)
  if (!items.length) return null
  return `На этой неделе, кроме Speaking Buddy: ${items.join(', ')}.`
}

function ieltsLine(scores) {
  if (!Array.isArray(scores) || !scores.length) return null
  const items = scores
    .slice(0, IELTS_HISTORY_LIMIT)
    .map((s) => `${s.section} ${s.overallBand} (${fmtDate(s.createdAt)})`)
  return `Последние баллы IELTS: ${items.join('; ')}.`
}

/**
 * Собирает и форматирует профиль ученика в текст для промпта. `null`, если не
 * собралось вообще ничего полезного — тогда помощник просто не получит этот
 * блок и останется без персонализации, а не с пустой строкой в промпте.
 */
export async function loadStudentContext(token, user, now = Date.now()) {
  if (!token || !user?.userId) return null
  const profileId = profileIdForUser(user.userId)

  const cached = cache.get(profileId)
  if (cached && now - cached.at < CONTEXT_TTL_MS) return cached.text

  const results = await Promise.allSettled([
    authGetJson('/admin/homework/my', token),
    authGetJson('/admin/lessons/occurrences', token),
    authGetJson('/mobile/level-progress', token),
    fetchTutorLimitOverride(token),
    isDbConfigured() ? loadSkillStats(profileId) : Promise.resolve(null),
    isDbConfigured() ? loadEcosystemWeek(profileId, new Date(now)) : Promise.resolve(null),
    isDbConfigured() ? listIeltsScores(profileId, IELTS_HISTORY_LIMIT) : Promise.resolve(null),
  ])
  const [homework, occurrences, levelProgress, tutorLimit, skillStats, ecosystemRaw, ieltsScores] =
    results.map(settled)

  const lines = [
    levelProgress?.level
      ? `Уровень курса: ${levelProgress.level}${levelProgress.next ? `, цель ${levelProgress.next}` : ''}${
          typeof levelProgress.percent === 'number' ? `, пройдено ${levelProgress.percent}%` : ''
        }.`
      : null,
    skillStats ? skillsLine(skillStats) : null,
    homeworkLines(homework, now),
    scheduleLines(occurrences, now),
    tutorLine(tutorLimit, ecosystemRaw ? buildWeeklySummary(ecosystemRaw) : null),
    ecosystemRaw ? ecosystemLine(buildWeeklySummary(ecosystemRaw)) : null,
    ieltsLine(ieltsScores),
  ].filter(Boolean)

  const text = lines.length ? lines.join('\n') : null
  cache.set(profileId, { at: now, text })
  return text
}

/** Для тестов и на случай смены ученика на этой же вкладке процесса. */
export function clearStudentContextCache() {
  cache.clear()
}
