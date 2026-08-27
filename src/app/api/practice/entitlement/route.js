// "Can this student open this practice module right now" - checked BEFORE
// content renders (unlike /api/practice/state, which only records progress
// after the fact). Demo accounts get a completion cap per module, configured
// admin-side (see backend ContentQuotaService); this app owns the completion
// count itself (done-arrays for grammar/listening/shadowing, seenCount for
// vocab) since that data lives in this app's own DB, not the Java backend's -
// the backend is only asked for the configured limit.

import { isDbConfigured } from '@/lib/db/sql.js'
import { loadPracticeState } from '@/lib/db/practice.js'
import { resolveProfileId, bearerFromRequest, fetchContentQuota } from '@/lib/auth-server.js'
import { isValidModule, unauthorizedIfNoBearer } from '@/lib/practiceContract.js'

export const runtime = 'nodejs'

// Same module keys as practiceContract.js, mapped to the backend's ContentType.
const CONTENT_TYPE_BY_MODULE = {
  grammar: 'PRACTICE_GRAMMAR',
  vocab: 'PRACTICE_VOCAB',
  listening: 'PRACTICE_LISTENING',
  shadowing: 'PRACTICE_SHADOWING',
  // Статические уровни «Speaking Practice A1–C1»; единица счёта — открытый
  // уровень (из 5), см. ContentType.PRACTICE_SITUATIONS на бэкенде.
  situations: 'PRACTICE_SITUATIONS',
  // Воркбуки A0–B2 (public/practice/workbooks/); единица — открытый уровень.
  workbooks: 'PRACTICE_WORKBOOKS',
}

function completedCountFor(moduleName, state) {
  if (moduleName === 'vocab') return state.vocab?.seenCount ?? 0
  return state[moduleName]?.done?.length ?? 0
}

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const moduleName = searchParams.get('module')
  if (!isValidModule(moduleName)) {
    return Response.json({ configured: true, error: 'Unknown module.' }, { status: 400 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  // No DB → no progress ever recorded → nothing to cap against yet.
  const state = isDbConfigured() ? await loadPracticeState(resolved.id) : { vocab: {}, grammar: { done: [] }, listening: { done: [] } }
  const completed = completedCountFor(moduleName, state)
  const limit = await fetchContentQuota(bearerFromRequest(request), CONTENT_TYPE_BY_MODULE[moduleName])

  return Response.json({
    configured: true,
    allowed: limit == null || completed < limit,
    limit,
    completed,
  })
}
