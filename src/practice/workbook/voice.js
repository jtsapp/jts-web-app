'use client'

// Озвучка воркбука — порт VE/speak/playTrack из data/jtsworkbook-a0.html
// (:5110–5330). Прототип не возит аудио с собой: у задания есть id трека, и
// если mp3 не нашлось, реплики читает браузерный синтез.
//
// Почему тут столько кода на подбор голоса: в Windows и Android в списке
// лежат и eSpeak, и «Bahh/Zarvox», и выбор первого попавшегося en-голоса
// превращает урок в робота. Ранжирование и деление на диктора A/B — из
// прототипа, менять на «взять первый» нельзя.

/* ── Подбор голоса ─────────────────────────────────────────────────────── */
const TIER = [
  { re: /Google UK English Female/i, s: 130, g: 'f' },
  { re: /Google UK English Male/i, s: 126, g: 'm' },
  { re: /Google US English/i, s: 112, g: 'f' },
  { re: /Microsoft (Sonia|Libby|Maisie|Olivia)/i, s: 124, g: 'f' },
  { re: /Microsoft (Ryan|Thomas|Alfie|Noah)/i, s: 122, g: 'm' },
  { re: /Microsoft (Aria|Jenny|Emma|Ava|Michelle)/i, s: 110, g: 'f' },
  { re: /Microsoft (Guy|Andrew|Brian|Christopher)/i, s: 108, g: 'm' },
  { re: /Natural/i, s: 100, g: '' },
  { re: /Neural/i, s: 98, g: '' },
  { re: /\b(Serena|Kate|Stephanie|Martha|Fiona|Moira|Karen|Catherine|Samantha|Allison|Susan|Zoe|Nicky)\b/i, s: 78, g: 'f' },
  { re: /\b(Daniel|Oliver|Arthur|Graham|Alex|Tom|Aaron|Fred|Gordon|Rishi|Nathan)\b/i, s: 74, g: 'm' },
]
const JUNK = /espeak|e-speak|compact|eloquence|pico|festival|flite|robot|novelty|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Junior|Organ|Ralph|Superstar|Trinoids|Whisper|Wobble|Zarvox|Grandma|Grandpa|Rocko|Shelley|Sandy|Flo|Eddy|Reed|Princess/i
const FEM = /\b(female|woman|girl|Sonia|Libby|Olivia|Aria|Jenny|Emma|Ava|Michelle|Serena|Kate|Stephanie|Martha|Fiona|Moira|Karen|Catherine|Samantha|Allison|Susan|Zoe|Nicky|Amelie|Maisie|Hazel)\b/i
const MASC = /\b(male|man|boy|Ryan|Thomas|Alfie|Noah|Guy|Andrew|Brian|Christopher|Daniel|Oliver|Arthur|Graham|Alex|Tom|Aaron|Fred|Gordon|Rishi|Nathan|George|James|Mark)\b/i

export function scoreVoice(v) {
  const n = (v.name || '') + ' ' + (v.voiceURI || '')
  const lg = (v.lang || '').replace('_', '-')
  let s = 0
  if (!/^en/i.test(lg)) return -1000
  if (/^en-GB/i.test(lg)) s += 60
  else if (/^en-(IE|AU|NZ)/i.test(lg)) s += 42
  else if (/^en-US/i.test(lg)) s += 46
  else s += 18
  for (const tier of TIER) {
    if (tier.re.test(n)) {
      s += tier.s
      break
    }
  }
  if (v.localService === false) s += 14 // сетевые голоса — это как раз нейронные
  if (JUNK.test(n)) s -= 160
  if (/desktop/i.test(n)) s -= 22
  return s
}

export function voiceGender(v) {
  const n = (v.name || '') + ' ' + (v.voiceURI || '')
  for (const tier of TIER) if (tier.re.test(n) && tier.g) return tier.g
  if (FEM.test(n)) return 'f'
  if (MASC.test(n)) return 'm'
  return ''
}

/** Из списка голосов — пара «диктор A» и «диктор B» (женский + мужской). */
export function pickVoices(list) {
  const ok = []
  for (const v of list) {
    const s = scoreVoice(v)
    if (s > -500) ok.push({ v, s, g: voiceGender(v) })
  }
  if (!ok.length) return { a: null, b: null }
  ok.sort((x, y) => y.s - x.s)
  const f = ok.find((x) => x.g === 'f')
  const m = ok.find((x) => x.g === 'm')
  const a = (f || ok[0]).v
  let b = m && m.v !== a ? m.v : null
  // Второго голоса нет — берём ближайший по качеству; если и его нет, диктора B
  // изобразим сдвигом высоты (см. ниже).
  if (!b) b = (ok.find((x) => x.v !== a && x.s >= ok[0].s - 30) || {}).v || null
  return { a, b }
}

