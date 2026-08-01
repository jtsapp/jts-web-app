// src/app/api/skills/route.js
// Рейтинг навыков по аккаунту. GET — агрегаты 6 навыков, POST — инкремент
// дельтами. Только для залогиненных: аутентификация первична (401 без Bearer).

import { isDbConfigured } from '@/lib/db/sql.js'
import { loadSkillStats, applySkillDeltas } from '@/lib/db/skillStats.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { unauthorizedIfNoBearer } from '@/lib/practiceContract.js'
import { validateDeltas } from '@/lib/skillContract.js'

export const runtime = 'nodejs'

function dbUnavailable() {
  return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
}

export async function GET(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return dbUnavailable()

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    const stats = await loadSkillStats(resolved.id)
    return Response.json({ configured: true, stats })
  } catch (err) {
    console.error('[skills.GET] failed', err)
    return Response.json({ configured: true, error: 'Skill stats lookup failed.' }, { status: 500 })
  }
}

export async function POST(request) {
  const denied = unauthorizedIfNoBearer(request)
  if (denied) return denied
  if (!isDbConfigured()) return dbUnavailable()

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело → провалит валидацию ниже */
  }

  const deltas = validateDeltas(body)
  if (!deltas) {
    return Response.json({ configured: true, error: 'Invalid deltas.' }, { status: 400 })
  }

  const resolved = await resolveProfileId(request, '')
  if ('error' in resolved) return resolved.error

  try {
    await applySkillDeltas(resolved.id, deltas)
    const stats = await loadSkillStats(resolved.id)
    return Response.json({ configured: true, stats })
  } catch (err) {
    console.error('[skills.POST] failed', err)
    return Response.json({ configured: true, error: 'Skill stats save failed.' }, { status: 500 })
  }
}
