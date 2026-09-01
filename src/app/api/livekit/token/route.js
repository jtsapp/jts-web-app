// LiveKit token issuance for the voice tutor, with the free-tier minute cap.
// Next.js App Router route handler (Web Request/Response).
//
// Added for the cheap-tutor plan:
//   * usage cap — refuse a token once over 20 min/day or 300 min/month.
//   * TTL clamped to the remaining daily budget so a session can't overrun.
//   * openSession() so the room_finished webhook can bill the minutes.
//   * JTS tutor keys (dexter/luna/spark) → agent persona ids (bro/gentle/hype).
//   * temper ('calm'/'harsh') — ось 18+, второй характер того же тьютора.
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
  closeStaleSessions,
  DAILY_LIMIT_SEC,
  MONTH_LIMIT_SEC,
} from '@/lib/usage.js'
import { resolveProfileId, bearerFromRequest, fetchTutorLimitOverride } from '@/lib/auth-server.js'
import { isMinor } from '@/lib/birthDate.js'
import { loadProfile } from '@/lib/db/profile.js'
import { SCENARIOS, getScenario } from '@/tutor/scenarios.js'
import { clampTtlForScenario, CLOCK_GRACE_SEC } from '@/tutor/scenarioClock.js'

export const runtime = 'nodejs'

// Адрес ЭТОГО стенда. Уезжает в метаданные комнаты, чтобы общий на дев и прод
// агент писал память и звонки туда, откуда пришёл токен, а не туда, куда
// смотрит его собственный JTS_API_URL. Без этого всё, что агент писал на деве
// (log_fact/log_topic/log_mistake и call_log), молча ложилось в прод-базу:
// дев-история звонков была пуста всегда (поймано 21.08.2026).
//
// Пусто → поле не шлём вовсе, агент остаётся на своём JTS_API_URL. Значит на
// проде переменную можно не заводить: поведение прежнее.
//
// BOM вырезаем как везде: значение из Windows-пайпа приходит с U+FEFF и ломает
// URL (инцидент с BACKEND_URL 17.07.2026).
const APP_PUBLIC_URL = (process.env.APP_PUBLIC_URL || '')
  .replace(/^\uFEFF/, '')
  .trim()
  .replace(/\/+$/, '')

// Ключи UI → id персон в agent.py. У Джарвиса имя совпадает, и строка тут
// формально лишняя (ниже стоит `|| p.tutor`), но без неё таблица врёт: она
// читается как полный список тьюторов, которых знает агент.
const TUTOR_KEY_TO_PERSONA = { dexter: 'bro', luna: 'gentle', spark: 'hype', jarvis: 'jarvis' }

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

// Слаг структурного сценария из запроса. Приводится к [a-z0-9_-], чтобы не
// утащить агента за пределы папки со сценариями (он читает <slug>.md), и
// вынесен в функцию, потому что нужен дважды: в metadata и при расчёте ttl.
// Раньше нормализация жила только внутри buildMetadata — и «911-CALL» уехал бы
// в metadata сценарием, а лимит времени по нему не нашёлся бы.
function scenarioSlug(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return ''
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 64)
}

