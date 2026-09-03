/**
 * «Крупный текст» в уроке.
 *
 * Пришло от преподавателей: пожилым ученикам с телефона мелко. Размеры
 * классрума заданы в пикселях по спеке (см. шапку lessonWorkspace.css), и
 * системная настройка шрифта на них не влияет — увеличить может только сама
 * страница. Отсюда явный переключатель, а не расчёт «на глаз» по ширине
 * экрана: кому нужно, тот включит, остальные ничего не заметят.
 *
 * Атрибут вешается на <html>, а не на контейнер урока: живой урок, классрум
 * и домашняя работа — три разных корня, а настройка у ученика одна.
 */
const KEY = 'jts_text_scale'
const LARGE = 'lg'
const ATTR = 'data-text-scale'

/** Подписчики компонентов: настройка одна, а читают её из нескольких мест. */
const listeners = new Set()

/** Прочитать сохранённый выбор. Приватный режим — просто «обычный». */
export function readTextScale(store = safeLocal()) {
  try {
    return store?.getItem(KEY) === LARGE ? LARGE : null
  } catch {
    return null
  }
}

/**
 * Применить выбор к документу и запомнить его.
 *
 * @param {boolean} large
 * @returns {boolean} что в итоге стоит — чтобы вызывающий не гадал
 */
export function setTextScale(large, doc = safeDoc(), store = safeLocal()) {
  const root = doc?.documentElement
  if (root) {
    if (large) root.setAttribute(ATTR, LARGE)
    else root.removeAttribute(ATTR)
  }
  try {
    if (large) store?.setItem(KEY, LARGE)
    else store?.removeItem(KEY)
  } catch {
    // Настройка не сохранится, но в этой вкладке уже работает — этого хватит.
  }
  listeners.forEach((listener) => listener())
  return !!large
}

/** Включено ли сейчас — снимок для {@link subscribeTextScale}. */
export function isLargeTextOn(store = safeLocal()) {
  return readTextScale(store) === LARGE
}

/**
 * Подписка на настройку.
 *
 * Через внешнее хранилище, а не через `useEffect` с `setState`: настройка живёт
 * вне React (localStorage + атрибут на <html>), на сервере её нет вовсе, и
 * `useSyncExternalStore` — ровно тот случай. Заодно ловим `storage`: урок часто
 * открыт в двух вкладках, и размер должен совпадать в обеих.
 */
export function subscribeTextScale(listener) {
  listeners.add(listener)
  const onStorage = (event) => {
    if (event.key !== KEY) return
    applyStoredTextScale()
    listener()
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}

/** Поставить на документ то, что было выбрано в прошлый раз. */
export function applyStoredTextScale(doc = safeDoc(), store = safeLocal()) {
  const large = readTextScale(store) === LARGE
  const root = doc?.documentElement
  if (root) {
    if (large) root.setAttribute(ATTR, LARGE)
    else root.removeAttribute(ATTR)
  }
  return large
}

function safeDoc() {
  return typeof document === 'undefined' ? null : document
}

function safeLocal() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
