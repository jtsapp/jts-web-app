// Отметки жизненного цикла разговора с клиента. Нужны, потому что одного
// room_finished для учёта минут недостаточно:
//   * он приходит, когда закрылась КОМНАТА, а не когда ушёл ученик (агент не
//     удаляет комнату на обычном «Завершить разговор», дальше ещё empty_timeout
//     проекта) — к каждому звонку приезжали лишние минуты;
//   * если вебхук не доставлен, сессия не закрывается вовсе, и остаток лимита
//     тает в реальном времени, пока ученик читает разбор.
//
// События:
//   armed  — в комнату вошёл тьютор, С ЭТОГО МОМЕНТА идут минуты;
//   ping   — пульс вкладки, разговор ещё идёт;
//   closed — разговор кончился, списываем платное окно.
//
// Чужую сессию тронуть нельзя: каждый запрос проверяет, что строка комнаты
// принадлежит этому device_id.

import {
  armSession,
  closeSession,
  isDbConfigured,
  isValidDeviceId,
  touchSession,
} from '@/lib/usage.js'

export const runtime = 'nodejs'

const EVENTS = new Set(['armed', 'ping', 'closed'])

export async function POST(request) {
  let body = {}
  try {
    // sendBeacon на закрытии вкладки шлёт text/plain, поэтому парсим текст, а
    // не полагаемся на request.json().
    const raw = await request.text()
    const parsed = raw ? JSON.parse(raw) : {}
    if (parsed && typeof parsed === 'object') body = parsed
  } catch {
    return Response.json({ error: 'bad body' }, { status: 400 })
  }

  const room = typeof body.room === 'string' ? body.room.trim() : ''
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : ''
  const event = typeof body.event === 'string' ? body.event : ''

  if (!room || !isValidDeviceId(deviceId) || !EVENTS.has(event)) {
    return Response.json({ error: 'bad request' }, { status: 400 })
  }
  // Без базы лимитов нет вовсе — молча соглашаемся, чтобы клиент не сыпал
  // ошибками на стенде без DATABASE_URL.
  if (!isDbConfigured()) return Response.json({ ok: true, skipped: true })

  try {
    let applied = false
    if (event === 'armed') applied = await armSession(room, deviceId)
    else if (event === 'ping') applied = await touchSession(room, deviceId)
    else applied = await closeSession(room, deviceId)
    return Response.json({ ok: true, applied })
  } catch (err) {
    console.error('[livekit.session] failed', event, err)
    return Response.json({ error: 'failed' }, { status: 500 })
  }
}
