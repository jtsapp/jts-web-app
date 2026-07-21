// Звук Словаря — порт TTS + SFX из public/vocab/index.html без изменений
// логики. Модульные синглтоны (голоса, AudioContext), т.к. и то и другое —
// ресурсы уровня вкладки, а не компонента.

/* ─────────────── TTS ───────────────
   Качество Web Speech API зависит от голосов устройства: ранжируем все
   английские и берём самый «человеческий» для каждого акцента (en-US / en-GB),
   отдавая приоритет neural/enhanced. Офлайн, без сети. */
let voices = []
const VOICE = { us: null, gb: null }
const GOOD_US =
  /(samantha|allison|ava|susan|zoe|nicky|aaron|tom|evan|joanna|matthew|salli|kendra|joey|guy|jenny|aria|zira|david|mark)/i
const GOOD_GB = /(daniel|kate|serena|oliver|arthur|libby|sonia|ryan|hazel|george|amy|emma|brian|thomas|martha)/i

function rankVoice(v, want) {
  const n = v.name || ''
  const l = (v.lang || '').replace('_', '-').toLowerCase()
  const region = want.split('-')[1].toLowerCase()
  if (l.indexOf('en') !== 0) return -1
  let s = 0
  if (l === want.toLowerCase()) s += 60
  else if (l.indexOf('en-' + region) === 0) s += 55
  else s += 8
  if (/natural|neural|premium|enhanced|online|wavenet/i.test(n)) s += 35
  if (/google/i.test(n)) s += 24
  if (/microsoft/i.test(n)) s += 10
  if ((want === 'en-US' ? GOOD_US : GOOD_GB).test(n)) s += 16
  if (v.localService === false) s += 6
  if (/compact|eloquence|espeak|pico|robot/i.test(n)) s -= 30
  if (v.default) s += 2
  return s
}

function chooseVoices() {
  try {
    voices = window.speechSynthesis.getVoices() || []
  } catch {
    voices = []
  }
  const best = (want) => {
    let b = null
    let bs = -1
    voices.forEach((v) => {
      const sc = rankVoice(v, want)
      if (sc > bs) {
        bs = sc
        b = v
      }
    })
    return b
  }
  VOICE.us = best('en-US')
  VOICE.gb = best('en-GB')
}

export function initVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  chooseVoices()
  window.speechSynthesis.onvoiceschanged = chooseVoices
}

// Омографы: в датасете у этих слов ровно один смысл (глагол), а TTS без
// контекста читает более частую форму. Подменяем только одиночные слова —
// примеры-предложения произносятся с контекстом.
const RESPELL = { read: 'reed', close: 'cloze', live: 'liv', tear: 'tare', bow: 'bough' }
let voiceWarned = false
let speakTimer = null

// onNoVoice — колбэк для тоста «нет английского голоса» (в прототипе toast()).
export function speak(text, { accent = 'us', onStart, onEnd, onNoVoice } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* не поддержано — просто продолжаем */
  }
  clearTimeout(speakTimer)
  if (!voices.length) chooseVoices()
  if (!voices.length) {
    // Chrome отдаёт список голосов асинхронно — одна повторная попытка
    speakTimer = setTimeout(() => {
      chooseVoices()
      if (voices.length) speak(text, { accent, onStart, onEnd, onNoVoice })
      else if (!voiceWarned) {
        voiceWarned = true
        onNoVoice && onNoVoice()
      }
    }, 300)
    return
  }
  const gb = accent === 'gb'
  const v = gb ? VOICE.gb : VOICE.us
  // Английского голоса нет — молчим, а не отдаём слово русскому/казахскому голосу.
  if (!v || !/^en[-_]/i.test(v.lang || '')) {
    if (!voiceWarned) {
      voiceWarned = true
      onNoVoice && onNoVoice()
    }
    onEnd && onEnd()
    return
  }
  const single = /^[a-z'’-]+$/i.test(String(text).trim())
  const u = new SpeechSynthesisUtterance(
    single ? RESPELL[String(text).trim().toLowerCase()] || text : text,
  )
  u.lang = gb ? 'en-GB' : 'en-US'
  u.voice = v
  u.rate = 0.96
  u.pitch = 1.0
  u.volume = 1.0
  if (onStart) u.onstart = onStart
  if (onEnd) {
    u.onend = onEnd
    u.onerror = onEnd
  }
  // Пауза после cancel(): Chrome иногда «глотает» реплику сразу за отменой.
  speakTimer = setTimeout(() => {
    try {
      window.speechSynthesis.speak(u)
    } catch {
      onEnd && onEnd()
    }
  }, 40)
}

/* ─────────────── SFX (WebAudio) ─────────────── */
let AC = null
export function ac() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)()
    if (AC.state === 'suspended') AC.resume()
  } catch {
    /* нет WebAudio — звук просто не играет */
  }
  return AC
}

function tone(freq, t0, dur, type, gain) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type || 'sine'
  o.frequency.value = freq
  o.connect(g)
  g.connect(c.destination)
  const s = c.currentTime + t0
  g.gain.setValueAtTime(0.0001, s)
  g.gain.exponentialRampToValueAtTime(gain || 0.18, s + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, s + dur)
  o.start(s)
  o.stop(s + dur + 0.02)
}

export function sfx(kind, on = true) {
  if (!on) return
  if (kind === 'good') {
    tone(660, 0, 0.12, 'triangle', 0.16)
    tone(990, 0.08, 0.16, 'triangle', 0.16)
  } else if (kind === 'bad') {
    tone(200, 0, 0.18, 'sawtooth', 0.12)
    tone(150, 0.08, 0.2, 'sawtooth', 0.1)
  } else if (kind === 'tap') {
    tone(420, 0, 0.05, 'square', 0.08)
  } else if (kind === 'reveal') {
    tone(520, 0, 0.1, 'sine', 0.12)
    tone(780, 0.06, 0.12, 'sine', 0.12)
  } else if (kind === 'win') {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.18, 'triangle', 0.16))
  }
}

export function buzz(p) {
  try {
    navigator.vibrate && navigator.vibrate(p)
  } catch {
    /* без вибромотора — молча */
  }
}
