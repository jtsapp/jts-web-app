// Демо-токен витрины «Практики» — выдаёт СЕРВЕР, а не браузер.
//
// Гость, нажавший «Пропустить», должен потрогать «Практику» без регистрации, а
// экраны раздела ходят на бэкенд за квотами и модулями — значит какой-то токен
// им нужен. Раньше его добывал сам браузер: `getPracticeToken` в src/api.js
// логинился в общий демо-аккаунт парой NEXT_PUBLIC_DEMO_PHONE /
// NEXT_PUBLIC_DEMO_PASSWORD со значениями по умолчанию прямо в коде.
//
// ПОЧЕМУ ЭТО ПЛОХО. Префикс NEXT_PUBLIC_ означает «вшить в бандл»: и пара по
// умолчанию, и заданная на стенде уезжали в браузер и читались из исходников
// вкладки. Пароль — не то же самое, что токен: токен протухает и годится
// только этому приложению, а паролем можно войти в аккаунт откуда угодно —
// мобилкой, формой входа, — и сменить его самому. Никакой гейт на клиенте
// этого не меняет: значение уже отдано.
//
// Теперь пароль живёт только на сервере (DEMO_PHONE / DEMO_PASSWORD, без
// NEXT_PUBLIC_), а наружу уходит один токен. Ручка открыта — иначе витрина не
// работает, — но открытость токена и открытость пароля это разные вещи.

import { isEmailIdentifier, normalizePhone } from '@/api.js'
import { BACKEND_URL } from '@/lib/auth-server.js'

export const runtime = 'nodejs'

// BOM/пробелы из env вырезаем по той же причине, что и в auth-server.js:
// значение из Windows-пайпа приходит с U+FEFF и молча ломает запрос.
const env = (name) => (process.env[name] ?? '').replace(/^\uFEFF/, '').trim()

/**
 * Токен общего демо-аккаунта, пока он жив.
 *
 * Аккаунт один на всех гостей, поэтому и токен общий: логиниться на каждого
 * посетителя значило бы держать бэкенд под нагрузкой ради одной и той же
 * сессии. Раньше кэш был у каждого браузера свой (localStorage), теперь ещё и
 * общий на стенде — походов в /auth/login стало меньше, а доступ тот же.
 */
let cached = null

/** Жив ли JWT с запасом: тот же расчёт, что у клиента в src/api.js. */
function aliveUntil(token, marginSec = 120) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    )
    if (typeof payload.exp !== 'number') return 0
    return payload.exp * 1000 - marginSec * 1000
  } catch {
    return 0
  }
}

async function issueToken(phone, password) {
  const body = isEmailIdentifier(phone) ? { email: phone } : { phone: normalizePhone(phone) }
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, password }),
  })
  if (!res.ok) {
    // Тело ответа наружу не отдаём: в нём формулировки бэкенда про этот
    // аккаунт, а спрашивающий — аноним.
    console.error('[practice.demo] бэкенд отказал в демо-входе:', res.status)
    return null
  }
  const data = await res.json().catch(() => null)
  return data?.accessToken || null
}

/**
 * POST, а не GET: ручка заводит сессию, и промежуточные кэши не должны считать
 * её обычным чтением, которое можно раздать из кэша.
 */
export async function POST() {
  const phone = env('DEMO_PHONE')
  const password = env('DEMO_PASSWORD')
  if (!phone || !password) {
    // Стенд без демо-доступа — это нормальное состояние, а не поломка: раздел
    // просто не покажет гостю серверную часть. Раньше в этом месте стояла пара
    // по умолчанию, и стенд молча ходил под общим аккаунтом, о чём никто не
    // знал.
    return Response.json(
      { error: 'demo access is not configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  if (cached && cached.until > Date.now()) {
    return Response.json({ accessToken: cached.token }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const token = await issueToken(phone, password)
  if (!token) {
    cached = null
    return Response.json(
      { error: 'demo access is unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const until = aliveUntil(token)
  // Токен без разбираемого exp не кэшируем вовсе: считать его вечным — значит
  // однажды раздать всем гостям протухший.
  cached = until > Date.now() ? { token, until } : null
  return Response.json({ accessToken: token }, { headers: { 'Cache-Control': 'no-store' } })
}
