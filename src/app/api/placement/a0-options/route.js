// Варианты для A0-моста пробного урока.
//
// Мост даёт выбрать слово вместо ввода, а верное слово лежит в ключах, которых
// в браузере нет (bankSplit.js). Поэтому набор кнопок собирает сервер: в ответ
// уходят четыре слова в перемешанном порядке, без пометки, какое верное.
// Проверка ответа осталась там же, где была, — /api/placement/grade.
//
// Почему это не оракул: варианты не зависят от присланных ответов, а только от
// задания и номера прогона, и повторный запрос той же пары отдаёт то же самое.
// Спрашивать нечего — ответ на вопрос «что верно» роут не даёт ни при каком
// запросе.
//
// `seed` — номер прогона (`session.seed` у клиента). Он не секрет и не
// проверяется: его задача не в защите, а в том, чтобы порядок кнопок не был
// одной и той же константой у всех учеников сразу. Подделав его, ученик лишь
// получит другую раскладку тех же четырёх слов.

import { buildA0Options } from '@/lib/placementA0.js'

export const runtime = 'nodejs'

// Мост — два задания. Восемь с запасом, чтобы запрос не превращался в обход
// банка перебором идентификаторов.
const MAX_IDS = 8

export async function POST(request) {
  let body = {}
  try {
    const parsed = await request.json()
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    /* пустое тело — ниже отдадим 400 */
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return Response.json({ error: 'ids[] is required.' }, { status: 400 })
  }
  if (body.ids.length > MAX_IDS) {
    return Response.json({ error: `Too many ids (max ${MAX_IDS}).` }, { status: 400 })
  }

  const seed = Number.isFinite(body.seed) ? body.seed : null

  try {
    return Response.json({ options: buildA0Options(body.ids.map(String), seed) })
  } catch (err) {
    console.error('[placement.a0-options] failed', err)
    return Response.json({ error: 'Failed to build options.' }, { status: 500 })
  }
}
