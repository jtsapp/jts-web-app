// Недельная сводка экосистемы для блока прогресса на главной (ТЗ «Roadmap & AI
// Notification Engine», ECOSYSTEM_WEEKLY_GOALS): сколько минут студент реально
// потратил на каждый из пяти тренажёров за текущую ISO-неделю.
//
// Личность решает resolveProfileId — Bearer → user-<id>, иначе deviceId, тот же
// путь, что у /api/profile/calls. Никаких id из тела запроса.
//
// Цели (target) пока приходят параметром homeworkMinutesPerDay: таблицы roadmaps
// ещё нет, а показывать «дефицит» без плана нельзя. Когда план будет храниться,
// параметр убрать и читать план по profileId.
//
// completed_lessons из ТЗ сюда не входит: прогресс «Обучения» держит JTS-бэкенд,
// а не наша база (подробности — в комментарии lib/db/ecosystem.js).

import { loadEcosystemWeek, buildWeeklySummary } from '@/lib/db/ecosystem.js'
import { isDbConfigured } from '@/lib/db/sql.js'
import { resolveProfileId } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

// Потолок домашки в сутки — сутки и есть. Дальше цифра не имеет смысла, а без
// отсечки любой мусор из query улетал бы в расчёт целей.
const MAX_HOMEWORK_MINUTES_PER_DAY = 1440

export async function GET(request) {
  const params = new URL(request.url).searchParams
  const resolved = await resolveProfileId(request, params.get('deviceId'))
  if ('error' in resolved) return resolved.error

  const askedHw = Number.parseInt(params.get('homeworkMinutesPerDay') ?? '', 10)
  const homeworkMinutesPerDay =
    Number.isFinite(askedHw) && askedHw > 0
      ? Math.min(MAX_HOMEWORK_MINUTES_PER_DAY, askedHw)
      : null

  if (!isDbConfigured()) {
    // Без базы отдаём каркас с нулями: экран рисуется, цифры честно пустые.
    const week = await loadEcosystemWeek(resolved.id)
    return Response.json({
      configured: false,
      weekKey: week.weekKey,
      weekStart: week.weekStart,
      modules: buildWeeklySummary({ homeworkMinutesPerDay }),
    })
  }

  try {
    const week = await loadEcosystemWeek(resolved.id)
    return Response.json({
      configured: true,
      weekKey: week.weekKey,
      weekStart: week.weekStart,
      modules: buildWeeklySummary({ ...week, homeworkMinutesPerDay }),
    })
  } catch (err) {
    console.error('[profile.ecosystem] load failed', err)
    // Мягкий отказ: сводка — украшение дашборда, пустые цифры лучше 500.
    return Response.json({
      configured: true,
      weekKey: null,
      weekStart: null,
      modules: buildWeeklySummary({ homeworkMinutesPerDay }),
    })
  }
}
