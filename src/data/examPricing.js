// Тарифы подготовки к экзаменам — у SAT и IELTS свои, отдельно от тарифов General English (/catalog/offers).
//
// Цены владелец пришлёт позже (13.10.2026): пока `price: null`, и карточка пишет «цену уточнит менеджер», а кнопка
// ведёт к менеджеру с текстом заявки. Когда цены появятся — проставить `price` (тенге) и при желании `oldPrice`; экран
// подхватит их без правки разметки. Тексты карточек — ключи i18n `examPricing.<product>.<plan>.*`.
//
// Оплата онлайн у этих тарифов пока не подключена: заказ создаёт менеджер, он же открывает доступ к разделу
// (backend V324 для IELTS, V341 для SAT).

export const EXAM_PRODUCTS = ['sat', 'ielts']

export const EXAM_PLANS = {
  sat: [
    { id: 'self', months: 1, price: null, oldPrice: null, features: ['plan', 'bank', 'mocks', 'vocab'] },
    { id: 'coach', months: 3, price: null, oldPrice: null, featured: true, features: ['plan', 'bank', 'mocks', 'vocab', 'teacher', 'review'] },
    { id: 'intensive', months: 3, price: null, oldPrice: null, features: ['plan', 'bank', 'mocks', 'vocab', 'teacher', 'review', 'live'] },
  ],
  ielts: [
    { id: 'self', months: 1, price: null, oldPrice: null, features: ['plan', 'bank', 'mocks', 'ai'] },
    { id: 'coach', months: 3, price: null, oldPrice: null, featured: true, features: ['plan', 'bank', 'mocks', 'ai', 'teacher', 'review'] },
    { id: 'intensive', months: 3, price: null, oldPrice: null, features: ['plan', 'bank', 'mocks', 'ai', 'teacher', 'review', 'live'] },
  ],
}

/** «45 000 ₸» — как у тарифов General English; null — цены ещё нет. */
export function formatExamPrice(price, lang) {
  if (price == null) return null
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  return `${new Intl.NumberFormat(loc).format(price)} ₸`
}
