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
import { levelSkillHighlights, rankLevelSkills } from '../levelProgress.js'
import { loadLevelSkillStats } from '../db/skillStats.js'
import { skillLevel } from '../../practice/skillStatsCore.js'
import { homeworkCards } from '../homeworkList.js'
import { geGoalLine, gePlanToday, homeworkLine, lessonsPackageLine, tokensLine } from './contextLines.js'
import { buildStudentAppActivity, loadStudentAppActivity } from '../db/studentActivity.js'
import { loadAdviceNotes, loadTutorMistakes, loadTutorSessionsSince, markAdviceDone } from '../db/assistantTracker.js'
import { listIeltsScores } from '../db/ielts.js'
import { destinationName, destinationOf } from './destinations.js'
import { pickRecommendation } from './recommend.js'
import { checkNotes, goalLine, mistakesLine, notesLines, practiceLine, weekLine } from './tracker.js'
import { formatLine } from './format.js'

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

function fmtDate(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
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

// Навыки — по заданиям текущего уровня, той же формулой, что «Сильные и слабые стороны» на «Главной» и в Профиле
// (levelShare; ТЗ v2.0, 5.5). «Мало данных» — меньше пяти заданий уровня: такой навык ни сильным, ни слабым не называть.
function skillsLine(stats, level) {
  const ranked = rankLevelSkills(stats)
  if (!ranked.some((r) => r.done > 0)) return null
  const named = ranked.map((r) => (r.percent == null ? `${r.skill} — мало данных (${r.done})` : `${r.skill} ${r.percent}% (${r.done})`))
  return `Навыки (уровень ${level}, % верных с первой попытки в заданиях этого уровня, в скобках — число заданий): ${named.join(', ')}.`
}

function tutorLine(limit, ecosystemWeek) {
  const parts = []
  if (limit) {
    if (limit.dailyLimitSeconds) parts.push(`дневной лимит ${Math.round(limit.dailyLimitSeconds / 60)} мин`)
    if (limit.monthlyLimitSeconds) parts.push(`месячный лимит ${Math.round(limit.monthlyLimitSeconds / 60)} мин`)
    if (limit.totalLimitSeconds) parts.push(`пул тарифа ${Math.round(limit.totalLimitSeconds / 60)} мин`)
  }
  const weekMin = ecosystemWeek?.ai_tutor?.actualMinutes
  // Без рода («позанимался»): пол ученика неизвестен, а модель повторяет слова профиля.
  if (Number.isFinite(weekMin)) parts.push(`на этой неделе занятий ${weekMin} мин`)
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

// Что сделать сейчас — тем же правилом, что карточка «Рекомендация дня» на «Главной» (recommend.js), но с планом дня.
// Порядок: горящая домашка (просрочена или сдавать в ближайшие двое суток) → следующий шаг плана General English (тот
// же, что в блоке «Сегодня», ТЗ v2.0: «следующий шаг = next_step») → остальные правила рекомендации. Домашки в плане
// нет (решение владельца 07.11.2026: «Сегодня» без задач преподавателя), но и «сначала урок курса» при просрочке —
// то самое «всё сделано», которое ТЗ запрещает. Строка несёт и метку раздела: без неё Haiku в первой реплике треть
// раз советовала словами, а кнопку «Открыть» не ставила (замер 15.10.2026).
export function adviceLine({ homework, occurrences, skillStats, planNext = null, now = Date.now() }) {
  const summary = { weakest: skillStats ? levelSkillHighlights(rankLevelSkills(skillStats)).weakest : null }
  const rec = pickRecommendation({
    summary,
    homework: Array.isArray(homework) ? homework : [],
    occurrences: Array.isArray(occurrences) ? occurrences : [],
    now,
  })
  const homeworkFirst = rec?.nav?.to === 'homework'
  if (planNext && !homeworkFirst) return `Совет сайта, что сделать сейчас: ${planNext.name} — ${planNext.reason} (метка [[OPEN ${planNext.id}]]).`
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
/**
 * opts.rewards — токены и призы включены на стенде (окно шлёт areRewardsEnabled): тогда в профиле их баланс.
 */
export async function loadStudentContext(token, user, now = Date.now(), opts = {}) {
  if (!token || !user?.userId) return null
  const profileId = profileIdForUser(user.userId)
  // Ключ кэша — с токенами или без: прогрев звонка (warmStudentContext) флага стенда не знает и не должен оставить
  // в кэше профиль без строки токенов для чата, который её ждёт.
  const key = opts.rewards ? `${profileId}|rewards` : profileId

  const cached = cache.get(key)
  const age = cached ? now - cached.at : Infinity
  if (age < CONTEXT_TTL_MS) return cached.text
  if (age < CONTEXT_STALE_MS) {
    refresh(token, profileId, now, user, opts, key).catch(() => {})
    return cached.text
  }
  return refresh(token, profileId, now, user, opts, key)
}

/** Начать сборку профиля заранее и не ждать её (звонок Луне — при выдаче токена). */
export function warmStudentContext(token, user, opts = {}) {
  loadStudentContext(token, user, Date.now(), opts).catch(() => {})
}

function refresh(token, profileId, now, user, opts = {}, key = profileId) {
  let pending = inflight.get(key)
  if (!pending) {
    pending = buildStudentContext(token, profileId, now, user, opts)
      .then((text) => {
        cache.set(key, { at: now, text })
        return text
      })
      .finally(() => inflight.delete(key))
    inflight.set(key, pending)
  }
  return pending
}

async function buildStudentContext(token, profileId, now, user, { rewards = false } = {}) {
  // Уровень ученика — уровень аккаунта, как в меню и Профиле: по нему «Сильные и слабые стороны».
  const level = skillLevel(user?.languageLevel)
  const results = await Promise.allSettled([
    authGetJson('/admin/homework/my', token),
    authGetJson('/admin/lessons/occurrences', token),
    authGetJson('/mobile/level-progress', token),
    fetchTutorLimitOverride(token),
    isDbConfigured() ? loadTracker(profileId, now) : Promise.resolve(null),
    isDbConfigured() ? listIeltsScores(profileId, IELTS_HISTORY_LIMIT) : Promise.resolve(null),
    // Формат — та же ручка, что у меню (format.js); демо уже известно из /user/me токена.
    user?.isDemoAccount ? Promise.resolve(null) : authGetJson('/cabinet/my-sections', token),
    // Задания с урока — второй источник «Домашней работы» (lib/homeworkList.js), пакет уроков — итоги вкладки «Уроки»,
    // план дня и цель — те же ручки, что у «Главной» (ТЗ v2.0, этап 1).
    authGetJson('/student/assignments', token),
    authGetJson('/admin/lessons/summary', token),
    authGetJson('/mobile/ge/plan', token),
    authGetJson('/mobile/ge/profile', token),
    rewards ? authGetJson('/cabinet/my-tokens', token) : Promise.resolve(null),
    isDbConfigured() && level ? loadLevelSkillStats(profileId, level) : Promise.resolve(null),
  ])
  const [
    homework, occurrences, levelProgress, tutorLimit, tracker, ieltsScores, sections,
    assignments, lessonsSummary, gePlan, geProfile, tokens, levelStats,
  ] = results.map(settled)
  // null — работы не загрузились (не «домашки нет»); задания с урока — как в разделе: их сбой работы не прячет.
  const homeworkList = Array.isArray(homework) ? homeworkCards(homework, Array.isArray(assignments) ? assignments : []) : null
  const skillStats = levelStats || null
  const plan = gePlanToday(gePlan, now)
  const weekModules = tracker?.activity?.week?.modules || null

  // Советы Луны сверяем с данными сайта здесь, когда домашка уже доехала:
  // «сдал домашку после совета» видно только по её submittedAt.
  let notes = []
  if (tracker) {
    const checked = checkNotes(tracker.notes, {
      practice: tracker.activity?.practice ?? null,
      tutorSessions: tracker.tutorSessions,
      homework: homeworkList,
    })
    notes = checked.notes
    if (checked.updates.length) await markAdviceDone(checked.updates).catch(() => {})
  }

  const lines = [
    formatLine({ demo: Boolean(user?.isDemoAccount), sections }),
    levelProgress?.level
      ? `Уровень курса: ${levelProgress.level}${levelProgress.next ? `, следующий уровень ${levelProgress.next}` : ''}${
          typeof levelProgress.percent === 'number' ? `, пройдено ${levelProgress.percent}%` : ''
        }.`
      : null,
    // Цель — из профиля General English, как на баннере «Главной»; старая цель сайта (level_goal) — только если её нет.
    geGoalLine(geProfile) || goalLine(tracker?.activity?.goal),
    skillStats && level ? skillsLine(skillStats, level) : null,
    homeworkLine(homeworkList, now),
    scheduleLines(occurrences, now),
    lessonsPackageLine(lessonsSummary),
    rewards ? tokensLine(tokens, now) : null,
    ...plan.lines,
    tutorLine(tutorLimit, weekModules),
    weekModules ? ecosystemLine(weekModules) : null,
    tracker ? weekLine(tracker.activity?.days, now) : null,
    practiceLine(tracker?.activity?.practice, now),
    mistakesLine(tracker?.mistakes),
    ieltsLine(ieltsScores),
    adviceLine({ homework: homeworkList, occurrences, skillStats, planNext: plan.next, now }),
    notesLines(notes, now),
  ].filter(Boolean)

  // Не собралось ничего, кроме «домашку загрузить не удалось» (бэкенд лёг целиком), — профиля нет вовсе: модель так и
  // скажет, что его не видит, вместо плана из одной строки о сбое.
  const useful = lines.filter((l) => !l.startsWith('Домашку загрузить не удалось'))
  return useful.length ? lines.join('\n') : null
}

/** Для тестов и на случай смены ученика на этой же вкладке процесса. */
export function clearStudentContextCache() {
  cache.clear()
  inflight.clear()
}
