// Прокрутка экрана после «назад» (lib/navStack.js). Экран монтируется заново и
// докачивает содержимое (каталоги Практики, список домашки) — страница
// дорастает до нужной высоты не сразу. Поэтому не один scrollTo, а попытки по
// кадрам, пока высоты не хватит, не дольше нескольких секунд. Человек сам
// крутанул или нажал клавишу — его выбор важнее, попытки прекращаются.
const GIVE_UP_MS = 4000
const STOP_EVENTS = ['wheel', 'touchstart', 'keydown', 'mousedown']

export function restoreScroll(y, win = typeof window === 'undefined' ? null : window) {
  if (!win || !(y > 0)) return () => {}
  const started = Date.now()
  let frame = 0
  let stopped = false
  const stop = () => {
    stopped = true
    if (frame) win.cancelAnimationFrame(frame)
    for (const type of STOP_EVENTS) win.removeEventListener(type, stop, true)
  }
  for (const type of STOP_EVENTS) win.addEventListener(type, stop, { capture: true, passive: true })
  const tick = () => {
    if (stopped) return
    const doc = win.document.scrollingElement || win.document.documentElement
    const room = doc.scrollHeight - win.innerHeight
    if (room >= y) {
      win.scrollTo(0, y)
      // Ещё пара кадров: экран на монтировании мог сам подкрутить к началу.
      if (Math.abs(win.scrollY - y) < 2 && Date.now() - started > 300) return stop()
    } else if (room > 0) {
      win.scrollTo(0, room)
    }
    if (Date.now() - started > GIVE_UP_MS) return stop()
    frame = win.requestAnimationFrame(tick)
  }
  frame = win.requestAnimationFrame(tick)
  return stop
}
