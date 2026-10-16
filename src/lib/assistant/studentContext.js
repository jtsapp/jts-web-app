// Профиль ученика для помощника: домашка, расписание, прогресс уровня, минуты
// Speaking Buddy, навыки, фактические минуты за неделю, последние баллы IELTS.
// Нужен только для того, чтобы помощник мог ответить на «дай план на неделю» —
// без этого он видит только текущий экран (см. screenSnapshot.js) и ничего не
// знает о ходе учёбы в целом.
//
// С 15.10.2026 здесь же трекер (tracker.js): цель, две недели рядом, давно не
// открытые разделы Практики, ошибки из звонков Speaking Buddy и заметки Луны о
// её прошлых советах — выполнены ли они, решают данные сайта.
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
//
// С 16.10.2026 протухший профиль отдаётся сразу, а свежий собирается в фоне
// (CONTEXT_STALE_MS). Причина — звонок Луне: реплики там идут каждые 10–30 с, и
// раз в три минуты одна из них стояла, пока шесть ручек бэкенда и пять запросов
// к базе соберут профиль заново, — секунды тишины посреди разговора (первая
// реплика живого звонка ждала ~9 с). Цена — один ответ по профилю старше трёх
// минут, но не старше пятнадцати. Звонок к тому же греет кэш заранее, при выдаче
// токена (warmStudentContext в api/assistant/call).

import { BACKEND_URL, profileIdForUser, fetchTutorLimitOverride } from '../auth-server.js'
import { isDbConfigured } from '../db/sql.js'
import { rankSkills, skillHighlights } from '../levelProgress.js'
import { buildStudentAppActivity, loadStudentAppActivity } from '../db/studentActivity.js'
import { loadAdviceNotes, loadTutorMistakes, loadTutorSessionsSince, markAdviceDone } from '../db/assistantTracker.js'
import { listIeltsScores } from '../db/ielts.js'
import { destinationName, destinationOf } from './destinations.js'
import { pickRecommendation } from './recommend.js'
import { checkNotes, goalLine, mistakesLine, notesLines, practiceLine, weekLine } from './tracker.js'

export const CONTEXT_TTL_MS = 3 * 60 * 1000
// Дольше этого протухший профиль ответом не служит — вопрос ждёт свежий.
export const CONTEXT_STALE_MS = 15 * 60 * 1000
const IELTS_HISTORY_LIMIT = 3

const cache = new Map() // profileId → { at, text }
// Сборка в пути: черновой и окончательный вопрос звонка приходят почти разом,
// и каждый не должен дёргать бэкенд заново.
const inflight = new Map() // profileId → Promise<string|null>

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

const DAY_MS = 24 * 60 * 60 * 1000