function buildMetadata(p, tier, profileId, userName, memory, ttl, scenarioLimitSec = 0) {
  const meta = {
    level: p.level || 'B1',
    lang: p.lang || 'en',
    style: p.style || 'friendly',
    goal: p.goal || 'general',
    tier,
    // Серверный бюджет сессии в секундах (ttl уже урезан до остатка дневного
    // лимита). Агент ставит по нему watchdog и удаляет комнату по истечении —
    // клиентский countdown display-only, а TTL LiveKit-токена established-
    // соединение не рвёт. Без этого разговор шёл дольше лимита, а минуты сверх
    // SESSION_CAP_SEC не списывались (см. usage.js).
    sessionTtlSec: ttl,
  }
  // Куда агенту писать. Значение из НАШЕГО env, не из тела запроса — клиент на
  // него не влияет; агент вдобавок сверяет хост со своим JTS_API_URL.
  if (APP_PUBLIC_URL) meta.apiUrl = APP_PUBLIC_URL
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
  // Нрав (ось 18+) едет ОТДЕЛЬНЫМ полем, а не подмешивается в persona: у агента
  // голос, язык и провайдер TTS считаются по базовому id, а характер — по паре
  // (id, нрав). См. persona_key в agent/agent.py. Значение белым списком —
  // строка попадает в системный промпт.
  if (p.temper === 'calm' || p.temper === 'harsh') meta.temper = p.temper
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
  // Прогресс по сценариям: тьютор не переигрывает пройденное и знает, что
  // предложить следующим. Порядок и замки (requires) — из реестра SCENARIOS;
  // nextUnit = первый непройденный, чьё требование уже сдано. Шлём только при
  // реальном прогрессе — новичка на диагностике сценариями не пушим.
  const lessons = Array.isArray(mem.lessons) ? mem.lessons : []
  const passedIds = new Set(
    lessons.filter((l) => l && l.status === 'passed').map((l) => l.lessonKey),
  )
  const passedUnits = SCENARIOS.filter((s) => passedIds.has(s.id)).map((s) => s.label)
  if (passedUnits.length) {
    meta.passedUnits = passedUnits
    const next = SCENARIOS.find(
      (s) => !passedIds.has(s.id) && (!s.requires || passedIds.has(s.requires)),
    )
    if (next) meta.nextUnit = next.label
  }
  // Диагностика навыков и письменный бейзлайн — объекты как есть; агент читает их
  // через _skills()/_writing() для приоритизации слабых мест.
  if (mem.skills && typeof mem.skills === 'object') meta.skills = mem.skills
  if (mem.writing && typeof mem.writing === 'object') meta.writing = mem.writing
  if (p.explanationLang === 'ru' || p.explanationLang === 'kz' || p.explanationLang === 'en')
    meta.explanationLang = p.explanationLang
  // Тумблер «только английский» с дашборда. GET-вариант роута отдаёт строки
  // (Object.fromEntries над searchParams), поэтому принимаем и 'true'.
  if (p.englishOnly === true || p.englishOnly === 'true' || p.englishOnly === '1')
    meta.englishOnly = true
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
  const sid = scenarioSlug(p.scenarioId)
  if (sid) {
    meta.scenarioId = sid
    meta.mode = 'scenario'
    // Бюджет сцены считает issue() и передаёт сюда уже урезанным по дневному
    // остатку: у агента и у экрана должно быть одно и то же число секунд.
    if (scenarioLimitSec > 0) meta.scenarioLimitSec = scenarioLimitSec
  }
  return JSON.stringify(meta)
}

