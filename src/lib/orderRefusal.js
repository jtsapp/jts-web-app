// Сервер отказал в заказе по существу (POST /mobile/orders): 422 — предложение не продаётся или ученику нужен уровень,
// 409 OFFER_VERSION_CHANGED — условия поменялись. Это ответ, а не сбой связи: человеку говорим причину и не уводим
// его молча в чат менеджера. null — сбой другого рода (сеть, 5xx, эквайринг не настроен): там прежний запасной путь.
const BY_CODE = {
  OFFER_UNAVAILABLE: 'pay.refused.unavailable',
  LEVEL_REQUIRED: 'pay.refused.level',
  OFFER_VERSION_CHANGED: 'pay.refused.changed',
}

export function orderRefusal(err) {
  const status = err?.status
  if (status !== 422 && !(status === 409 && err?.code === 'OFFER_VERSION_CHANGED')) return null
  return BY_CODE[err?.code] || 'pay.refused.other'
}
