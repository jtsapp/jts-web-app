// Стек «откуда пришли» — по нему кнопка «Назад» ведёт туда, откуда ученик
// открыл экран, а не в одно зашитое место.
//
// Раньше каждый «назад» был захардкожен: разделы Практики всегда вели в
// Практику (открыл «Аудирование» с «Главной» — вернулся в Практику), живой урок
// всегда в «Уроки» (открыл с «Главной» или из колокольчика — туда же), тарифы
// на карту обучения, тропа уровня на карту королевств даже из плана дня.
// Отдельные «откуда» уже заводили по месту (pricingBack, reportOrigin,
// fromHomework) — каждый на один экран. Здесь общее правило на все.
//
// Правило как у истории браузера, но без самой истории (адрес экран держит
// replaceState, см. App.jsx):
// - переход на экран, которого в стеке нет, кладёт в стек экран, с которого
//   ушли, вместе с его «местом» (вкладка, раскрытый раздел, прокрутка);
// - переход на экран, который в стеке уже есть, — это возврат к нему: всё,
//   что выше, срезается. Так «назад», зашитый по-старому (опрос тьютора идёт
//   назад шагами), не оставляет в стеке экраны, из которых уже вышли, и
//   следующий «назад» не уводит в них по кругу;
// - «назад» снимает верхнюю запись и открывает её экран на том же месте.
//
// Стек живёт в sessionStorage: оплата возвращает на ?screen=pricing
// перезагрузкой страницы, F5 тоже, — без хранилища «назад» после них снова
// вёл бы в зашитое место. Вкладка, а не устройство: новая вкладка — новый путь.

export const NAV_STACK_KEY = 'jts_nav_stack'
const MAX_DEPTH = 30

// Экраны, на которые «назад» не возвращает: вход и регистрация (после входа
// туда незачем), заставки-переходы, тест уровня (его вступление само
// уводит в анкету — возврат в него крутил бы по кругу), анкета General English
// (пройденная анкета → тест → маршрут: «назад» с маршрута открывал бы анкету
// заново), идущий звонок тьютора (он уже закрыт, когда с него ушли) и
// класс-аккаунт.
const NOT_RETURNABLE = new Set([
  'welcome', 'chat', 'phone', 'reg-phone', 'reg-email', 'reg-birth', 'otp',
  'reg-lang', 'reg-name', 'reg-contacts', 'reg-google',
  'login-password', 'complete-registration', 'set-password', 'success',
  'test-intro', 'test', 'placement', 'speaking-test', 'ge-onboarding', 'tutor-loading',
  'tutor-voice-chat', 'booth',
])

export function isReturnable(screen) {
  return typeof screen === 'string' && screen !== '' && !NOT_RETURNABLE.has(screen)
}

/**
 * Стек после перехода from → to. place — место на экране from, которое
 * вернёт «назад».
 */
export function pushNav(stack, from, to, place) {
  const at = lastIndexOf(stack, to)
  if (at >= 0) return stack.slice(0, at)
  if (from === to || !isReturnable(from)) return stack
  const next = [...stack, place ? { screen: from, place } : { screen: from }]
  return next.length > MAX_DEPTH ? next.slice(next.length - MAX_DEPTH) : next
}

/**
 * Куда ведёт «назад» с экрана current: { entry, rest } или null, если идти
 * некуда (диплинк, первый экран вкладки) — тогда экран берёт свой запасной.
 */
export function popNav(stack, current) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const entry = stack[i]
    if (entry.screen !== current && isReturnable(entry.screen)) return { entry, rest: stack.slice(0, i) }
  }
  return null
}

function lastIndexOf(stack, screen) {
  for (let i = stack.length - 1; i >= 0; i -= 1) if (stack[i].screen === screen) return i
  return -1
}

export function readNavStack(storage) {
  try {
    const raw = JSON.parse(storage?.getItem(NAV_STACK_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((e) => e && isReturnable(e.screen)) : []
  } catch {
    return []
  }
}

export function writeNavStack(storage, stack) {
  try {
    if (stack.length) storage?.setItem(NAV_STACK_KEY, JSON.stringify(stack))
    else storage?.removeItem(NAV_STACK_KEY)
  } catch {
    /* хранилище недоступно — стек проживёт до перезагрузки */
  }
}

// ── Место на экране ─────────────────────────────────────────────────────────
// Экран сообщает, где он сейчас (вкладка, раскрытый раздел, открытая
// домашка), — App снимает это в момент ухода и кладёт в стек. Обычная Map, а
// не состояние: место меняется на каждый клик, и перерисовывать из-за этого
// App незачем. На размонтировании не стирается — уход как раз и размонтирует.
const places = new Map()

export function rememberPlace(screen, place) {
  places.set(screen, place)
}

export function placeOf(screen) {
  return places.get(screen)
}

// Место, на которое вернул «назад». Экран читает его при монтировании — и
// только он: обычный заход из меню начинается с начала, а не с прошлого места.
let resume = null

export function setResume(screen, place) {
  resume = screen ? { screen, place: place || {} } : null
}

export function resumeOf(screen) {
  return resume && resume.screen === screen ? resume.place : null
}

// ── Подпись кнопки ──────────────────────────────────────────────────────────
// Кнопка называет, КУДА она ведёт: безликое «Назад» из глубины раздела
// читалось как шаг назад, а не выход (та же жалоба, что у «Письма»). Ключ
// словаря i18n.jsx; экран без своего ключа — просто «Назад».
const PRACTICE_SECTIONS = {
  listening: 'nav.back.listening',
  shadowing: 'nav.back.shadowing',
  writing: 'nav.back.writing',
  workbook: 'nav.back.workbook',
  words: 'nav.back.words',
  numbers: 'nav.back.numbers',
  prepositions: 'nav.back.prepositions',
  listen: 'nav.back.listen',
  cartoons: 'nav.back.cartoons',
  speakspin: 'nav.back.speakspin',
  verbs: 'nav.back.verbs',
  situations: 'nav.back.situations',
  listenchoose: 'nav.back.listenchoose',
  arcade: 'nav.back.arcade',
  reading: 'nav.back.reading',
}

export function backLabelKey(screen) {
  if (!screen) return 'nav.back.default'
  if (PRACTICE_SECTIONS[screen]) return PRACTICE_SECTIONS[screen]
  if (screen.startsWith('tutor-')) return 'nav.back.tutor'
  if (screen.startsWith('ielts')) return 'nav.back.ielts'
  switch (screen) {
    case 'home': return 'nav.back.home'
    case 'practice': return 'nav.back.practice'
    case 'homework': return 'nav.back.homework'
    case 'lessons':
    case 'course-catalog': return 'nav.back.lessons'
    case 'lesson-workspace':
    case 'live-lesson': return 'nav.back.lesson'
    case 'kingdom':
    case 'kingdom-interior': return 'nav.back.learning'
    case 'vocab': return 'nav.back.vocab'
    case 'profile': return 'nav.back.profile'
    case 'pricing': return 'nav.back.pricing'
    case 'ge-plan': return 'nav.back.gePlan'
    case 'ge-route': return 'nav.back.geRoute'
    default: return 'nav.back.default'
  }
}
