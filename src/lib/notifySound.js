/**
 * Короткие звуковые сигналы кабинета: пришло сообщение от преподавателя, он
 * добавил слово в словарь, выдал домашнюю работу, включил или остановил таймер.
 *
 * Почему синтез, а не файлы: сигналов пять, каждый — доли секунды, и класть
 * ради них пять mp3 в бандл (плюс путь до статики, плюс кеш) дороже, чем
 * сгенерировать тон. Заодно ничего не грузится в момент, когда сигнал уже нужен.
 *
 * Один общий AudioContext на вкладку: браузер ограничивает их число, а создавать
 * новый на каждый сигнал — верный способ упереться в лимит за урок.
 *
 * Автовоспроизведение: контекст создаётся при ПЕРВОМ сигнале, а не при загрузке,
 * и `resume()` вызывается каждый раз. До первого касания вкладки браузер держит
 * его в `suspended`, и звук просто не прозвучит — это нормально и не ошибка:
 * к моменту, когда преподаватель пишет в чат, ученик уже что-то нажимал.
 */

const PREF_KEY = 'jts.sound.enabled'

/** Тон(ы) каждого сигнала: [частота Гц, длительность мс]. */
const CUES = {
  // Сообщение — две ноты вверх: «к тебе обратились».
  message: [[660, 90], [880, 110]],
  // Слово в словарь — один короткий тихий пинг, событие фоновое.
  word: [[990, 70]],
  // Домашняя работа и прочее из колокольчика — заметнее сообщения.
  notification: [[520, 110], [700, 140]],
  // Таймер пошёл — одна нота, чтобы не спорить с заданием.
  timerStart: [[700, 90]],
  // Время вышло — настойчивее: этот сигнал должен дойти.
  timerEnd: [[880, 130], [660, 130], [880, 200]],
}

let ctx = null

export function isSoundEnabled() {
  try {
    // По умолчанию включено: сигнал, о котором никто не знает, бесполезен.
    return window.localStorage.getItem(PREF_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabled(on) {
  try {
    window.localStorage.setItem(PREF_KEY, on ? 'on' : 'off')
  } catch {
    /* приватное окно — просто не запомним выбор */
  }
}

export function playCue(name) {
  const cue = CUES[name]
  if (!cue || typeof window === 'undefined' || !isSoundEnabled()) return
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return

  try {
    if (!ctx) ctx = new Ctx()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})

    let at = ctx.currentTime
    for (const [freq, ms] of cue) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      // Плавные фронты: прямоугольная огибающая даёт щелчок на старте и в конце.
      const dur = ms / 1000
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.09, at + 0.012)
      gain.gain.setValueAtTime(0.09, at + dur - 0.02)
      gain.gain.linearRampToValueAtTime(0, at + dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + dur)
      at += dur
    }
  } catch {
    /* звук — не то, ради чего стоит ронять урок */
  }
}
