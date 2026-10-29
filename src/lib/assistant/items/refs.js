// Адрес вещи, которую Луна умеет открыть по просьбе ученика (29.10.2026): урок курса,
// тема грамматики, текст «Чтения», сценарий «Ситуаций», книжка… — «вид.уровень.id», например
// course.B1.L5, grammar.b1.7, reading.b1-sci-tickle, book.12. Его модель пишет в метке
// ([[OPEN_NOW course.B1.L5]]), сервер сверяет с каталогом (catalog.js), клиент строит
// по нему переход (itemNav) — модуль общий, без DOM и сети.
//
// Стабильный адрес, а не номер из списка запроса: на «да» в следующем ходе каталога в
// запросе может уже не быть, а метка из истории разговора должна остаться годной.
//
// Переход — ровно то, что зовут сами экраны и домашняя работа (handleNav в App,
// practiceTarget.js), без своих обходов. Квотные разделы не обходятся: сценарий
// «Ситуаций» нового уровня открывается карточкой Практики — она и спросит квоту.

const LEVEL = /^(a0|a1|a2|b1|b2|c1)$/i
const COURSE_CODE = /^(L\d{1,3}|T\d{1,2}|X[a-z0-9]{1,8}|EXAM)$/
const SIMPLE_ID = /^[A-Za-z0-9_-]{1,48}$/

export const ITEM_REF_RE = /^(course|grammar|ggame|reading|situation|shadowing|words|workbook|homework|live|book)\.([A-Za-z0-9_.-]{1,48})$/

/** { kind, level, id } по адресу или null. */
export function parseItemRef(ref) {
  const m = ITEM_REF_RE.exec(String(ref ?? ''))
  if (!m) return null
  const [, kind, rest] = m
  const parts = rest.split('.')
  switch (kind) {
    case 'course': {
      const [level, code] = parts
      return parts.length === 2 && LEVEL.test(level) && COURSE_CODE.test(code) ? { kind, level: level.toUpperCase(), id: code } : null
    }
    case 'grammar':
    case 'situation': {
      const [level, id] = parts
      return parts.length === 2 && LEVEL.test(level) && /^\d{1,4}$/.test(id) ? { kind, level: level.toLowerCase(), id } : null
    }
    case 'workbook':
      return parts.length === 1 && LEVEL.test(rest) ? { kind, level: rest.toLowerCase(), id: rest.toLowerCase() } : null
    case 'reading': {
      if (parts.length !== 1 || !SIMPLE_ID.test(rest)) return null
      const level = rest.slice(0, 2).toLowerCase()
      return { kind, level: LEVEL.test(level) ? level : null, id: rest }
    }
    default:
      return parts.length === 1 && SIMPLE_ID.test(rest) ? { kind, level: null, id: rest } : null
  }
}

export const isItemRef = (ref) => parseItemRef(ref) != null

/**
 * Переход по адресу: { nav, payload } для handleNav или null.
 * situationsOpened — уровни «Ситуаций», уже открытые учеником (situationsProgress.js):
 * их квота уже списана, и сценарий открывается сразу.
 */
export function itemNav(ref, { situationsOpened = [] } = {}) {
  const item = parseItemRef(ref)
  if (!item) return null
  const { kind, level, id } = item
  switch (kind) {
    case 'course':
      return { nav: 'course', payload: { level, lesson: id } }
    case 'grammar':
      return { nav: 'practice', payload: { level, unitId: Number(id) } }
    case 'ggame':
      return { nav: 'grammar-games', payload: { topic: id } }
    case 'reading':
      return level ? { nav: 'reading', payload: { level, textId: id } } : null
    case 'situation':
      return situationsOpened.includes(level)
        ? { nav: 'situations', payload: { level, id: Number(id) } }
        : { nav: 'practice', payload: { area: 'situations', level } }
    case 'shadowing':
      // Голая строка, не объект: так урок ждёт handleNav('shadowing') и проп экрана.
      return { nav: 'shadowing', payload: id }
    case 'words':
      return { nav: 'words', payload: { sceneId: id } }
    case 'workbook':
      return { nav: 'workbook', payload: { level } }
    case 'homework':
      return { nav: 'homework', payload: { id } }
    case 'live':
      return { nav: 'lessons', payload: { lessonId: id } }
    case 'book':
      // Книжка открывается в Практике: список книжек развёрнут, и экран сам открывает
      // книгу, когда доедет каталог (bookId). Не нашлась — остаётся список.
      return { nav: 'practice', payload: { filter: 'books', bookId: id } }
    default:
      return null
  }
}
