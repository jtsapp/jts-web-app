// Распечатать код передачи с лендинга (см. src/landing/handoff.js): имя и
// номер для регистрации. Зовёт приложение уже на своём домене; ключ живёт
// только на сервере, поэтому подделанный или просроченный код даёт 404.
import { handoffSecret, openHandoff } from '../../../../landing/handoff.js'

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('t')
  const data = openHandoff(token, handoffSecret())
  const headers = { 'Cache-Control': 'no-store' }
  if (!data) return Response.json({ error: 'not_found' }, { status: 404, headers })
  // Номер — в том же виде, что отдаёт шаг «телефон» регистрации (+7…).
  return Response.json({ name: data.name, phone: '+7' + data.digits, lang: data.lang }, { headers })
}