async function issue(p, profileId, userName, limitOverride, birthDate = null) {
  // Жёсткий нрав (ось 18+) несовершеннолетнему не выдаём, даже если запрос
  // пришёл с temper:'harsh' в теле: кнопку в UI мы заперли, но токен просят
  // из браузера, и тело — не доверенный источник. Возраст берём из
  // проверенного /user/me (resolveProfileId), не из запроса. Звонок при этом
  // не рвём — просто спокойный характер того же тьютора.
  if (p.temper === 'harsh' && isMinor(birthDate)) p = { ...p, temper: 'calm' }
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
  // grants a long session. Unset it to restore the daily limit.
  const noLimit = process.env.VOICE_NO_LIMIT === '1' || process.env.VOICE_NO_LIMIT === 'true'

  // Admin-set per-student override (see AdminStudentRestrictionController /
  // GET /mobile/aitutor/limit), fetched by the caller from the verified JWT -
  // never from `p`, same reasoning as `freeTier` below. `??` (not `||`) so an
  // admin-set 0 (fully blocked) is respected rather than falling back to the
  // global default.
  const dailyLimitSec = limitOverride?.dailyLimitSeconds ?? DAILY_LIMIT_SEC
  const monthLimitSec = limitOverride?.monthlyLimitSeconds ?? MONTH_LIMIT_SEC
  // Пул минут на весь тариф: «AI-тьютор 300 минут» на абонемент, 500–2000 у
  // Self Study. Глобального значения по умолчанию у него НЕТ — пул есть только
  // там, где его продали, поэтому null означает «без пула», а не «ноль минут».
  const totalLimitSec = limitOverride?.totalLimitSeconds ?? null
  const totalSince = limitOverride?.totalSince ?? null

  // Потолок одной сессии = дневной лимит (раньше здесь стояло 600 числом, и при
  // подъёме лимита до 20 мин разговор всё равно рвался бы на 10-й минуте).
  let ttl = noLimit ? 3600 : dailyLimitSec
  // tier НИКОГДА не берётся из тела/query запроса: клиент слал {tier:'paid'} и
  // целиком обходил проверку лимита ниже (плюс включал платный Krisp BVC у агента).
  // Платного тарифа сейчас нет — сервер авторитетно держит free, поэтому лимит
  // проверяется всегда (с поправкой на персональный override выше).
  const freeTier = true
  // Лимиты по profileId: у залогиненного минуты держатся за аккаунтом, поэтому
  // их больше не обнулить очисткой localStorage.
  if (!noLimit && freeTier && isDbConfigured() && isValidDeviceId(profileId)) {
    try {
      // Сначала дозакрываем зависшие комнаты этого ученика (потерянный
      // room_finished), иначе их минуты не спишутся никогда и лимит поедет.
      await closeStaleSessions(profileId)
      const { todaySeconds, monthSeconds, totalSeconds } = await getUsage(profileId, totalSince)
      // Пул проверяем ПЕРВЫМ: он про купленный тариф, и когда он исчерпан, дневной
      // остаток значения уже не имеет — сказать «приходите завтра» было бы неправдой.
      if (totalLimitSec != null && totalSeconds >= totalLimitSec) {
        return Response.json(
          { configured: true, limited: true, error: 'total_limit' },
          { status: 403 },
        )
      }
      if (monthSeconds >= monthLimitSec || todaySeconds >= dailyLimitSec) {
        return Response.json(
          {
            configured: true,
            limited: true,
            error: monthSeconds >= monthLimitSec ? 'monthly_limit' : 'daily_limit',
          },
          { status: 403 },
        )
      }
      ttl = Math.max(60, Math.min(dailyLimitSec, dailyLimitSec - todaySeconds))
      // Длина сессии не должна превышать остаток пула: иначе последний разговор
      // ушёл бы в минус и списал больше, чем ученик купил.
      if (totalLimitSec != null) {
        ttl = Math.max(60, Math.min(ttl, totalLimitSec - totalSeconds))
      }
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
  // Сцена со своими часами не занимает весь дневной лимит: и токен, и отсчёт на
  // экране живут по её бюджету. Запас поверх бюджета нужен, чтобы связь рвал
  // таймер сцены, а не протухший токен — истёкший токен рвёт комнату молча, и
  // вердикт до ученика уже не доедет.
  const sceneBudgetSec = getScenario(scenarioSlug(p.scenarioId))?.timeLimitSec || 0
  ttl = clampTtlForScenario(ttl, sceneBudgetSec)
  // Если дневного остатка меньше, чем просит сцена, побеждает остаток — и на
  // экране должен идти он. Иначе таймер отсчитывает обещанные пять минут, а
  // комнату на второй минуте убивает дневной сторож: ученика выкидывает без
  // надписи про связь и без вердикта.
  const scenarioLimitSec = sceneBudgetSec
    ? Math.max(0, Math.min(sceneBudgetSec, ttl - CLOCK_GRACE_SEC))
    : 0

  const metadata = buildMetadata(p, tier, profileId, userName, memory, ttl, scenarioLimitSec)

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

  return Response.json({
    configured: true,
    token,
    url: wsUrl,
    room,
    identity,
    ttl,
    scenarioLimitSec,
  })
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
  const limitOverride = await fetchTutorLimitOverride(bearerFromRequest(request))
  return issue(body, resolved.id, resolved.name, limitOverride, resolved.birthDate)
}

export async function GET(request) {
  const params = new URL(request.url).searchParams
  const p = Object.fromEntries(params)
  const resolved = await resolveProfileId(request, p.deviceId)
  if ('error' in resolved) return resolved.error
  const limitOverride = await fetchTutorLimitOverride(bearerFromRequest(request))
  return issue(p, resolved.id, resolved.name, limitOverride, resolved.birthDate)
}
