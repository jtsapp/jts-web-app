// Полноэкранный режим симуляции и past papers (SAT-SYNC-PLAN B6/B7, прототип JTS.fullWindow, c0cc8661): тест
// сдаётся во всё окно, как на экзамене — без сайдбара (свои экраны App без меню) и с браузером во весь экран.
// Браузер пускает в полный экран только сразу после нажатия, поэтому enter() зовут в обработчике клика, до await.

export function enterFullWindow() {
  try {
    const d = document.documentElement
    if (!document.fullscreenElement && d.requestFullscreen) {
      // отказ (iOS Safari, политика iframe) — не ошибка: тест идёт и без полного экрана
      d.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
    }
  } catch {
    /* без Fullscreen API — тест во всё окно вкладки */
  }
}

export function leaveFullWindow() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {})
  } catch {
    /* уже вышли */
  }
}
