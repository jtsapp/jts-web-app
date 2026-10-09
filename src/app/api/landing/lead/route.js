// Заявка с лендинга. Порядок решения владельца (04.10.2026): заявка уходит в
// amoCRM через бэкенд, а человек сразу попадает в регистрацию приложения на
// шаг почты — имя и номер он уже дал здесь.
//
// Браузер зовёт этот роут, а не бэкенд напрямую: здесь лимит частоты,
// ловушка для ботов и ключ бэкенда (X-Landing-Key), которого в браузере быть
// не должно.
import { BACKEND_URL } from '../../../../lib/auth-server.js'
import { sealHandoff, handoffSecret } from '../../../../landing/handoff.js'
import { appLink, normalizeAppUrl, parseHosts, requestHost } from '../../../../landing/hostRouting.js'
import { createRateLimiter, leadKey, maskPhone, sendLeadToCrm, validateLead } from '../../../../landing/leadServer.js'
import { landingAppPath } from '../../../../lib/attribution.js'

const allow = createRateLimiter()
const LOOPBACK = /^(127\.|::1$|::ffff:127\.)/

const json = (status, data) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

function clientIp(request) {
  const h = request.headers
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  )
}

export async function POST(request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return json(400, { error: 'bad_request' })

  // Ловушка: поле, которого человек не видит. Боту отвечаем «принято» — пусть
  // считает, что справился, и не подбирает обход.
  if (body.website) return json(200, { ok: true, redirect: null })

  const checked = validateLead(body)
  if (!checked.ok) return json(400, { error: checked.error })
  // Лимит — только по настоящему адресу клиента. Нет его (nginx не передал
  // X-Real-IP / X-Forwarded-For) — все посетители слились бы в одну корзину на
  // пять заявок, и форма встала бы для всех; такой отказ хуже спама. Локальная
  // разработка и e2e тоже без лимита.
  const ip = clientIp(request)
  const realIp = ip !== 'unknown' && !LOOPBACK.test(ip)
  if (realIp && !allow(ip)) return json(429, { error: 'too_many' })
  const { lead } = checked

  const crm = await sendLeadToCrm(lead, { backendUrl: BACKEND_URL, key: leadKey() })
  if (!crm.sent) console.error(`[landing-lead] заявка ${maskPhone(lead.digits)} не ушла в CRM: ${crm.reason}`)

  // Куда дальше: регистрация на шаге почты с кодом передачи. Нет секрета —
  // хотя бы в начало регистрации, без подстановки.
  // from=landing и метки — и здесь: заявка в CRM могла не уйти (нет ключа,
  // бэкенд лежит), и тогда регистрация сама принесёт тег «Лендинг».
  const token = sealHandoff(lead, handoffSecret())
  const path = landingAppPath(token ? `/?screen=reg-email&handoff=${token}` : '/?screen=chat', lead.utm)
  const redirect = appLink(path, {
    onLandingHost: parseHosts(process.env.LANDING_HOSTS).has(requestHost(request.headers)),
    appUrl: normalizeAppUrl(process.env.APP_PUBLIC_URL),
  })
  return json(200, { ok: true, crm: crm.sent, redirect })
}
