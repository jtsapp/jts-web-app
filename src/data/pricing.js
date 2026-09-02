// Каталог тарифов экрана «Тарифы» — цифрами с макета.
//
// Почему статикой, а не с бэкенда: таблица `plans` там служит учёту (сколько
// уроков в абонементе, какие квоты он открывает) и админ заводит её под
// внутренние нужды — в ней нет ни витринных бонусов, ни разбивки Self Study по
// уровням, ни цены за 30-минутный урок. Публичного эндпоинта витрины тоже нет.
// Ставить продажный экран на неподходящую таблицу — значит показать ученику
// внутренние названия абонементов; поэтому витрина живёт здесь, а покупка всё
// равно идёт через менеджера (см. PaymentMethodModal), который заводит
// абонемент в админке руками. Когда появится витринный эндпоинт, меняется
// только этот файл.
//
// Все цены — в тенге, за весь пакет. `perLesson` — справочная подпись.

/** Курс валюты не нужен: приложение продаёт только в KZT. */
export const CURRENCY = '₸'

// Self Study — доступ к самостоятельному прохождению уровней + минуты голосового
// ai-тьютора. Пакет = сколько уровней открывается.
export const SELF_STUDY = [
  { id: 'self-1', levels: 1, price: 35000, tutorMinutes: 500 },
  { id: 'self-2', levels: 2, price: 60000, tutorMinutes: 1000 },
  { id: 'self-3', levels: 3, price: 80000, tutorMinutes: 1500 },
  { id: 'self-4', levels: 4, price: 100000, tutorMinutes: 2000 },
]

// Индивидуальные уроки с преподавателем. Две длительности урока — переключатель
// на карточке раздела; цена за урок у 60 минут с макета, у 30 минут посчитана
// от неё же (половина занятия — 4 000 ₸, чуть дороже половины цены: короткий
// урок так же требует подготовки). Менять — здесь, одним числом.
export const INDIVIDUAL_DURATIONS = [60, 30]
const INDIVIDUAL_PER_LESSON = { 60: 7000, 30: 4000 }
const INDIVIDUAL_PACKS = [8, 12, 16, 20, 24, 32]

export function individualPlans(duration = 60) {
  const perLesson = INDIVIDUAL_PER_LESSON[duration] ?? INDIVIDUAL_PER_LESSON[60]
  return INDIVIDUAL_PACKS.map((lessons) => ({
    id: `ind-${duration}-${lessons}`,
    lessons,
    duration,
    perLesson,
    price: lessons * perLesson,
  }))
}

// Групповые уроки — мини-группа, продаётся курсом целиком.
export const GROUP = [
  { id: 'group-12', lessons: 12, courses: 1, price: 29990, perLesson: 2500 },
]

/** Бонусы раздела — иконки лежат в public/assets/pricing/. */
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

// Пакеты минут голосового тьютора («Докупить минуты»). Цена за минуту падает с
// объёмом — скидка не хранится, а считается от базовой цены самого маленького
// пакета: держать её отдельным полем значит однажды поменять цену и забыть
// поправить «-10%».
export const MINUTE_PACKS = [
  { id: 'min-20', minutes: 20, price: 5000 },
  { id: 'min-60', minutes: 60, price: 13500 },
  { id: 'min-120', minutes: 120, price: 24000 },
]

/** Цена за минуту пакета, округлённая до тенге. */
export function pricePerMinute(pack) {
  return Math.round(pack.price / pack.minutes)
}

/** Насколько пакет выгоднее самого маленького, в процентах (0 — не выгоднее). */
export function packDiscount(pack, packs = MINUTE_PACKS) {
  const base = pricePerMinute(packs[0])
  if (!base) return 0
  return Math.max(0, Math.round((1 - pricePerMinute(pack) / base) * 100))
}

// Скидка на повторный пробный урок — плашка в сайдбаре демо-аккаунта.
export const RETRY_OFFER = { was: 7000, now: 900 }

/** 84000 → «84 000» (узкий пробел, как в макете). */
export function formatPrice(n) {
  return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
