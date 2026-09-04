// Подтверждённый уровень после устного собеседования. Зовёт голосовой агент
// tool-ом report_placement_level. Клиент финализирует уровень сам из LiveKit,
// так что это подстраховка: пишет уровень в долговременный профиль.
//
// Порт felix app/api/placement/complete/route.ts.

import { isDbConfigured } from '@/lib/db/sql.js'
import { upsertProfile } from '@/lib/db/profile.js'
import { resolveProfileId } from '@/lib/auth-server.js'
import { profileLevel, sanitizePlacementRecord } from '@/lib/placement.js'
import { scoreGradedAnswers, scorePlacementSession } from '@/lib/placementScore.js'
import { loadPlacementSession, finishPlacementSession } from '@/lib/db/placementSession.js'

export const runtime = 'nodejs'

// A0 добавлен вместе с новым тестом (public/practice/placement/): он ветвится
// на A0 отдельно от θ, и без этого уровня результат новичка молча отбраковывался
// четырёхсоткой — на бэкенде enum LanguageLevel A0 знает давно.
const VALID_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export async function POST(request) {
  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — ниже отдадим 400 */
  }

  const claimed = typeof body.level === 'string' && VALID_LEVELS.includes(body.level) ? body.level : null
  if (!claimed) {
    return Response.json({ configured: isDbConfigured(), error: 'Invalid or missing level.' }, { status: 400 })
  }

  // Уровень считает сервер, а не клиент: раньше он приезжал готовым числом и
  // был утверждением, а не измерением. Источник по убыванию доверия:
  //   1) запись прогона на сервере — он сам проверял эти ответы;
  //   2) журнал от клиента (сырые ответы) — перепроверяется по ключам;
  //   3) заявленный уровень — голосовой placement и старые сборки.
  const run = await loadPlacementSession(body.sessionToken).catch(() => null)
  let scored = null
  if (run && run.answers.length > 0) {
    scored = scoreGradedAnswers(run.answers, body.session?.theta0)
  } else if (body.session && typeof body.session === 'object') {
    scored = scorePlacementSession(body.session)
  }
  const measured = scored && VALID_LEVELS.includes(scored.level) ? scored.level : claimed
  const level = profileLevel(measured)
  if (scored && measured !== claimed) {
    console.warn('[placement.complete] client level %s != server %s', claimed, measured)
  }

  if (run && !run.finished) {
    // Прогон закрыт: повторно отправить его ответы или дописать новые нельзя.
    await finishPlacementSession(run.token, scored?.level ?? claimed).catch(() => {})
  }

  if (!isDbConfigured()) {
    // Сохранить некуда, но уровень посчитан — клиенту он нужен, чтобы не
    // показывать и не записывать свой.
    return Response.json({ configured: false, level, measured, error: 'DATABASE_URL is not set.' }, { status: 200 })
  }

  const resolved = await resolveProfileId(request, body.deviceId)
  if ('error' in resolved) return resolved.error

  // Вместе с уровнем принимаем снимок прохождения: θ, её погрешность и флаги
  // качества (`unresolved` — движок сам не уверен в уровне, `a0_branch` и др.).
  // Без него спорный результат неотличим от уверенного, а банк, который живёт
  // без калибровки, нечем калибровать. Снимок необязателен: голосовой
  // placement и старые клиенты присылают только уровень.
  const snapshot = body.summary || scored
    ? sanitizePlacementRecord(
        measured,
        { ...(body.summary || {}), ...(scored || {}), clientLevel: claimed },
        new Date().toISOString(),
      )
    : undefined

  try {
    await upsertProfile(resolved.id, snapshot ? { level, placement: snapshot } : { level })
    return Response.json({ configured: true, ok: true, level, measured })
  } catch (err) {
    console.error('[placement.complete] failed', err)
    return Response.json({ configured: true, error: 'Placement persist failed.' }, { status: 500 })
  }
}
