// Журнал ответов Луны и их оценка учеником (ТЗ v2.0, 8.5; спека docs/superpowers/specs/2026-11-08-luna-answer-rating-design.md).
//
// POST — окно Луны: строка на каждый ответ модели (когда дописан), затем в ту же строку — первый звук, 👍/👎 с
// причиной, нажатая кнопка под ответом. Только со входом, как сам чат: гостю Луна недоступна. Персональные данные
// вычищаются здесь, до записи (scrubPersonal): окну это доверять нельзя.
//
// GET — выгрузка для еженедельного разбора (scripts/assistant-eval/weekly-review.js), только с x-internal-key, как
// DELETE /api/tts. Ученик в ней — псевдоним: HMAC с тем же ключом, по нему видно «тот же ученик», но не кто это.

import { createHmac } from 'node:crypto'
import { bearerFromRequest, isTrustedInternalCaller, verifyTokenStatus } from '@/lib/auth-server.js'
import { createRateLimiter } from '@/lib/assistant/rateLimit.js'
import { RatingRequestError, hasFeedback, parseRatingRequest, scrubPersonal } from '@/lib/assistant/ratingShape.js'
import { answerMode } from '@/lib/assistant/ratingMode.js'
import { assistantPersona } from '@/lib/assistant/persona.js'
import { loadRatingsForReview, saveAnswerRating } from '@/lib/db/assistantRatings.js'

export const runtime = 'nodejs'

// На ответ уходит 1–3 записи (журнал, первый звук, оценка или кнопка), а звонок Луне даёт до 200 ответов за 10 минут
// (лимит звонка в chat/route.js). Потолок — от петли в окне, а не от ученика.
const takeQuota = createRateLimiter({ windowLimit: 300, dayLimit: 3000 })

const DAY_MS = 24 * 60 * 60 * 1000
const REVIEW_MAX_DAYS = 31

const json = (status, body, headers = {}) => Response.json(body, { status, headers })

// «off» — пишем только то, где есть слово ученика (оценка, комментарий, нажатие): журнал всех ответов выключен.
const logAll = () => String(process.env.ASSISTANT_ANSWER_LOG || '').trim().toLowerCase() !== 'off'

export async function POST(request) {
  const bearer = bearerFromRequest(request)
  const auth = await verifyTokenStatus(bearer)
  if (auth.status === 'unavailable') return json(503, { error: 'backend_unavailable' })
  if (auth.status !== 'ok') return json(401, { error: 'unauthorized' })

  const key = `user-${auth.user.userId}`
  const quota = takeQuota(key)
  if (!quota.ok) return json(429, { error: 'rate_limited', retryAfterSec: quota.retryAfterSec }, { 'retry-after': String(quota.retryAfterSec) })

  let entry
  try {
    entry = parseRatingRequest(await request.json())
  } catch (err) {
    if (err instanceof RatingRequestError || err instanceof SyntaxError) return json(400, { error: 'bad_request' })
    throw err
  }
  if (!logAll() && !hasFeedback(entry)) return json(200, { saved: false, reason: 'log_off' })

  const user = { name: auth.user.name, phone: auth.user.phone, email: auth.user.email }
  const { mode, opening, event } = answerMode(entry.question)
  const saved = await saveAnswerRating(key, {
    ...entry,
    question: scrubPersonal(entry.question, user),
    answer: scrubPersonal(entry.answer, user),
    comment: scrubPersonal(entry.comment, user),
    mode,
    opening,
    event,
    persona: assistantPersona(entry.lang).id,
  })
  return json(200, { saved })
}

function parseDay(value, fallback) {
  if (!value) return fallback
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d : null
}

export async function GET(request) {
  if (!isTrustedInternalCaller(request)) return json(401, { error: 'unauthorized' })
  const q = new URL(request.url).searchParams
  const to = parseDay(q.get('to'), new Date())
  const from = parseDay(q.get('from'), to ? new Date(to.getTime() - 7 * DAY_MS) : null)
  if (!from || !to || from >= to || to - from > REVIEW_MAX_DAYS * DAY_MS) return json(400, { error: 'bad_period' })
  const secret = process.env.INTERNAL_API_KEY || ''
  const pseudonym = (profileId) => createHmac('sha256', secret).update(String(profileId)).digest('hex').slice(0, 10)
  const rows = await loadRatingsForReview({ from, to, pseudonym })
  return json(200, { from: from.toISOString(), to: to.toISOString(), rows }, { 'cache-control': 'no-store' })
}
