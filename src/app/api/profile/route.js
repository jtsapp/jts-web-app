// Профиль ученика: GET — вся долговременная память (уровень, интересы,
// профессия, ошибки, темы, факты, словарь, уроки), POST — правка настроек.
//
// Порт felix app/api/profile/route.ts.

import { isDbConfigured } from '@/lib/db/sql.js'
import { loadProfile, upsertProfile } from '@/lib/db/profile.js'
import { resolveProfileId } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

function configCheck() {
  if (!isDbConfigured()) {
    return Response.json({ configured: false, error: 'DATABASE_URL is not set.' }, { status: 503 })
  }
  return null
}

export async function GET(request) {
  const blocked = configCheck()
  if (blocked) return blocked

  const clientDeviceId = new URL(request.url).searchParams.get('deviceId') ?? ''
  const resolved = await resolveProfileId(request, clientDeviceId)
  if ('error' in resolved) return resolved.error

  try {
    const profile = await loadProfile(resolved.id)
    return Response.json({ configured: true, profile })
  } catch (err) {
    console.error('[profile.GET] failed', err)
    return Response.json({ configured: true, error: 'Profile lookup failed.' }, { status: 500 })
  }
}

function sanitizeSkills(raw) {
  if (raw === undefined) return undefined
  if (raw === null) return null
  if (typeof raw !== 'object') return undefined
  const pick = (k) => {
    const v = raw[k]
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null
  }
  return {
    grammar: pick('grammar'),
    vocab: pick('vocab'),
    reading: pick('reading'),
    listening: pick('listening'),
    speak: pick('speak'),
  }
}

function sanitizeWriting(raw) {
  if (raw === undefined) return undefined
  if (raw === null) return null
  if (typeof raw !== 'object') return undefined
  const clamp = (v) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0
  const strList = (v, cap) =>
    Array.isArray(v)
      ? v
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .filter(Boolean)
          .slice(0, cap)
      : []
  return {
    grammar: clamp(raw.grammar),
    vocab: clamp(raw.vocab),
    coherence: clamp(raw.coherence),
    focus: strList(raw.focus, 6),
    strengths: strList(raw.strengths, 4),
  }
}

export async function POST(request) {
  const blocked = configCheck()
  if (blocked) return blocked

  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело допустимо — патч будет пустым */
  }

  const resolved = await resolveProfileId(request, body.deviceId)
  if ('error' in resolved) return resolved.error

  // Ключ «есть в теле» ≠ «непустой»: явный null должен уметь очистить поле,
  // поэтому проверяем наличие ключа, а не истинность значения.
  const patch = {}
  if ('level' in body) patch.level = body.level ?? null
  if ('lang' in body) patch.lang = body.lang ?? null
  if ('style' in body) patch.style = body.style ?? null
  if ('goal' in body) patch.goal = body.goal ?? null
  if ('tutor' in body) patch.tutor = body.tutor ?? null
  if ('profession' in body) {
    const p = typeof body.profession === 'string' ? body.profession.trim() : ''
    patch.profession = p ? p.slice(0, 120) : null
  }
  if ('interests' in body) {
    patch.interests = Array.isArray(body.interests)
      ? body.interests
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .filter(Boolean)
          .slice(0, 12)
      : []
  }
  if ('minutesPerDay' in body) {
    patch.minutesPerDay = typeof body.minutesPerDay === 'number' ? body.minutesPerDay : null
  }
  const skills = sanitizeSkills(body.skills)
  if (skills !== undefined) patch.skills = skills
  const writing = sanitizeWriting(body.writing)
  if (writing !== undefined) patch.writing = writing

  try {
    await upsertProfile(resolved.id, patch)
    return Response.json({ configured: true, ok: true })
  } catch (err) {
    console.error('[profile.POST] failed', err)
    return Response.json({ configured: true, error: 'Profile upsert failed.' }, { status: 500 })
  }
}
