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
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'

export const runtime = 'nodejs'

// Module keys → backend ContentType. books/memes/tales не в PRACTICE_MODULES
// (нет practice-state для них) — только entitlement/quota.
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
  writing: 'PRACTICE_WRITING',
  // Whole-area: прогресс не в practice DB. completed=0 → лимит 0 закрывает
  // раздел; положительный лимит для книг досчитывается на клиенте по
  // audiobooks.completed. Мемы/сказки — по сути on/off (0 или без лимита).
  books: 'PRACTICE_BOOKS',
  memes: 'PRACTICE_MEMES',
  tales: 'PRACTICE_TALES',
}

function isEntitlementModule(moduleName) {
  return Object.prototype.hasOwnProperty.call(CONTENT_TYPE_BY_MODULE, moduleName)
}

function completedCountFor(moduleName, state) {
  if (moduleName === 'vocab') return state.vocab?.seenCount ?? 0
  // У writing state — объект {tasks, seen}, а не done-массив: единица счёта —
  // закрытое задание жанра.
  if (moduleName === 'writing') return Object.keys(state.writing?.tasks ?? {}).length
  // books/memes/tales — нет done в practice state (см. CONTENT_TYPE_BY_MODULE).
  if (moduleName === 'books' || moduleName === 'memes' || moduleName === 'tales') return 0
  return state[moduleName]?.done?.length ?? 0
}

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const moduleName = searchParams.get('module')
  if (!isEntitlementModule(moduleName)) {
    return Response.json({ configured: true, error: 'Unknown module.' }, { status: 400 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  // No DB → no progress ever recorded → nothing to cap against yet.
  const state = isDbConfigured() ? await loadPracticeState(resolved.id) : { vocab: {}, grammar: { done: [] }, listening: { done: [] } }
  const completed = completedCountFor(moduleName, state)
  const quota = await fetchContentQuota(bearerFromRequest(request), CONTENT_TYPE_BY_MODULE[moduleName])
  const limit = quota?.limit ?? null

  return Response.json({
    configured: true,
    allowed: limit == null || completed < limit,
    limit,
    completed,
    source: quota?.source || 'NONE',
    sourceName: quota?.sourceName || null,
    // Отвечаем 200 и при сбое похода за квотой (fail-open, см.
    // fetchContentQuota), поэтому по одному limit: null клиент не отличил бы
    // «потолка нет» от «спросить не удалось» и кэшировал бы сбой как «лимита
    // нет» до конца жизни экрана. Признак этого различения — здесь.
    quotaKnown: quota?.known !== false,
  })
}
