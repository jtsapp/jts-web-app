// Полный экран для одного элемента. Читалки уводят туда свой корень, а не всю
// страницу: сайдбар и шапка иначе остаются в раскладке и съедают ту же высоту,
// ради которой полный экран и включают. Элемент в fullscreen попадает в top
// layer, поэтому transform у предков (анимация входа экрана) ему не мешает.
//
// API есть не везде (на iOS Safari его нет), и запрос браузер может отклонить —
// поэтому каждая функция безопасно вырождается в no-op, а кнопку вызывающий код
// прячет по isElementFullscreenSupported().

export function getFullscreenElement() {
  if (typeof document === 'undefined') return null
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

export function isElementFullscreenSupported() {
  if (typeof document === 'undefined') return false
  const el = document.documentElement
  return !!(el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)
}

export function requestElementFullscreen(el) {
  if (!el || getFullscreenElement() === el) return
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen
  if (!req) return
  try {
    const r = req.call(el)
    if (r && typeof r.catch === 'function') r.catch(() => {})
  } catch { /* ignore — полный экран это удобство, а не обязанность */ }
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
