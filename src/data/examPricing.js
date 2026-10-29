// Exam offers now use GET /catalog/offers, shared with the main price list.
export const EXAM_PRODUCTS = ['sat', 'ielts']

/** «45 000 ₸» — как у тарифов General English; null — цены ещё нет. */
export function formatExamPrice(price, lang) {
  if (price == null) return null
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  return `${new Intl.NumberFormat(loc).format(price)} ₸`
}
