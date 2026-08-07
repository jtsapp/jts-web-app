// Единый реестр голосовых сценариев. И страница «Сценарии», и виджет на
// дашборде берут список отсюда: раньше у каждой был свой хардкод, и они разошлись
// — на дашборде у визы висел бейдж 💼 от собеседования, а описание было одно на
// все карточки.
//
// id — slug файла data/scenarios/<id>.md, который грузит голосовой агент. Он же
// уходит в metadata токена как scenarioId и в lesson_progress как lesson_key.
// Названия — на английском (это язык сцены), описания переводятся по ключу
// scen.desc.<id> в src/i18n/dict.js.
//
// Порядок — сюжетный: прилетел → нашёл дорогу → кофе → собеседование → переезд →
// клиника.
//
// requires — сценарий, который по сюжету идёт раньше (квартиру обставляешь,
// потому что взяли на работу; в клинику попадаешь после переезда). Замком это
// БОЛЬШЕ НЕ БЫЛО: в UI все сцены открыты сразу, независимо от уровня и
// прогресса. Поле осталось подсказкой порядка — им пользуется выбор «следующей
// сцены» при выдаче токена (src/app/api/livekit/token/route.js).
export const SCENARIOS = [
  {
    id: 'visa-interview',
    label: 'U.S. Visa Interview',
    img: '/tutor/visa-interview.jpg',
    badge: '🛂',
  },
  {
    id: 'hotel-check-in',
    label: 'Hotel Check-In',
    img: '/tutor/hotel-check-in.jpg',
    badge: '🛬',
  },
  {
    id: 'asking-directions',
    label: 'Asking for Directions',
    img: '/tutor/asking-directions.jpg',
    badge: '🗺️',
  },
  {
    id: 'ordering-coffee',
    label: 'Ordering Coffee',
    img: '/tutor/ordering-coffee.jpg',
    badge: '☕',
  },
  {
    id: 'job-interview',
    label: 'The Job Interview',
    img: '/tutor/job-interview.jpg',
    badge: '💼',
  },
  {
    id: 'household-store',
    label: 'Setting Up the Apartment',
    img: '/tutor/household-store.jpg',
    badge: '🛒',
    requires: 'job-interview',
  },
  {
    id: 'doctors-office',
    label: "At the Doctor's Office",
    img: '/tutor/doctors-office.jpg',
    badge: '🩺',
    requires: 'household-store',
  },
  {
    id: '911-call',
    label: 'Emergency Call',
    img: '/tutor/911-call.jpg',
    badge: '🚨',
    // Сцена вне сюжета «Newcomer in the USA», поэтому requires ей не нужен.
    // brief — вводные, которых в самом разговоре нет: диспетчер не может
    // рассказать ученику, что тот видит из окна, это ученик рассказывает
    // диспетчеру.
    brief: true,
    // Пять минут, дальше связь рвётся. Успеть вызвать помощь — это и есть
    // задача сцены, а не украшение.
    timeLimitSec: 300,
  },
]

// LABEL_BY_ID здесь больше нет: он подписывал замок («откроется после
// „{label}“»), а замки сняты — сцены открыты все и сразу.

// Доступ по слагу. Нужен и клиенту (есть ли у сцены брифинг и свои часы), и
// токен-роуту (сколько секунд выдавать) — поэтому живёт рядом с самим списком,
// а не дублируется поиском по массиву в каждом месте.
export function getScenario(id) {
  if (typeof id !== 'string' || !id) return null
  return SCENARIOS.find((s) => s.id === id) || null
}
