// Бит «Неправильных глаголов» — порт объекта `audio` из data/jtsverbs.html.
//
// Время держат часы AudioContext, а не таймеры: удары и события планируются
// на ctx.currentTime с горизонтом 140 мс, а setInterval(25) только
// подкладывает следующую порцию. Так в прототипе, и так же здесь — дрожь
// setTimeout в 10–50 мс развела бы голос и бит на слух.
//
// Такт — 16 шестнадцатых; доля — четыре шестнадцатых (60/bpm секунд). Чётные
// шестнадцатые чуть отстают (свинг 17 %). Без AudioContext часы идут от
// performance.now() и бит молчит, но подсветка и события работают: тихий
// ритм-гид остаётся доступен и там, где звука нет.

let sharedCtx = null

/**
 * Общий AudioContext раздела: бит, записи форм и плеер таблицы звучат по
 * одним часам. Создаётся лениво — до первого касания браузер всё равно
 * держит его на паузе и ругается в консоль.
 */
export function audioContext() {
  if (sharedCtx) return sharedCtx
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  try {
    sharedCtx = new AC()
  } catch {
    sharedCtx = null
  }
  return sharedCtx
}

/**
 * Усыпить контекст, когда раздел ушёл с экрана. Разбуженный однажды, он иначе
 * гонит аудиопоток до закрытия вкладки — по всему приложению и в тишине.
 * Будит его обратно первое же касание (wake на каждом старте).
 */
export function suspendAudio() {
  if (!sharedCtx || sharedCtx.state !== 'running') return
  try {
    const r = sharedCtx.suspend()
    if (r && r.catch) r.catch(() => {})
  } catch {
    /* старый Safari без suspend — ничего страшного */
  }
}

/** Разбудить контекст — только из обработчика касания, иначе браузер откажет. */
export function resumeAudio(ctx, onFail) {
  if (!ctx || ctx.state !== 'suspended') return
  try {
    const r = ctx.resume()
    if (r && r.catch) r.catch(() => onFail && onFail())
  } catch {
    if (onFail) onFail()
  }
}

const now0 = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000

/**
 * @param {object} [opts]
 * @param {() => (AudioContext|null)} [opts.getContext] источник контекста (тест подменяет)
 * @param {() => number} [opts.clock] часы на случай, когда контекста нет
 *
 * Колбэки — свойства объекта, а не аргументы: экран вешает их, когда появится
 * машина попытки (onError('audioFailed') — звук не поднялся; onTempoApplied —
 * отложенный темп вступил в силу на границе такта).
 */
