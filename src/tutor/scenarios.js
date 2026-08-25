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
// Порядок: сначала сюжет «Newcomer in the USA» — прилетел → нашёл дорогу →
// кофе → собеседование → переезд → клиника, — потом внесюжетные сцены по
// возрастанию уровня. Дашборд берёт первую непройденную как «советуем
// сегодня», поэтому новое дописывается в конец, а не втискивается в цепочку.
//
// level — уровень сцены по CEFR, рисуется бейджем на карточке. На речь агента
// он НЕ влияет: тот говорит по уровню из профиля ученика. Это подсказка
// выбора, а не настройка — в 28 сценах без неё не видно, что проще, а что
// сложнее.
//
// requires — сценарий, который по сюжету идёт раньше (квартиру обставляешь,
// потому что взяли на работу; в клинику попадаешь после переезда). Замком это
// БОЛЬШЕ НЕ БЫЛО: в UI все сцены открыты сразу, независимо от уровня и
// прогресса. Поле осталось подсказкой порядка — им пользуется выбор «следующей
// сцены» при выдаче токена (src/app/api/livekit/token/route.js).
export const SCENARIOS = [
  {
    id: 'visa-interview',
    level: 'B1',
    label: 'U.S. Visa Interview',
    img: '/tutor/visa-interview.jpg',
    badge: '🛂',
  },
  {
    id: 'hotel-check-in',
    level: 'A2',
    label: 'Hotel Check-In',
    img: '/tutor/hotel-check-in.jpg',
    badge: '🛬',
  },
  {
    id: 'asking-directions',
    level: 'A2',
    label: 'Asking for Directions',
    img: '/tutor/asking-directions.jpg',
    badge: '🗺️',
  },
  {
    id: 'ordering-coffee',
    level: 'A2',
    label: 'Ordering Coffee',
    img: '/tutor/ordering-coffee.jpg',
    badge: '☕',
  },
  {
    id: 'job-interview',
    level: 'B1',
    label: 'The Job Interview',
    img: '/tutor/job-interview.jpg',
    badge: '💼',
  },
  {
    id: 'household-store',
    level: 'B1',
    label: 'Setting Up the Apartment',
    img: '/tutor/household-store.jpg',
    badge: '🛒',
    requires: 'job-interview',
  },
  {
    id: 'doctors-office',
    level: 'B1',
    label: "At the Doctor's Office",
    img: '/tutor/doctors-office.jpg',
    badge: '🩺',
    requires: 'household-store',
  },
  {
    id: '911-call',
    level: 'A2',
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
  {
    id: 'neighbour-noise',
    level: 'A2',
    label: 'The Neighbour Downstairs',
    img: '/tutor/neighbour-noise.jpg',
    badge: '🚪',
    // Тоже вне сюжета «Newcomer in the USA» — соседка приходит к тому, кто уже
    // где-то живёт, а не к приезжему с чемоданом.
    //
    // brief обязателен, а не украшение: весь поворот сцены в том, что сверлит
    // НЕ ученик, а квартира 16 сверху. Соседка этого не знает — она пришла
    // ругаться, — а «Passed» требует, чтобы сверление в итоге повесили на 16-ю.
    // Без вводных ученику неоткуда взять этот факт, и сцена непроходима.
    brief: true,
    // Часов нет: 22:40 и «тишина с 23:00» — время ВНУТРИ сцены, а не таймер
    // звонка. Разговор в дверях идёт ровно столько, сколько идёт.
  },
  // Вторая партия, 19 сцен, порядок по уровню A1 -> B2. В сюжет «Newcomer
  // in the USA» они не входят, поэтому requires тут нет ни у одной: это
  // отдельные ситуации, и открывать их можно в любом порядке.
  //
  // brief стоит у всех девятнадцати, и это не общая привычка, а свойство
  // самих сцен: в каждой есть факты со стороны ученика, которых NPC знать
  // не может и сообщить не в состоянии — сколько денег в кармане, что
  // именно бронировал, сколько сантиметров просил отрезать, зачем летит.
  // Без вводных ученик приходит в сцену пустым, и её «Passed» недостижим.
  {
    id: 'lost-boy-info-desk',
    level: 'A1',
    label: 'The Boy By The Fountain',
    img: '/tutor/lost-boy-info-desk.jpg',
    badge: '🧸',
    brief: true,
  },
  {
    id: 'museum-ticket-desk',
    level: 'A1',
    label: 'Two Tickets, Please',
    img: '/tutor/museum-ticket-desk.jpg',
    badge: '🎟️',
    brief: true,
  },
  {
    id: 'clothing-store',
    level: 'A2',
    label: 'A Jacket For Monday',
    img: '/tutor/clothing-store.jpg',
    badge: '🧥',
    brief: true,
  },
  {
    id: 'corner-shop',
    level: 'A2',
    label: 'The Shop Before Dinner',
    img: '/tutor/corner-shop.jpg',
    badge: '🛒',
    brief: true,
  },
  {
    id: 'hairdresser',
    level: 'A2',
    label: 'Two Centimetres, No More',
    img: '/tutor/hairdresser.jpg',
    badge: '✂️',
    brief: true,
  },
  {
    id: 'market-melon-stall',
    level: 'A2',
    label: 'The Melon Stall',
    img: '/tutor/market-melon-stall.jpg',
    badge: '🍑',
    brief: true,
  },
  {
    id: 'pharmacy-night-window',
    level: 'A2',
    label: 'The Night Window',
    img: '/tutor/pharmacy-night-window.jpg',
    badge: '💊',
    brief: true,
  },
  {
    id: 'station-ticket-window',
    level: 'A2',
    label: 'The Ticket Window',
    img: '/tutor/station-ticket-window.jpg',
    badge: '🚆',
    brief: true,
  },
  {
    id: 'bank-lost-card',
    level: 'B1',
    label: 'The Card That Vanished',
    img: '/tutor/bank-lost-card.jpg',
    badge: '💳',
    brief: true,
  },
  {
    id: 'explaining-your-job',
    level: 'B1',
    label: 'What Do You Do All Day',
    img: '/tutor/explaining-your-job.jpg',
    badge: '🧒',
    brief: true,
  },
  {
    id: 'hotel-room-problem',
    level: 'B1',
    label: 'The Room With No Window',
    img: '/tutor/hotel-room-problem.jpg',
    badge: '🛎️',
    brief: true,
  },
  {
    id: 'passport-control',
    level: 'B1',
    label: 'Passport Control At Heathrow',
    img: '/tutor/passport-control.jpg',
    badge: '🛂',
    brief: true,
  },
  {
    id: 'police-report',
    level: 'B1',
    label: 'The Report Number',
    img: '/tutor/police-report.jpg',
    badge: '🚓',
    brief: true,
  },
  {
    id: 'taxi-long-way',
    level: 'B1',
    label: 'The Long Way Round',
    img: '/tutor/taxi-long-way.jpg',
    badge: '🚕',
    brief: true,
  },
  {
    id: 'the-empty-chair',
    level: 'B1',
    label: 'The Empty Chair',
    img: '/tutor/the-empty-chair.jpg',
    badge: '📞',
    brief: true,
  },
  {
    id: 'disputing-an-invoice',
    level: 'B2',
    label: 'The Brake Job Invoice',
    img: '/tutor/disputing-an-invoice.jpg',
    badge: '🧾',
    brief: true,
  },
  {
    id: 'essay-extension',
    level: 'B2',
    label: 'The Essay Extension',
    img: '/tutor/essay-extension.jpg',
    badge: '📚',
    brief: true,
  },
  {
    id: 'party-nobody-you-know',
    level: 'B2',
    label: "The Balcony At Ainur's",
    img: '/tutor/party-nobody-you-know.jpg',
    badge: '🥂',
    brief: true,
  },
  {
    id: 'turning-down-the-offer',
    level: 'B2',
    label: 'Saying No To The Offer',
    img: '/tutor/turning-down-the-offer.jpg',
    badge: '📱',
    brief: true,
  },
]

// Доступ по слагу. Нужен и клиенту (есть ли у сцены брифинг и свои часы), и
// токен-роуту (сколько секунд выдавать) — поэтому живёт рядом с самим списком,
// а не дублируется поиском по массиву в каждом месте.
export function getScenario(id) {
  if (typeof id !== 'string' || !id) return null
  return SCENARIOS.find((s) => s.id === id) || null
}
