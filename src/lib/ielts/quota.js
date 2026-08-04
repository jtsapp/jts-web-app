// Shared monthly IELTS-attempt quota check for the three submit routes
// (assess-writing, assess-speaking, record-section) - each does the same
// "resolve identity once, ask the backend for the configured limit, count
// this month's attempts" before paying for the expensive grading call.
// Anonymous/invalid identity is NOT gated here (matches this app's existing
// tolerance for anonymous IELTS attempts) - only a resolved user can even
// have a quota, since it's keyed by the backend's own User id.

import { resolveProfileId, bearerFromRequest, fetchContentQuota } from '../auth-server.js'
import { countIeltsAttemptsSince } from '../db/ielts.js'

export async function checkIeltsQuota(request, deviceId) {
  const resolved = await resolveProfileId(request, deviceId ?? null)
  if ('error' in resolved) return { resolved, blocked: false }

  const limit = await fetchContentQuota(bearerFromRequest(request), 'IELTS')
  if (limit == null) return { resolved, blocked: false }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const used = await countIeltsAttemptsSince(resolved.id, startOfMonth)
  return { resolved, blocked: used >= limit, limit, used }
}
