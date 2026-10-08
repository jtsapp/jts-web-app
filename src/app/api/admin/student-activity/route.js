// Активность ученика из базы кабинета — для карточки «Мои студенты» в админке
// (spec-student-activity §4.1). Навыки, цель уровня, минуты тьютора и
// тренажёров, решённые задания по дням и разделы «Практики» лежат здесь, а
// карточка ученика — в админке, которая говорит с бэкендом.
//
// Права проверяем чужие: роль — у бэкенда (verifyTokenStatus → GET /user/me).
// ADMIN и MANAGER видят любого ученика, TEACHER — только своего: «свой ли»
// решает бэкенд (GET /admin/students/{id}/activity/access), своего списка
// учеников здесь нет и заводить его нельзя — разошёлся бы с настоящим.
//
// CORS как у /api/admin/tutor-usage: доменов админки несколько (dev, prod,
// локальный). Authorization при `*` работает — заголовок явный, не куки.
import { verifyTokenStatus, profileIdForUser, checkStudentActivityAccess } from '../../../../lib/auth-server.js'
import { isDbConfigured } from '../../../../lib/db/sql.js'
import { loadStudentAppActivity, buildStudentAppActivity } from '../../../../lib/db/studentActivity.js'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const STAFF = new Set(['ADMIN', 'MANAGER'])

// Только десятичные цифры, без знака, пробелов и нулей впереди. Number() принял
// бы и ' 12 ', и '0x10', и '1e3', и '00012', а числа от 2^53 молча округлил бы
// до соседнего целого — и это уже другой ученик.
const STUDENT_ID_RE = /^[1-9]\d*$/

/** Id ученика из строки запроса или null, если это не положительное безопасное целое. */
function parseStudentId(raw) {
  if (!STUDENT_ID_RE.test(raw ?? '')) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) ? id : null
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS })
}

export async function GET(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  const { status, user } = await verifyTokenStatus(token)
  // «Бэкенд недоступен» — не «токен плохой»: 503 говорит «попробуй позже», а
  // 401 разлогинил бы сотрудника.
  if (status === 'unavailable') return json({ error: 'Backend unavailable.' }, 503)
  if (status !== 'ok' || !user) return json({ error: 'Unauthorized.' }, 401)

  // Id проверяем ДО роли и ростера, а не после: checkStudentActivityAccess
  // строит из него адрес бэкенда (/admin/students/{id}/activity/access) и сам его
  // не проверяет. Кривое значение не должно доходить до URL с токеном сотрудника.
  const studentId = parseStudentId(new URL(request.url).searchParams.get('studentId'))
  if (studentId === null) {
    return json({ error: 'studentId is required.' }, 400)
  }

  const role = String(user.role || '').toUpperCase()
  if (!STAFF.has(role)) {
    if (role !== 'TEACHER') return json({ error: 'Forbidden.' }, 403)
    const access = await checkStudentActivityAccess(token, studentId)
    if (access === 'unauthorized') return json({ error: 'Unauthorized.' }, 401)
    if (access === 'unavailable') return json({ error: 'Backend unavailable.' }, 503)
    if (access !== 'allowed') return json({ error: 'Forbidden.' }, 403)
  }

  if (!isDbConfigured()) {
    return json({ configured: false, error: 'Database is not configured.' }, 503)
  }

  try {
    // Ключ ученика в базе кабинета — `user-<id>`, как и во всём приложении.
    const raw = await loadStudentAppActivity(profileIdForUser(studentId))
    return json(buildStudentAppActivity(raw))
  } catch (err) {
    console.error('[admin.student-activity] load failed', err)
    return json({ error: 'Student activity load failed.' }, 500)
  }
}
