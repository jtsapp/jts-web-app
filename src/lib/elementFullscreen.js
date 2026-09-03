// Полный экран для одного элемента. Читалки уводят туда свой корень, а не всю
// страницу: сайдбар и шапка иначе остаются в раскладке и съедают ту же высоту,
// ради которой полный экран и включают. Элемент в fullscreen попадает в top
// layer, поэтому transform у предков (анимация входа экрана) ему не мешает.
//
// API есть не везде (на iOS Safari его нет), и запрос браузер может отклонить
// (нет жеста, политика разрешений во встроенном вебвью). Поэтому запрос
// отвечает булевым «получилось»: вызывающий код по нему включает свой
// fixed-оверлей вместо настоящего полного экрана.

// Сколько ждём ответа браузера и подтверждения, что он и правда ушёл в полный
// экран. Два таких шага — верхняя граница ожидания перед откатом на оверлей.
const SETTLE_MS = 150

const wait = (ms) => new Promise((done) => setTimeout(done, ms))

export function getFullscreenElement() {
  if (typeof document === 'undefined') return null
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

// Возвращает, получилось ли: false значит «браузер не дал», и звать оверлей.
// Обещанию тут веры нет: встроенные вебвью то отклоняют запрос, то резолвят
// его и остаются в окне, то не отвечают вовсе, а старый prefixed-API вообще
// ничего не возвращает. Верим только document.fullscreenElement.
export async function requestElementFullscreen(el) {
  if (!el) return false
  if (getFullscreenElement() === el) return true
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen
  if (!req) return false
  try {
    const r = req.call(el)
    if (r && typeof r.then === 'function') {
      // Отказ может прийти и после гонки — гасим его, чтобы не ловить
      // unhandled rejection.
      r.catch(() => {})
      await Promise.race([r, wait(SETTLE_MS)])
    }
  } catch {
    return false
  }
  if (getFullscreenElement() === el) return true
  await wait(SETTLE_MS)
  return getFullscreenElement() === el
}

export function exitFullscreen() {
  if (typeof document === 'undefined') return
  if (!getFullscreenElement()) return
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen
  if (!exit) return
  try {
    const r = exit.call(document)
    if (r && typeof r.catch === 'function') r.catch(() => {})
  } catch { /* ignore */ }
}

// Из режима выходят и мимо нашей кнопки — Esc, F11, системный жест. Поэтому
// состояние экрана держим по событию, а не по своему клику.
export function onFullscreenChange(cb) {
  if (typeof document === 'undefined') return () => {}
  document.addEventListener('fullscreenchange', cb)
  document.addEventListener('webkitfullscreenchange', cb)
  return () => {
    document.removeEventListener('fullscreenchange', cb)
    document.removeEventListener('webkitfullscreenchange', cb)
  }
}
