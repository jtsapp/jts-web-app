// Куда уводить оплату картой (см. src/app/api/landing/checkout/route.js).
// null — платить здесь. Сбой запроса — тоже здесь: лучше заказ на этом домене,
// чем никакого.
export async function fetchCheckoutOrigin(fetchImpl = globalThis.fetch) {
  try {
    const res = await fetchImpl('/api/landing/checkout', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.origin === 'string' && /^https:\/\/[^/?#]+$/.test(data.origin) ? data.origin : null
  } catch {
    return null
  }
}

/** Адрес витрины на домене оплаты с корзиной: ?screen=pricing&offer=код:кол,код:кол. */
export function checkoutUrl(origin, screen, lines) {
  const offer = lines.map((l) => (l.qty > 1 ? `${l.code}:${l.qty}` : l.code)).join(',')
  return `${origin}/?screen=${screen}&offer=${encodeURIComponent(offer)}`
}
