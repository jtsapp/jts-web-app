// LiveKit token issuance for the voice tutor, with the free-tier minute cap.
// Next.js App Router route handler (Web Request/Response).
//
// Added for the cheap-tutor plan:
//   * usage cap — refuse a token once over 10 min/day or 300 min/month.
//   * TTL clamped to the remaining daily budget so a session can't overrun.
//   * openSession() so the room_finished webhook can bill the minutes.
//   * JTS tutor keys (dexter/luna/spark) → agent persona ids (bro/gentle/hype).
//   * tier forwarded in metadata (free → agent skips paid Krisp BVC).
//
// Secrets (LIVEKIT_*, DATABASE_URL) live in server env only — never
// NEXT_PUBLIC_, so they never reach the browser bundle.

import { AccessToken } from 'livekit-server-sdk'
import {
  isDbConfigured,
  isValidDeviceId,
  getUsage,
  openSession,
  DAILY_LIMIT_SEC,
  MONTH_LIMIT_SEC,
} from '@/lib/usage.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { loadProfile } from '@/lib/db/profile.js'

export const runtime = 'nodejs'

const TUTOR_KEY_TO_PERSONA = { dexter: 'bro', luna: 'gentle', spark: 'hype' }

const MAX_LEN = 120
function trimStr(s, max = MAX_LEN) {
  if (typeof s !== 'string') return ''
  const t = s.trim().replace(/\s+/g, ' ')
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}
function trimList(raw, cap, maxLen = MAX_LEN) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw) {
    const t = trimStr(item, maxLen)
    if (t) out.push(t)
    if (out.length >= cap) break
  }
  return out
}

function buildMetadata(p, tier, profileId, userName, memory) {
  const meta = {
    level: p.level || 'B1',
    lang: p.lang || 'en',
    style: p.style || 'friendly',
    goal: p.goal || 'general',
    tier,
  }
  // Именно resolveProfileId, а не p.deviceId из тела: у залогиненного это
  // user-<id>, и агент запишет память в аккаунт, а не в device-корзину.
  if (profileId) meta.deviceId = profileId
  // Имя ученика для голосовых сценариев: NPC зовёт его по имени. Только из
  // проверенного токена (resolveProfileId), НЕ из тела запроса — иначе любой
  // подставит чужое. У анонима имени нет, и сцена спросит его сама.
  const name = trimStr(userName, 40)
  if (name) meta.userName = name
  const persona = p.tutor ? TUTOR_KEY_TO_PERSONA[p.tutor] || p.tutor : undefined
  if (persona) meta.tutor = persona
  const interests = trimList(p.interests, 6, 40)
  if (interests.length) meta.interests = interests
  if (typeof p.profession === 'string' && p.profession.trim())
    meta.profession = p.profession.trim().slice(0, 120)
  // Долговременная память ученика. Грузится на СЕРВЕРЕ из БД по проверенному
  // profileId (см. issue → loadProfile), НЕ из тела запроса: иначе клиент мог бы
  // подставить чужие ошибки/слова. Без этого блока тьютор начинал каждую сессию
  // с амнезией — журналы (mistake_log/topic_log/…) копились в Neon через write-back
  // инструменты агента, но обратно в промпт не возвращались. Агент читает эти поля
  // в parse_metadata → format_memory_block/format_skills_block. mistakes уже
  // отфильтрованы от «пройденных» внутри loadProfile.
  const mem = memory || {}
  const mistakes = trimList(mem.mistakes, 8)
  if (mistakes.length) meta.mistakes = mistakes
  const topics = trimList(mem.topics, 10, 60)
  if (topics.length) meta.topics = topics
  const facts = trimList(mem.facts, 10)
  if (facts.length) meta.facts = facts
  const vocab = trimList(mem.vocab, 20, 40)
  if (vocab.length) meta.vocab = vocab
  // Spaced repetition: mistakes whose scheduled review time has passed. Агент
  // поднимает их в уроке и вызывает log_review с результатом (см. reviewItem).
  const dueReviews = trimList(mem.dueReviews, 6)
  if (dueReviews.length) meta.dueReviews = dueReviews
  // Слова из словаря, чей интервал повторения подошёл — тьютор вплетает их в
  // речь и вызывает тот же log_review с результатом.
  const dueVocab = trimList(mem.dueVocab, 6, 40)
  if (dueVocab.length) meta.dueVocab = dueVocab
  // Диагностика навыков и письменный бейзлайн — объекты как есть; агент читает их
  // через _skills()/_writing() для приоритизации слабых мест.
  if (mem.skills && typeof mem.skills === 'object') meta.skills = mem.skills
  if (mem.writing && typeof mem.writing === 'object') meta.writing = mem.writing
  if (p.explanationLang === 'ru' || p.explanationLang === 'kz' || p.explanationLang === 'en')
    meta.explanationLang = p.explanationLang
  if (p.mode === 'placement') {
    meta.mode = 'placement'
    meta.draftLevel = p.draftLevel || meta.level
  }
  if (p.mode === 'debate') {
    meta.mode = 'debate'
    if (typeof p.debateTopic === 'string' && p.debateTopic.trim())
      meta.debateTopic = p.debateTopic.trim().slice(0, 200)
  }
  if (typeof p.scenario === 'string' && p.scenario.trim())
    meta.scenario = p.scenario.trim().slice(0, 400)
  // Structured voice scenario: only the small id travels in metadata — the
  // agent loads the full prompt from data/scenarios/<id>.md. Sanitised to a
  // safe slug so it can't reference anything outside that directory.
  if (typeof p.scenarioId === 'string' && p.scenarioId.trim()) {
    const sid = p.scenarioId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 64)
    if (sid) {
      meta.scenarioId = sid
      meta.mode = 'scenario'
    }
  }
  return JSON.stringify(meta)
}

