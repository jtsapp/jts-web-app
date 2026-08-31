// Проверка ответов раздела теста на определение уровня.
//
// Ключи больше не уезжают в браузер вместе с банком (bankSplit.js), поэтому
// правильность ответа знает только сервер: клиент присылает, что выбрал
// студент, и получает долю верного (0..1) — по ней движок на клиенте ведёт
// адаптацию. Итоговый уровень всё равно пересчитывается заново из журнала
// (/api/placement/complete): здешние доли — для хода теста, а не для оценки.
//
// Чего роут не закрывает: он отвечает на любой ответ, поэтому ключ можно
// подобрать перебором (четыре запроса на задание). Следующий шаг — привязать
// проверку к серверной сессии прогона и не давать проверять одно задание
// дважды; сейчас важнее было убрать ключи из открытого файла.

import { gradeAnswers } from '@/lib/placementScore.js'

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
    return Response.json({ scores: gradeAnswers(body.answers) })
  } catch (err) {
    console.error('[placement.grade] failed', err)
    return Response.json({ error: 'Grading failed.' }, { status: 500 })
  }
}