// Сколько дней до срока — считаем сами: с одной датой «Сегодня» Haiku называла
// срок через два дня «завтра» или «уже просрочено» (замер 15.10.2026). Дни
// календарные, по UTC, как и сами даты строки.
function dueIn(iso, now) {
  const due = fmtDate(iso)
  if (!due) return ''
  const days = Math.round((Date.parse(due) - Date.parse(new Date(now).toISOString().slice(0, 10))) / DAY_MS)
  if (days < 0) return ' (просрочено)'
  if (days === 0) return ' (сегодня)'
  if (days === 1) return ' (завтра)'
  return ` (через ${days} дн.)`
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
    .map((h) => `«${String(h.title || 'задание').slice(0, 80)}»${h.dueDate ? ` — до ${fmtDate(h.dueDate)}${dueIn(h.dueDate, now)}` : ' — без срока'}`)
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

const ADVICE_REASONS = {
  'home.recommend.hwOverdue': () => 'срок домашки уже прошёл',
  'home.recommend.hwSoon': () => 'домашку сдавать в ближайшие двое суток',
  'home.recommend.weakSkill': (vars) => `самый слабый навык — ${vars?.skill}`,
  'home.recommend.noLesson': () => 'больше двух недель без живого занятия',
}

// Что сделать сейчас — тем же правилом, что карточка «Рекомендация дня» на
// «Главной» (recommend.js): Луна-преподаватель и карточка не должны советовать
// разное. Строка несёт и метку раздела: без неё Haiku в первой реплике треть раз
// советовала словами, а кнопку «Открыть» не ставила (замер 15.10.2026).
export function adviceLine({ homework, occurrences, skillStats, now = Date.now() }) {
  const summary = { weakest: skillStats ? skillHighlights(rankSkills(skillStats)).weakest : null }
  const rec = pickRecommendation({
    summary,
    homework: Array.isArray(homework) ? homework : [],
    occurrences: Array.isArray(occurrences) ? occurrences : [],
    now,
  })
  if (!rec) return null
  // nav карточки → раздел Луны: «Практика» с фильтром — свой раздел (grammar).
  const id = rec.nav.payload?.filter || rec.nav.to
  const reason = ADVICE_REASONS[rec.reasonKey]
  if (!destinationOf(id) || !reason) return null
  return `Совет сайта, что сделать сейчас: ${destinationName(id)} — ${reason(rec.reasonVars)} (метка [[OPEN ${id}]]).`
}

/**
 * Своя база для трекера (lib/assistant/tracker.js): активность ученика — та же
 * сборка, что карточка у преподавателя (навыки, цель, неделя, дни, разделы
 * Практики), заметки Луны, звонки тьютора после самого старого невыполненного
 * совета и ошибки из звонков. По одному запросу за раз: пул соединений общий с
 * живыми учениками (studentActivity.js), а профиль кэшируется на CONTEXT_TTL_MS.
 */
async function loadTracker(profileId, now) {
  const raw = await loadStudentAppActivity(profileId, new Date(now))
  const notes = await loadAdviceNotes(profileId)
  const oldestOpen = notes.filter((n) => !n.doneAt).map((n) => n.createdAt).sort()[0]
  const tutorSessions = oldestOpen ? await loadTutorSessionsSince(profileId, oldestOpen) : []
  const mistakes = await loadTutorMistakes(profileId)
  return { raw, activity: buildStudentAppActivity(raw), notes, tutorSessions, mistakes }
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
  const age = cached ? now - cached.at : Infinity
  if (age < CONTEXT_TTL_MS) return cached.text
  if (age < CONTEXT_STALE_MS) {
    refresh(token, profileId, now).catch(() => {})
    return cached.text
  }
  return refresh(token, profileId, now)
}

/** Начать сборку профиля заранее и не ждать её (звонок Луне — при выдаче токена). */
export function warmStudentContext(token, user) {
  loadStudentContext(token, user).catch(() => {})
}

function refresh(token, profileId, now) {
  let pending = inflight.get(profileId)
  if (!pending) {
    pending = buildStudentContext(token, profileId, now)
      .then((text) => {
        cache.set(profileId, { at: now, text })
        return text
      })
      .finally(() => inflight.delete(profileId))
    inflight.set(profileId, pending)
  }
  return pending
}

async function buildStudentContext(token, profileId, now) {
  const results = await Promise.allSettled([
    authGetJson('/admin/homework/my', token),
    authGetJson('/admin/lessons/occurrences', token),
    authGetJson('/mobile/level-progress', token),
    fetchTutorLimitOverride(token),
    isDbConfigured() ? loadTracker(profileId, now) : Promise.resolve(null),
    isDbConfigured() ? listIeltsScores(profileId, IELTS_HISTORY_LIMIT) : Promise.resolve(null),
  ])
  const [homework, occurrences, levelProgress, tutorLimit, tracker, ieltsScores] = results.map(settled)
  const skillStats = tracker?.raw?.stats || null
  const weekModules = tracker?.activity?.week?.modules || null

  // Советы Луны сверяем с данными сайта здесь, когда домашка уже доехала:
  // «сдал домашку после совета» видно только по её submittedAt.
  let notes = []
  if (tracker) {
    const checked = checkNotes(tracker.notes, {
      practice: tracker.activity?.practice ?? null,
      tutorSessions: tracker.tutorSessions,
      homework: Array.isArray(homework) ? homework : null,
    })
    notes = checked.notes
    if (checked.updates.length) await markAdviceDone(checked.updates).catch(() => {})
  }

  const lines = [
    levelProgress?.level
      ? `Уровень курса: ${levelProgress.level}${levelProgress.next ? `, цель ${levelProgress.next}` : ''}${
          typeof levelProgress.percent === 'number' ? `, пройдено ${levelProgress.percent}%` : ''
        }.`
      : null,
    goalLine(tracker?.activity?.goal),
    skillStats ? skillsLine(skillStats) : null,
    homeworkLines(homework, now),
    scheduleLines(occurrences, now),
    tutorLine(tutorLimit, weekModules),
    weekModules ? ecosystemLine(weekModules) : null,
    tracker ? weekLine(tracker.activity?.days, now) : null,
    practiceLine(tracker?.activity?.practice, now),
    mistakesLine(tracker?.mistakes),
    ieltsLine(ieltsScores),
    adviceLine({ homework, occurrences, skillStats, now }),
    notesLines(notes, now),
  ].filter(Boolean)

  return lines.length ? lines.join('\n') : null
}

/** Для тестов и на случай смены ученика на этой же вкладке процесса. */
export function clearStudentContextCache() {
  cache.clear()
  inflight.clear()
}
