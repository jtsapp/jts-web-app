// Расход минут голосового тьютора одним учеником — чтение и сброс за сегодня.
//
// Ручка поддержки для панели администратора. Она нужна потому, что минуты
// живут ЗДЕСЬ (voice_usage/voice_session в базе этого приложения), а карточка
// ученика — в бэкенде: у него этих таблиц нет и быть не должно. Раньше сброс
// делали руками, заходя в контейнер с psql, и каждый такой случай стоил
// администратору похода на сервер.
//
// Права проверяем чужие: токен выдал бэкенд, он же знает роль — спрашиваем у
// него (verifyTokenStatus → GET /user/me) и пускаем только ADMIN и MANAGER.
// Своего списка администраторов здесь нет и заводить его нельзя: разошёлся бы
// с настоящим при первом же изменении ролей.
//
// CORS как у /api/practice/catalog: домен админки не один (dev, prod,
// локальный), и вести их список значило бы ломать доступ при каждом переезде.
// Заголовок Authorization при `*` работает — запрос идёт с явным заголовком, а
// не с куками.
import { verifyTokenStatus, profileIdForUser } from '../../../../lib/auth-server.js'
import { getUsage, resetTodayUsage, isDbConfigured, DAILY_LIMIT_SEC } from '../../../../lib/usage.js'

export const runtime = 'nodejs'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const STAFF = new Set(['ADMIN', 'MANAGER'])

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS })
}

/** Проверка прав и разбор ученика. Возвращает { deviceId } либо готовый ответ. */
async function resolve(request, studentIdRaw) {
  if (!isDbConfigured()) {
    return { error: json({ error: 'Usage database is not configured.' }, 503) }
  }
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  const { status, user } = await verifyTokenStatus(token)
  // «Бэкенд недоступен» — не то же самое, что «токен плохой»: 503 говорит
  // администратору «попробуй позже», а 401 отправил бы его перелогиниваться.
  if (status === 'unavailable') return { error: json({ error: 'Backend unavailable.' }, 503) }
  if (status !== 'ok' || !user) return { error: json({ error: 'Unauthorized.' }, 401) }
  if (!STAFF.has(String(user.role || '').toUpperCase())) {
    return { error: json({ error: 'Forbidden.' }, 403) }
  }

  const studentId = Number(studentIdRaw)
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return { error: json({ error: 'studentId is required.' }, 400) }
  }
  // Ключ ученика в этих таблицах — тот же, что и в остальном приложении
  // (`user-<id>`), см. profileIdForUser.
  return { deviceId: profileIdForUser(studentId) }
}

export async function GET(request) {
  const studentId = new URL(request.url).searchParams.get('studentId')
  const { error, deviceId } = await resolve(request, studentId)
  if (error) return error
  const usage = await getUsage(deviceId)
  return json({ ...usage, dailyLimitSec: DAILY_LIMIT_SEC })
}

export async function POST(request) {
  let body = {}
  try {
    body = await request.json()
  } catch {
    // Пустое тело — не повод падать: studentId проверяется ниже.
  }
  const { error, deviceId } = await resolve(request, body?.studentId)
  if (error) return error
  const usage = await resetTodayUsage(deviceId)
  return json({ ...(usage || { todaySeconds: 0, monthSeconds: 0 }), dailyLimitSec: DAILY_LIMIT_SEC })
}
