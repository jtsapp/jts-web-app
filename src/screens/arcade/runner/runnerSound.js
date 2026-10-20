'use client'

// Звуки «Word Rush»: верные ворота, ошибка, удар, монета, турбо и снесённое
// в турбо препятствие. Какой звук дал кадр, решает чистый cues.js, здесь —
// только как он звучит.
//
// Синтез, а не файлы: сигналы короткие (доли секунды), их шесть, и mp3 ради
// них — это загрузка, кэш и задержка в момент, когда звук нужен прямо сейчас.
// Это сигналы игры, а не речь, поэтому запрет на синтез произношения (он про
// слова) их не касается — как и звон «Слов в картинках».
//
// Контекст один на вкладку: браузер держит ограниченное число контекстов, и
// новый на каждый заход в игру упёрся бы в лимит. Уходя с экрана, игра его
// усыпляет (`sleepRunnerSound`): разбуженный, он гнал бы пустой аудиопоток по
// всему приложению — так же делает раздел «Неправильные глаголы».

const PREF_KEY = 'jts_arcade_runner_sound'
// Общая громкость. Пики нот ниже подобраны относительно друг друга: удар и
// ошибка заметнее монеты, монет за забег сотни — они не должны утомлять.
const MASTER = 0.7
// Цепочка монет звучит лесенкой вверх: монета, взятая не позже этого после
// предыдущей, на тон выше. Цепочка — пять монет за ~секунду бега.
const COIN_CHAIN = 0.5
const COIN_STEPS = 6

let ctx = null
let master = null
let noiseBuf = null
let enabled = null
let coinAt = -1
let coinStep = 0

export function isRunnerSoundOn() {
  if (enabled === null) {
    try {
      // По умолчанию звук включён: выключенный звук, о котором никто не знает,
      // всё равно что его нет.
      enabled = window.localStorage.getItem(PREF_KEY) !== 'off'
    } catch {
      enabled = true
    }
  }
  return enabled
}

export function setRunnerSoundOn(on) {
  enabled = !!on
  try {
    window.localStorage.setItem(PREF_KEY, on ? 'on' : 'off')
  } catch {
    /* приватное окно — выбор живёт до перезагрузки */
  }
  if (on) wakeRunnerSound()
}

// Будить — в обработчике нажатия (старт, «продолжить», включение звука):
// iPhone отпускает звук только контексту, созданному или возобновлённому в
// тике касания. Кадры забега — уже не касание.
export function wakeRunnerSound() {
  try {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!AC) return null
    if (!ctx) {
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = MASTER
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null
  }
}

export function sleepRunnerSound() {
  try {
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {})
  } catch {
    /* усыпить не вышло — контекст просто останется бодрым */
  }
}

export function playRunnerCue(name) {
  const play = CUES[name]
  if (!play || !isRunnerSoundOn()) return
  // Забег мог начаться с клавиатуры, без кнопки «Старт»: нажатие клавиши —
  // тоже касание страницы, и контекст здесь поднимется.
  if (!wakeRunnerSound()) return
  try {
    // Чуть вперёд от «сейчас»: нота, поставленная ровно на currentTime,
    // иногда теряет атаку — первый период уже прошёл.
    play(ctx.currentTime + 0.005)
  } catch {
    // Звук — украшение: забег идёт и без него.
  }
}

const CUES = {
  // Монета — две яркие ноты вверх (си → ми), классический «дзынь» аркад.
  // В цепочке каждая следующая на тон выше: слышно, что собираешь подряд.
  coin(at) {
    coinStep = at - coinAt < COIN_CHAIN ? Math.min(COIN_STEPS, coinStep + 1) : 0
    coinAt = at
    const r = 2 ** ((coinStep * 2) / 12)
    tone(at, 988 * r, 0.07, { type: 'square', peak: 0.07, filter: 4000 })
    tone(at + 0.06, 1319 * r, 0.16, { type: 'square', peak: 0.07, filter: 4000 })
  },
  // Турбо — разгон: пила взмывает вверх, поверх — быстрое арпеджио.
  boost(at) {
    tone(at, 180, 0.45, { type: 'sawtooth', to: 1400, peak: 0.1, filter: 2600 })
    const notes = [784, 988, 1175, 1568]
    notes.forEach((f, i) => tone(at + 0.1 + i * 0.06, f, 0.16, { type: 'triangle', peak: 0.12 }))
  },
  // Верные ворота — мажорное арпеджио до-ми-соль-до, последняя нота тянется.
  // Мягче монеты (треугольник, а не меандр): это награда, а не мелочь.
  correct(at) {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => tone(at + i * 0.06, f, i === notes.length - 1 ? 0.32 : 0.12, { type: 'triangle', peak: 0.16 }))
  },
  // Ошибка — две низкие ноты вниз с «провалом» в конце: жизнь потеряна.
  wrong(at) {
    tone(at, 220, 0.16, { type: 'sawtooth', peak: 0.12, filter: 1200 })
    tone(at + 0.16, 165, 0.36, { type: 'sawtooth', to: 120, peak: 0.12, filter: 900 })
  },
  // Удар о препятствие — глухой стук: шум снизу и падающий бас.
  crash(at) {
    noise(at, 0.28, { type: 'lowpass', freq: 700, peak: 0.45 })
    tone(at, 140, 0.24, { to: 45, peak: 0.32 })
  },
  // Препятствие снесено в турбо — короткий хруст повыше удара: это не беда.
  smash(at) {
    noise(at, 0.18, { type: 'bandpass', freq: 1800, q: 1.2, peak: 0.35 })
    tone(at, 600, 0.12, { type: 'square', to: 200, peak: 0.04, filter: 2000 })
  },
}

function tone(at, freq, dur, { type = 'sine', to = 0, peak = 0.15, filter = 0 } = {}) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, at + dur)
  envelope(gain.gain, at, dur, peak)
  let tail = osc
  if (filter) {
    // Меандр и пила без фильтра режут ухо — срезаем верх.
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = filter
    osc.connect(lp)
    tail = lp
  }
  tail.connect(gain)
  gain.connect(master)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

function noise(at, dur, { type = 'lowpass', freq = 800, q = 0.7, peak = 0.3 } = {}) {
  if (!noiseBuf) {
    // Полсекунды белого шума на всю вкладку — длиннее шумовые звуки не бывают.
    noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.5), ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  if (f.Q) f.Q.value = q
  const gain = ctx.createGain()
  envelope(gain.gain, at, dur, peak)
  src.connect(f)
  f.connect(gain)
  gain.connect(master)
  src.start(at)
  src.stop(at + dur + 0.02)
}

// Быстрая атака и экспоненциальный спад. Экспонента не умеет от нуля и до
// нуля — отсюда 0.0001 вместо тишины; прямоугольная огибающая щёлкала бы.
function envelope(param, at, dur, peak) {
  param.setValueAtTime(0.0001, at)
  param.exponentialRampToValueAtTime(peak, at + 0.006)
  param.exponentialRampToValueAtTime(0.0001, at + dur)
}