async function issue(p, profileId, userName) {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const wsUrl = process.env.LIVEKIT_URL
  if (!apiKey || !apiSecret || !wsUrl) {
    return Response.json(
      {
        configured: false,
        error:
          'LiveKit is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL.',
      },
      { status: 503 },
    )
  }

  // Testing escape hatch: VOICE_NO_LIMIT=1 skips the free-tier minute cap and
  // grants a long session. Unset it to restore the 10-min/day limit.
  const noLimit = process.env.VOICE_NO_LIMIT === '1' || process.env.VOICE_NO_LIMIT === 'true'

  let ttl = noLimit ? 3600 : 600 // per-session ceiling (1h while testing, else 10 min)
  const freeTier = p.tier !== 'paid'
  // Лимиты по profileId: у залогиненного минуты держатся за аккаунтом, поэтому
  // их больше не обнулить очисткой localStorage.
  if (!noLimit && freeTier && isDbConfigured() && isValidDeviceId(profileId)) {
    try {
      const { todaySeconds, monthSeconds } = await getUsage(profileId)
      if (monthSeconds >= MONTH_LIMIT_SEC || todaySeconds >= DAILY_LIMIT_SEC) {
        return Response.json(
          {
            configured: true,
            limited: true,
            error: monthSeconds >= MONTH_LIMIT_SEC ? 'monthly_limit' : 'daily_limit',
          },
          { status: 403 },
        )
      }
      ttl = Math.max(60, Math.min(600, DAILY_LIMIT_SEC - todaySeconds))
    } catch (err) {
      console.error('[livekit.token] usage check failed', err)
    }
  }

  const identity = p.identity || `learner-${Math.random().toString(36).slice(2, 10)}`
  const room = p.room || `jts-tutor-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`
  const tier = freeTier ? 'free' : 'paid'

  // Долговременная память ученика для агента: ошибки/темы/факты/словарь/навыки,
  // накопленные write-back инструментами прошлых сессий. Читаем из Neon по
  // проверенному profileId. Мягкий отказ — при неподнятой БД или отсутствии
  // ученика память просто пустая (первая сессия), сессия всё равно стартует.
  let memory = null
  if (isDbConfigured() && isValidDeviceId(profileId)) {
    try {
      memory = await loadProfile(profileId)
    } catch (err) {
      console.error('[livekit.token] loadProfile failed', err)
    }
  }
  const metadata = buildMetadata(p, tier, profileId, userName, memory)

  const at = new AccessToken(apiKey, apiSecret, { identity, ttl, metadata })
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true })
  const token = await at.toJwt()

  if (isDbConfigured() && isValidDeviceId(profileId)) {
    try {
      await openSession(room, profileId)
    } catch (err) {
      console.error('[livekit.token] openSession failed', err)
    }
  }

  return Response.json({ configured: true, token, url: wsUrl, room, identity, ttl })
}

export async function POST(request) {
  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    // empty / malformed body — use defaults
  }
  const resolved = await resolveProfileId(request, body.deviceId)
  if ('error' in resolved) return resolved.error
  return issue(body, resolved.id, resolved.name)
}

export async function GET(request) {
  const params = new URL(request.url).searchParams
  const p = Object.fromEntries(params)
  const resolved = await resolveProfileId(request, p.deviceId)
  if ('error' in resolved) return resolved.error
  return issue(p, resolved.id, resolved.name)
}
