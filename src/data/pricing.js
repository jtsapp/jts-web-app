// Витрина: то, что НЕ является ценой.
//
// Сами предложения и их цены живут на бэкенде (таблица sales_offers, эндпоинт
// GET /catalog/offers) и приезжают в рантайме — см. api.getOffers. Держать
// прайс в бандле было допустимо ровно до появления оплаты: сумму заказа считает
// сервер по своим данным, и вторая копия цен на клиенте означала бы, что
// человек видит одно, а платит другое.
//
// Здесь остаётся оформление, от цены не зависящее: разбор серверного списка по
// разделам, производные подписи (цена за урок/минуту, выгода пакета) и
// статичные списки бонусов и «входит в любой тариф».

/** Приложение продаёт только в тенге. */
export const CURRENCY = '₸'

/* ------------------------- разбор серверного списка ------------------------ */

/** Предложения по разделам витрины. Неизвестные виды молча игнорируются. */
export function splitOffers(offers = []) {
  const of = (kind) => offers.filter((o) => o.kind === kind)
  return {
    self: of('SELF_STUDY'),
    individual: of('INDIVIDUAL'),
    group: of('GROUP'),
    minutes: of('TUTOR_MINUTES'),
  }
}

/**
 * Длительности урока, которые реально есть в каталоге, от большей к меньшей.
 * Переключатель «60 / 30 минут» строится по ним, а не по константе: снимут с
 * продажи получасовые — переключатель исчезнет сам.
 */
export function durationsOf(offers = []) {
  const set = new Set(offers.map((o) => o.durationMinutes).filter((d) => d > 0))
  return [...set].sort((a, b) => b - a)
}

/** Цена за один урок пакета — справочная подпись под ценой. */
export function pricePerLesson(offer) {
  if (!offer?.lessons) return 0
  return Math.round(offer.price / offer.lessons)
}

/** Цена за минуту пакета минут. */
export function pricePerMinute(offer) {
  if (!offer?.minutes) return 0
  return Math.round(offer.price / offer.minutes)
}

/**
 * Насколько пакет выгоднее самого маленького, в процентах (0 — не выгоднее).
 *
 * Считается от цены за минуту у наименьшего пакета, а не хранится числом: иначе
 * однажды поменяют цену и забудут поправить «-10%».
 */
export function packDiscount(offer, packs = []) {
  const base = packs.reduce(
    (min, p) => (min === null || (p.minutes || 0) < (min.minutes || 0) ? p : min),
    null,
  )
  const basePerMinute = pricePerMinute(base)
  const perMinute = pricePerMinute(offer)
  if (!basePerMinute || !perMinute) return 0
  return Math.max(0, Math.round((1 - perMinute / basePerMinute) * 100))
}

/* ------------------------------- оформление ------------------------------- */

/** Бонусы раздела — маркетинговые списки, к цене отношения не имеют. */
export const BONUSES = {
  individual: ['Duolingo Plus', 'Netflix', 'Puzzle English', 'Puzzle Movies'],
  group: ['Netflix', 'Puzzle Movies'],
}

// «Входит в любой тариф» — плитки внизу экрана. Ключи i18n, а не готовый текст:
// экран трёхъязычный.
export const INCLUDED = [
  { id: 'manager', icon: 'manager', title: 'pricing.inc.manager', sub: 'pricing.inc.managerSub' },
  { id: 'program', icon: 'program', title: 'pricing.inc.program', sub: 'pricing.inc.programSub' },
  { id: 'practice', icon: 'practice', title: 'pricing.inc.practice', sub: 'pricing.inc.practiceSub' },
  { id: 'vocab', icon: 'vocab', title: 'pricing.inc.vocab', sub: 'pricing.inc.vocabSub' },
  { id: 'dialogs', icon: 'dialogs', title: 'pricing.inc.dialogs', sub: 'pricing.inc.dialogsSub' },
  { id: 'selfstudy', icon: 'selfstudy', title: 'pricing.inc.self', sub: 'pricing.inc.selfSub' },
]

/**
 * Скидка на повторный пробный урок — плашка в сайдбаре демо-аккаунта.
 * Это рекламное обещание, а не позиция каталога: купить её кнопкой нельзя,
 * она ведёт на витрину.
 */
export const RETRY_OFFER = { was: 7000, now: 900 }

/** 84000 → «84 000» (узкий пробел, как в макете). */
export function formatPrice(n) {
  return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
