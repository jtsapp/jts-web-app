// Проверка ответов раздела теста на определение уровня.
//
// Ключи не уезжают в браузер вместе с банком (bankSplit.js), поэтому
// правильность ответа знает только сервер: клиент присылает, что выбрал
// студент, и получает долю верного (0..1) — по ней движок на клиенте ведёт
// адаптацию.
//
// Проверка привязана к прогону (`sessionToken`): задание в его рамках
// проверяется один раз, повтор возвращает уже вынесенный вердикт, число
// заданий ограничено, а закрытый прогон ответов не принимает. Без этого роут
// был бы оракулом — четыре запроса на задание, и ключ известен. Сами же
// проверенные ответы остаются на сервере: по ним, а не по журналу клиента,
// считается итоговый уровень (/api/placement/complete).
//
// Без базы (dev, preview) прогонов нет: проверка работает без привязки.

import { gradeAnswers } from '@/lib/placementScore.js'
import { mergeGradedAnswers } from '@/lib/placementSessionLogic.js'
import {
  loadPlacementSession, appendPlacementAnswers, MAX_GRADED_PER_SESSION,
} from '@/lib/db/placementSession.js'

export const runtime = 'nodejs'

// Раздел теста — не больше десятка заданий; аудирование одной записи — до шести
// вопросов на экране. Сорок с запасом покрывает любой раздел.
const MAX_ANSWERS = 40

export async function POST(request) {
  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — ниже отдадим 400 */
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return Response.json({ error: 'answers[] is required.' }, { status: 400 })
  }
  if (body.answers.length > MAX_ANSWERS) {
    return Response.json({ error: `Too many answers (max ${MAX_ANSWERS}).` }, { status: 400 })
  }

  try {
    const session = await loadPlacementSession(body.sessionToken)

    // Прогона нет (нет базы или токен незнакомый) — проверяем без привязки.
    if (!session) {
      return Response.json({ scores: gradeAnswers(body.answers), session: false })
    }
    if (session.finished) {
      return Response.json({ error: 'Placement session is finished.' }, { status: 409 })
    }

    const fresh = gradeAnswers(body.answers)
    const merged = mergeGradedAnswers(session.answers, fresh, {
      max: MAX_GRADED_PER_SESSION,
      at: new Date().toISOString(),
    })
    if (merged.overflow) {
      return Response.json({ error: 'Too many answers in this session.' }, { status: 409 })
    }
    if (merged.added > 0) await appendPlacementAnswers(session.token, merged.answers)

    return Response.json({ scores: merged.scores, session: true })
  } catch (err) {
    console.error('[placement.grade] failed', err)
    return Response.json({ error: 'Grading failed.' }, { status: 500 })
  }
}
