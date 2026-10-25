// Живая подсветка прочитанного на телесуфлёре — Web Speech API, как в прототипе (Д7: только Chrome/Edge).
// Итог считает не она, а /api/transcribe по записи; живое распознавание — запасной путь итога и подсказка
// глазу во время чтения.
//
// Наличию API не верим — проверяем поведение, как Аркада (src/practice/arcade/transcript.js): Opera GX отдаёт
// webkitSpeechRecognition, принимает start() и молчит — ни старта, ни слов, ни ошибки. Нет события start за
// START_TIMEOUT или ни одного слова за первые NO_WORDS_MS — распознавание «молчит»: подсветка выключается до
// конца попытки, итог посчитает сервер.
//
// Отличие от прототипа: после перезапуска (Chrome закрывает сессию на паузах, onend → start) прототип терял
// уже услышанное — список результатов новой сессии пуст, и зелёные слова гасли. Здесь финальные слова прошлых
// сессий копятся.

import { START_TIMEOUT } from '../arcade/transcript.js'
import { srWords } from './rules.js'

export { START_TIMEOUT }
export const NO_WORDS_MS = 6000
// Перезапусков за попытку: больше — распознаватель бьётся в цикле «start → end», и мы его отпускаем.
const MAX_RESTARTS = 60

// Причины отказа → код для экрана.
const REASONS = {
  'not-allowed': 'blocked',
  'service-not-allowed': 'blocked',
  network: 'network',
  'audio-capture': 'audio',
}

/**
 * Живая подсветка — только Chrome и Edge на компьютере (Д7). На телефонах распознаватель браузера и запись делят
 * один микрофон: на iPhone и Android дорожка записи глохнет или распознаватель отвечает audio-capture, а Android
 * ещё и пищит на каждом перезапуске сессии. Итог там считает сервер, подсветки просто нет.
 */
export function liveAllowed(nav = globalThis.navigator) {
  if (!nav) return false
  const uad = nav.userAgentData
  if (uad && typeof uad.mobile === 'boolean') {
    if (uad.mobile) return false
    return (uad.brands || []).some((b) => /Chrom|Edge/i.test(b.brand))
  }
  const ua = String(nav.userAgent || '')
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return false
  return /Chrome\/|Edg\//.test(ua)
}

/** Распознаватель браузера или null (нет API или браузер не из тех, где живая подсветка включена). */
export function browserRecognition(env = globalThis) {
  if (!liveAllowed(env.navigator)) return null
  const Ctor = env.SpeechRecognition || env.webkitSpeechRecognition
  if (!Ctor) return null
  try {
    return new Ctor()
  } catch {
    return null
  }
}

/**
 * @param {{ createRecognition: () => object|null, onWords: (words: string[]) => void,
 *   onDead?: (code: 'silent'|'blocked'|'network'|'audio'|'other') => void, timers?: object }} opts
 * @returns {{ stop(): void } | null}  null — распознавателя нет
 */
export function startLive({ createRecognition, onWords, onDead = () => {}, timers = globalThis }) {
  const r = createRecognition?.()
  if (!r) return null
  let alive = true
  let started = false
  let gotWords = false
  let restarts = 0
  let before = [] // финальные слова прошлых сессий
  let finals = [] // финальные слова текущей сессии
  const ids = []
  const later = (fn, ms) => ids.push(timers.setTimeout(fn, ms))
  const clear = () => ids.splice(0).forEach((id) => timers.clearTimeout(id))
  const detach = () => {
    r.onstart = r.onresult = r.onerror = r.onend = null
  }
  const kill = (code) => {
    if (!alive) return
    alive = false
    clear()
    detach()
    try {
      r.abort()
    } catch {
      /* уже стоит */
    }
    onDead(code)
  }

  r.lang = 'en-US'
  r.continuous = true
  r.interimResults = true
  r.onstart = () => {
    started = true
  }
  r.onresult = (e) => {
    const fin = []
    const inter = []
    for (let i = 0; i < e.results.length; i++) {
      const t = e.results[i][0]?.transcript || ''
      ;(e.results[i].isFinal ? fin : inter).push(t)
    }
    finals = srWords(fin.join(' '))
    const words = [...before, ...finals, ...srWords(inter.join(' '))]
    if (words.length) gotWords = true
    onWords(words)
  }
  r.onerror = (e) => {
    const code = REASONS[e?.error]
    if (code) kill(code)
  }
  r.onend = () => {
    if (!alive) return
    before = [...before, ...finals]
    finals = []
    if (++restarts > MAX_RESTARTS) return kill('other')
    try {
      r.start()
    } catch {
      kill('other')
    }
  }
  later(() => !started && kill('silent'), START_TIMEOUT * 1000)
  later(() => !gotWords && kill('silent'), NO_WORDS_MS)
  try {
    r.start()
  } catch {
    kill('other')
  }
  return {
    stop() {
      if (!alive) return
      alive = false
      clear()
      detach()
      try {
        r.stop()
      } catch {
        /* уже стоит */
      }
    },
  }
}