export function createBeat({ getContext = audioContext, clock = now0, setIntervalFn, clearIntervalFn } = {}) {
  const setI = setIntervalFn || ((fn, ms) => setInterval(fn, ms))
  const clearI = clearIntervalFn || ((id) => clearInterval(id))

  const beat = {
    ctx: null,
    gate: null,
    mix: null,
    noise: null,
    running: false,
    audible: false,
    ducked: false,
    nodes: [],
    timer: null,
    step: 0,
    nextTime: 0,
    bpm: 96,
    pending: null,
    visual: [],
    events: [],
    lastStep: 0,
    volume: 45,
    onError: null,
    onTempoApplied: null,

    fail(key) {
      if (this.onError) this.onError(key)
    },

    now() {
      return this.ctx ? this.ctx.currentTime : clock()
    },

    init() {
      if (this.ctx) return true
      const ctx = getContext()
      if (!ctx) return false
      try {
        this.gate = ctx.createGain()
        this.gate.gain.value = 0
        this.mix = ctx.createGain()
        this.mix.gain.value = this.volume / 100
        const comp = ctx.createDynamicsCompressor()
        comp.threshold.value = -15
        comp.ratio.value = 4
        this.gate.connect(this.mix)
        this.mix.connect(comp)
        comp.connect(ctx.destination)
        this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate)
        const d = this.noise.getChannelData(0)
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
        this.ctx = ctx
        return true
      } catch {
        this.ctx = null
        return false
      }
    },

    /**
     * Поднять и разбудить контекст, ничего не запуская. Зовётся синхронно из
     * обработчика касания: после await браузер счёл бы resume() автозапуском
     * и оставил звук на паузе.
     */
    wake() {
      this.init()
      resumeAudio(this.ctx, () => this.fail('audioFailed'))
    },

    /** Запуск часов. Уже идущие часы не перезапускаются — меняется только слышимость. */
    start(audible, bpm) {
      const ok = this.init()
      resumeAudio(this.ctx, () => this.fail('audioFailed'))
      if (!this.running) {
        this.running = true
        this.step = 0
        this.nextTime = this.now() + 0.1
        if (bpm) this.bpm = bpm
        this.visual = []
        this.events = []
        this.timer = setI(() => this.schedule(), 25)
      }
      this.setAudible(audible)
      if (!ok && audible) this.fail('audioFailed')
    },

    stop() {
      this.running = false
      this.audible = false
      this.ducked = false
      if (this.timer) clearI(this.timer)
      this.timer = null
      this.events = []
      this.visual = []
      this.pending = null
      this.lastStep = 0
      if (this.gate) {
        const n = this.now()
        this.gate.gain.cancelScheduledValues(n)
        this.gate.gain.setTargetAtTime(0, n, 0.008)
      }
      for (const node of this.nodes) {
        try {
          node.stop()
          node.disconnect()
        } catch {
          /* уже отыграл */
        }
      }
      this.nodes = []
    },

    // Бит включается с ближайшей доли, а не посреди неё: иначе первый удар
    // обрезан и сбивает счёт.
    setAudible(on) {
      this.audible = !!on
      if (!this.gate) return
      const n = this.now()
      const at = on && this.running ? this.nextBeat() : n
      this.gate.gain.cancelScheduledValues(n)
      this.gate.gain.setTargetAtTime(on ? 1 : 0, at, 0.008)
      this.updateVolume()
    },

    setVolume(v) {
      this.volume = v
      this.updateVolume()
    },

    updateVolume() {
      if (!this.mix) return
      const n = this.now()
      this.mix.gain.cancelScheduledValues(n)
      this.mix.gain.setTargetAtTime((this.volume / 100) * (this.ducked ? 0.2 : 1), n, 0.035)
    },

    /** Приглушить бит, пока студент говорит в микрофон: распознаватель слышит и его. */
    duck(on) {
      this.ducked = on
      this.updateVolume()
    },

    nextBeat() {
      const after = this.now() + 0.03
      for (const x of this.visual) if (x.time >= after && x.step % 4 === 0) return x.time
      const offset = (4 - (this.step % 4)) % 4
      return this.nextTime + (offset * 15) / this.bpm
    },

    nextBar() {
      const after = this.now() + 0.1
      for (const x of this.visual) if (x.time >= after && x.step % 16 === 0) return x.time
      return this.nextTime + (((16 - (this.step % 16)) % 16) * 15) / this.bpm
    },

    /** Событие на время часов: подсветка доли, конец цикла, открытие микрофона. */
    at(time, fn) {
      this.events.push({ time, fn })
      this.events.sort((a, b) => a.time - b.time)
    },

    schedule() {
      if (!this.running) return
      const now = this.now()
      while (this.nextTime < now + 0.14) {
        // Новый темп вступает только с начала такта: посреди такта он
        // разъехался бы с уже запланированными ударами.
        if (this.step % 16 === 0 && this.pending !== null) {
          this.bpm = this.pending
          this.pending = null
          if (this.onTempoApplied) this.onTempoApplied()
        }
        const b = this.step % 16
        const d = 15 / this.bpm
        const at = this.nextTime + (this.step % 2 ? 0.17 * d : 0)
        this.visual.push({ time: this.nextTime, step: this.step })
        if (this.ctx) {
          if (b === 0) {
            this.kick(at, 1)
            this.sub(at, 0.6)
          }
          if (b === 7 || b === 10) this.kick(at, 0.62)
          if (b === 4 || b === 12) this.snare(at, 0.65)
          if (b === 11 || b === 15) this.snare(at, 0.13)
          if (b % 2 === 0 || b === 7 || b === 15) this.hat(at, b % 4 === 0 ? 0.19 : 0.11)
        }
        this.step++
        this.nextTime += d
      }
      while (this.visual.length && this.visual[0].time <= now) this.lastStep = this.visual.shift().step
      while (this.events.length && this.events[0].time <= now + 0.004) {
        const ev = this.events.shift()
        ev.fn()
        if (!this.running) break
      }
    },

    track(n) {
      this.nodes.push(n)
      n.onended = () => {
        const i = this.nodes.indexOf(n)
        if (i >= 0) this.nodes.splice(i, 1)
        try {
          n.disconnect()
        } catch {
          /* уже отключён */
        }
      }
      return n
    },

    tone(at, f1, f2, len, vol, type) {
      const o = this.track(this.ctx.createOscillator())
      const g = this.ctx.createGain()
      o.type = type || 'sine'
      o.frequency.setValueAtTime(f1, at)
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), at + len)
      g.gain.setValueAtTime(Math.max(0.0001, vol), at)
      g.gain.exponentialRampToValueAtTime(0.0001, at + len)
      o.connect(g)
      g.connect(this.gate)
      o.start(at)
      o.stop(at + len + 0.01)
    },

    noiseHit(at, freq, type, len, vol) {
      const s = this.track(this.ctx.createBufferSource())
      const f = this.ctx.createBiquadFilter()
      const g = this.ctx.createGain()
      s.buffer = this.noise
      f.type = type
      f.frequency.value = freq
      g.gain.setValueAtTime(vol, at)
      g.gain.exponentialRampToValueAtTime(0.0001, at + len)
      s.connect(f)
      f.connect(g)
      g.connect(this.gate)
      s.start(at)
      s.stop(at + len)
    },

    kick(t, v) {
      this.tone(t, 155, 43, 0.23, 0.75 * v)
      this.noiseHit(t, 3000, 'highpass', 0.012, 0.12 * v)
    },
    snare(t, v) {
      this.noiseHit(t, 1800, 'bandpass', 0.16, v)
      this.tone(t, 180, 140, 0.11, 0.18 * v, 'triangle')
      this.tone(t, 320, 210, 0.08, 0.11 * v, 'triangle')
    },
    hat(t, v) {
      this.noiseHit(t, 7200, 'highpass', 0.05, v)
    },
    sub(t, v) {
      this.tone(t, 48, 43, 0.32, v * 0.35)
    },
    /** Щелчок отсчёта «4-3-2-1»; последний — выше. Идёт через тот же гейт, что бит. */
    click(t, accent) {
      if (this.ctx) this.tone(t, accent ? 1250 : 900, accent ? 1250 : 900, 0.035, 0.1)
    },
  }
  return beat
}