/* ── Разбор текста на реплики ──────────────────────────────────────────── */
/** Кривые кавычки и эмодзи ломают почти все движки — вычищаем до синтеза. */
export function normText(s) {
  return String(s == null ? '' : s)
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ')
    .replace(/[\u2190-\u21FF\u2300-\u23FF\u25A0-\u27BF\u2B00-\u2BFF\uFE0F\u20E3]/g, ' ')
    .replace(/[\u2018\u2019\u02BC\u00B4]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/_{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003
  return h
}
/** Микроразброс темпа и высоты: без него две реплики звучат идентично. */
function jit(s, spread) {
  return ((hash(s) % 1000) / 1000 - 0.5) * 2 * spread
}

/** Тире в реплике значит смену говорящего. */
export function turns(text, who) {
  const t = normText(text)
  const parts = t.split(/\s*[\u2014\u2013]\s+/)
  if (parts.length < 2) return [{ t, v: who || 'A' }]
  const out = []
  const start = who === 'B' ? 1 : 0
  parts.forEach((p, i) => {
    if (!p) return
    out.push({ t: p.trim(), v: (i + start) % 2 ? 'B' : 'A' })
  })
  return out.length ? out : [{ t, v: who || 'A' }]
}

/** Длинное предложение — на смысловые группы, чтобы не читалось по словам. */
export function groups(sent) {
  const s = sent.trim()
  if (s.split(' ').length <= 8) return [s]
  // \u0001 — служебная метка разреза: сначала помечаем места, потом режем.
  const MARK = '\u0001'
  const raw = s
    .replace(/,\s+/g, ', ' + MARK)
    .replace(/\s+(and|but|because|so|then|or)\s+/gi, ' ' + MARK + '$1 ')
    .split(MARK)
  if (raw.length < 2) return [s]
  const out = []
  let buf = ''
  for (const part of raw) {
    buf = buf ? buf + ' ' + part : part
    if (buf.split(' ').length >= 3) {
      out.push(buf.trim())
      buf = ''
    }
  }
  if (buf) {
    if (out.length) out[out.length - 1] += ' ' + buf.trim()
    else out.push(buf.trim())
  }
  return out.length ? out : [s]
}

function sentences(t) {
  const m = t.match(/[^.!?]+[.!?]*/g)
  return m ? m.map((x) => x.trim()).filter(Boolean) : [t]
}

/** План произнесения всего задания: куски, говорящий, интонация. */
export function plan(lines) {
  const q = []
  let prev = null
  for (const raw of lines) {
    let txt = raw
    let who = 'A'
    if (raw && typeof raw === 'object') {
      txt = raw.t != null ? raw.t : raw.s
      who = raw.v || (raw.w ? 'B' : 'A')
    }
    for (const tn of turns(txt, who)) {
      for (const ss of sentences(tn.t)) {
        const single = ss.split(' ').length <= 2 && !/[.!?]$/.test(ss)
        const gs = single ? [ss] : groups(ss)
        gs.forEach((g, gi) => {
          q.push({
            t: g,
            v: tn.v,
            end: gi === gs.length - 1,
            q: /\?$/.test(ss),
            ex: /!$/.test(ss),
            one: single,
            turn: prev !== null && prev !== tn.v,
          })
          prev = tn.v
        })
      }
    }
    if (q.length) q[q.length - 1].line = true
  }
  return q
}

/** Пауза после куска: вдох внутри фразы, реплика собеседника, новый пункт. */
export function gap(c, next, slow) {
  let base
  if (!c.end) base = 110
  else if (next && next.turn) base = 430
  else if (c.line) base = 520
  else base = 280
  base += Math.abs(jit(c.t, 55))
  return Math.round(slow ? base * 1.7 : base)
}

/* ── Синтез ────────────────────────────────────────────────────────────── */
let VA = null
let VB = null
let built = false
let token = 0
let keep = null
let curAudio = null

function synth() {
  try {
    return window.speechSynthesis || null
  } catch {
    return null
  }
}

/* Список голосов в Chrome приезжает асинхронно и первый getVoices() пуст —
   поэтому опрос с потолком в 2.5 с плюс подписка на voiceschanged. */
function withVoices(cb) {
  const sy = synth()
  if (!sy || built) {
    cb()
    return
  }
  const vs = sy.getVoices() || []
  if (vs.length) {
    ;({ a: VA, b: VB } = pickVoices(vs))
    built = true
    cb()
    return
  }
  let n = 0
  const iv = setInterval(() => {
    const v2 = sy.getVoices() || []
    if (v2.length || ++n > 25) {
      clearInterval(iv)
      if (v2.length) ({ a: VA, b: VB } = pickVoices(v2))
      built = true
      cb()
    }
  }, 100)
  try {
    sy.addEventListener('voiceschanged', () => {
      const v3 = sy.getVoices() || []
      if (v3.length && !VA) ({ a: VA, b: VB } = pickVoices(v3))
    })
  } catch {
    /* старый Safari без событий — доберём опросом */
  }
}

function clearKeep() {
  if (keep) {
    clearInterval(keep)
    keep = null
  }
}

export function stopAudio() {
  token++
  clearKeep()
  try {
    if (curAudio) {
      curAudio.pause()
      curAudio = null
    }
  } catch {
    /* элемент уже уничтожен */
  }
  try {
    const sy = synth()
    if (sy) sy.cancel()
  } catch {
    /* нет синтеза — нечего останавливать */
  }
}

export function speak(lines, { slow = false } = {}, cb) {
  const sy = synth()
  if (!sy || !lines || !lines.length) {
    if (cb) cb()
    return
  }
  stopAudio()
  const my = ++token
  const q = plan(lines)
  let i = 0
  withVoices(() => {
    if (my !== token) return
    clearKeep()
    // Chrome засыпает на длинных очередях — периодический resume это лечит.
    keep = setInterval(() => {
      try {
        if (sy.speaking && !sy.paused) sy.resume()
      } catch {
        /* вкладка ушла в фон */
      }
    }, 6000)

    const step = () => {
      if (my !== token) return
      if (i >= q.length) {
        clearKeep()
        if (cb) cb()
        return
      }
      const c = q[i++]
      let guard = false
      const u = new SpeechSynthesisUtterance(c.t)
      const vc = c.v === 'B' && VB ? VB : VA
      if (vc) {
        u.voice = vc
        u.lang = vc.lang || 'en-GB'
      } else {
        u.lang = 'en-GB'
      }
      let rate = slow ? 0.74 : 0.95
      let pitch = 1
      if (c.one) rate = slow ? 0.68 : 0.88 // одиночное слово — разборчиво
      if (c.v === 'B' && !VB) {
        pitch -= 0.2 // второго голоса нет — изображаем его высотой
        rate -= 0.02
      }
      if (!c.end) pitch += 0.035
      else if (c.q) {
        pitch += /^(are|is|am|do|does|did|can|have|has|will|would|could|shall|may)\b/i.test(c.t) ? 0.09 : 0.01
        rate += 0.01
      } else if (c.ex) {
        pitch += 0.07
        rate += 0.03
      }
      rate += jit(c.t, 0.035)
      pitch += jit(c.t + 'p', 0.04)
      u.rate = Math.max(0.5, Math.min(1.35, rate))
      u.pitch = Math.max(0.5, Math.min(1.6, pitch))
      u.volume = 1

      const go = () => {
        if (guard || my !== token) return
        guard = true
        setTimeout(step, gap(c, q[i], slow))
      }
      u.onend = go
      u.onerror = go
      // Сторож: движок иногда не отдаёт ни onend, ни onerror и очередь виснет.
      const wd = Math.round((c.t.length * 95) / u.rate) + 2600
      setTimeout(() => {
        if (!guard && my === token) go()
      }, wd)
      try {
        sy.speak(u)
      } catch {
        go()
      }
    }
    // Chrome глотает речь, начатую сразу после cancel().
    setTimeout(step, 90)
  })
}

/**
 * Трек задания: сначала mp3 по кандидатам, при неудаче — синтез реплик.
 * onState({playing}) поднимает состояние кнопки в React.
 */
export function playTrack(sources, lines, { slow = false, onState } = {}) {
  stopAudio()
  const state = (playing) => onState && onState(playing)
  state(true)
  const done = () => state(false)

  const paths = sources || []
  let k = 0
  const tryNext = () => {
    if (k >= paths.length) {
      curAudio = null
      speak(lines, { slow }, done)
      return
    }
    const a = new Audio(paths[k++])
    a.playbackRate = slow ? 0.75 : 1
    a.onended = done
    a.onerror = () => {
      curAudio = null
      tryNext()
    }
    curAudio = a
    const p = a.play()
    if (p && p.catch) {
      p.catch(() => {
        curAudio = null
        tryNext()
      })
    }
  }
  tryNext()
}
