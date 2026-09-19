// «Послушай и повтори» таблицы — порт player из data/jtsverbs.html.
//
// Прототип читал таблицу браузерным синтезом с выбором голоса. У нас каждая
// форма записана (те же записи, что звучат на бит), а синтез в приложении —
// лотерея: на Windows и Android в списке лежит eSpeak. Поэтому таблица
// звучит записями; пропали выбор голоса и скорость, пауза на повтор и повтор
// группы остались.
//
// Очередь отменяемая: каждая остановка, пауза и «дальше» сдвигают поколение,
// и хвосты старой очереди (onended, таймеры) молча отваливаются. Без этого
// смена фильтра посреди группы доигрывала бы старую группу поверх новой.

import { formClips } from './engine.js'

const FORM_GAP_MS = 320 // между V1, V2 и V3 — как в прототипе
const VARIANT_GAP_MS = 180 // между was и were внутри одной формы

/**
 * @param {object} deps
 * @param {{ensure(keys: string[]): Promise<void>, play(key, at, onEnded): boolean, stop(): void}} deps.clips
 * @param {number} [deps.pause] пауза на повтор после глагола, секунды (setPause меняет на ходу)
 * @param {(state: object) => void} deps.onChange
 */
export function createTablePlayer({ clips, pause = 3, onChange, setTimeoutFn, clearTimeoutFn }) {
  const later = setTimeoutFn || ((fn, ms) => setTimeout(fn, ms))
  const cancel = clearTimeoutFn || ((id) => clearTimeout(id))

  const p = { list: [], index: 0, form: 0, active: false, paused: false, loop: false, pause, timer: null, generation: 0, waiting: false, error: false }

  function emit() {
    onChange({
      active: p.active,
      paused: p.paused,
      waiting: p.waiting,
      error: p.error,
      verb: p.active ? p.list[p.index] : null,
      index: p.index,
      total: p.list.length,
    })
  }

  function clearTimer() {
    if (p.timer) cancel(p.timer)
    p.timer = null
  }

  function stop() {
    p.generation++
    clearTimer()
    p.active = false
    p.paused = false
    p.waiting = false
    p.list = []
    clips.stop()
    emit()
  }

  function fail() {
    stop()
    p.error = true
    emit()
  }

  // Форма целиком: варианты подряд с короткой паузой, потом колбэк.
  function playKeys(keys, gen, done) {
    let i = 0
    const next = () => {
      if (gen !== p.generation) return
      if (i >= keys.length) return done()
      const key = keys[i++]
      const ok = clips.play(key, null, () => {
        if (gen !== p.generation) return
        if (i < keys.length) p.timer = later(next, VARIANT_GAP_MS)
        else done()
      })
      if (!ok) fail()
    }
    next()
  }

  function playForm() {
    if (!p.active || p.paused) return
    const gen = p.generation
    const v = p.list[p.index]
    p.waiting = false
    emit()
    const keys = formClips(v, p.form)
    clips.ensure(keys).then(
      () => {
        // Исключение здесь иначе ушло бы в никуда, а плеер завис бы в
        // «Звучит» — ведём туда же, куда и отказ загрузки.
        try {
          playKeys(keys, gen, () => {
            if (gen !== p.generation || !p.active || p.paused) return
            p.form++
            if (p.form < 3) {
              p.timer = later(playForm, FORM_GAP_MS)
            } else {
              p.form = 0
              p.waiting = true
              emit()
              p.timer = later(advance, p.pause * 1000 + 200)
            }
          })
        } catch {
          if (gen === p.generation) fail()
        }
      },
      () => {
        if (gen === p.generation) fail()
      },
    )
  }

  function advance() {
    if (!p.active || p.paused) return
    p.index++
    if (p.index >= p.list.length) {
      if (p.loop) p.index = 0
      else {
        stop()
        return
      }
    }
    p.form = 0
    playForm()
  }

  return {
    start(list, { loop = false } = {}) {
      if (!list || !list.length) return
      if (clips.wake) clips.wake()
      stop()
      p.error = false
      p.list = list.slice()
      p.index = 0
      p.form = 0
      p.active = true
      p.paused = false
      p.loop = loop
      playForm()
    },
    stop,
    pauseResume() {
      if (!p.active) return
      if (p.paused) {
        if (clips.wake) clips.wake()
        p.paused = false
        playForm()
      } else {
        p.paused = true
        p.generation++
        clearTimer()
        clips.stop()
        emit()
      }
    },
    next() {
      if (!p.active) return
      p.generation++
      clearTimer()
      clips.stop()
      p.paused = false
      advance()
    },
    setLoop(on) {
      p.loop = !!on
    },
    /** Пауза читается на каждом переходе — новая действует со следующего глагола. */
    setPause(sec) {
      p.pause = sec
    },
    get state() {
      return { ...p }
    },
  }
}
