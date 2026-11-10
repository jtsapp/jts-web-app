// Где оформлять заказ с оплатой картой. Freedom Pay принимает оплату на домене
// лендинга (он в анкете, оферте и политике), поэтому с домена приложения витрина
// уводит туда. Ответ: { origin } — адрес лендинга, или { origin: null } — платить
// здесь (уже на лендинге либо домены лендинга не заданы: локально, дев).
import { headers } from 'next/headers'
import { checkoutOrigin, parseHosts, requestHost } from '../../../../landing/hostRouting.js'

export async function GET() {
  const landingHosts = parseHosts(process.env.LANDING_HOSTS)
  const onLandingHost = landingHosts.has(requestHost(await headers()))
  return Response.json(
    { origin: checkoutOrigin({ onLandingHost, landingHosts }) },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
