// Фейковый HTMLAudioElement для тестов плеера: ровно те поля и методы, что
// читает и пишет ListenPlayer. События сами не приходят — их подаёт тест (или
// трасса оракула), как это делает браузер. Тот же фейк, только в CJS, живёт в
// scripts/extract-listenchoose.js: там он гоняет ПРОТОТИПНЫЙ ListeningPlayer.

export function makeFakeAudio() {
  const listeners = {}
  const audio = {
    currentTime: 0,
    duration: NaN,
    paused: true,
    ended: false,
    seeking: false,
    muted: false,
    volume: 1,
    playbackRate: 1,
    defaultPlaybackRate: 1,
    readyState: 0,
    src: '',
    loads: 0,
    pauses: 0,
    // Что вернёт play(): по умолчанию — успех; тест подменяет на отказ.
    playResult: () => Promise.resolve(),
    addEventListener(type, fn) {
      ;(listeners[type] = listeners[type] || []).push(fn)
    },
    removeEventListener(type, fn) {
      listeners[type] = (listeners[type] || []).filter((f) => f !== fn)
    },
    removeAttribute(name) {
      if (name === 'src') this.src = ''
    },
    // Как в спецификации HTML: загрузка возвращает темп к умолчательному.
    load() {
      this.loads++
      this.playbackRate = this.defaultPlaybackRate
    },
    pause() {
      this.paused = true
      this.pauses++
    },
    play() {
      this.paused = false
      this.ended = false
      return this.playResult()
    },
  }
  const fire = (type) => {
    for (const fn of [...(listeners[type] || [])]) fn({})
  }
  return { audio, listeners, fire }
}

/**
 * Прогон трассы оракула: шаг = { at, audio, ev, call, args }. Порядок внутри
 * шага — свойства audio, потом событие, потом вызов метода плеера.
 */
export function runTrace({ trace, makePlayer }) {
  let clock = 0
  const fake = makeFakeAudio()
  let heard = 0
  const player = makePlayer({ audio: fake.audio, now: () => clock, onHeard: () => heard++ })
  player.load('a.mp3')
  for (const step of trace.steps) {
    clock = step.at
    if (step.audio) Object.assign(fake.audio, step.audio)
    if (step.ev) fake.fire(step.ev)
    if (step.call) player[step.call](...(step.args || []))
  }
  return { player, audio: fake.audio, heard }
}
