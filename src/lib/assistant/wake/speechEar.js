// «Ухо» позывного на распознавании самого браузера (Web Speech API) — без загрузки модели.
//
// Задача 202, пункт 2 («нужно чтобы без скачивания работало»), решение владельца 16.11.2026: Vosk на устройстве
// (wakeEar.js) качал 47 МБ у Луны и 61 МБ у Айзере, и даже без словаря языка одна акустическая модель весит ~23 МБ —
// без загрузки распознать речь на устройстве нечем. Распознавание браузера уже есть в Chrome, Edge и Safari. Цена —
// пока позывной включён, речь слушает сервис браузера (в Chrome — Google): обещание «звук никуда не уходит» снято, на
// экране сказано как есть. В Firefox распознавателя нет — переключателя позывного там нет.
//
// Интерфейс тот же, что у wakeEar.js (start / prepare / stop / resume / dispose, onState, onWake), поэтому
// useWakeWord и окно Луны от движка почти не зависят. Отличия:
//  - текст — настоящая стенограмма, а не выбор из грамматики: «Луна, где домашка?» приходит целиком (onWake с
//    full: true), и окну не нужен звук команды (preroll) и второе распознавание на сервере;
//  - до первого касания страницы браузер не стартует распознавание — «ухо» спит (asleep), как и прежнее с
//    AudioContext; будит его resume() из нажатия;
//  - распознаватель сам заканчивает слушать (тишина, сеть) — тогда «ухо» становится idle, и useWakeWord заводит его
//    снова на следующем тике;
//  - распознаватель бывает «немым» (Opera GX: start() принят, а дальше ни старта, ни ошибки — см. arcade/transcript.js)
//    или кончается сразу раз за разом — тогда ошибка unsupported, а не вечный перезапуск.

import { matchWake, wakeSet } from './matchWake.js'
import { withOwnMic } from './micArbiter.js'

// Нет события start за это время после start() — распознаватель немой.
export const START_TIMEOUT_MS = 3000
// Столько раз подряд кончился быстрее QUICK_END_MS и без единого слова — не работает.
export const QUICK_END_MS = 1500
export const QUICK_ENDS = 5

// Язык распознавания по помощнику. Айзере зовут по-казахски («Сәлем, Айзере», «келесі»); браузер без казахского —
// русский: имя и русские команды он услышит, а «Привет, Айзере» и так звучит по-русски.
export const WAKE_LANGS = { luna: ['ru-RU'], aizere: ['kk-KZ', 'ru-RU'] }

// Отказы распознавателя → ошибки «уха» (их подписи — assistant.wake.* в окне Луны).
const ERRORS = {
  'not-allowed': 'denied',
  'audio-capture': 'mic',
  network: 'network',
  'service-not-allowed': 'unsupported',
  'bad-grammar': 'unsupported',
}

const AUDIO = { audio: { echoCancellation: true, noiseSuppression: true } }
const micError = (err) => (err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'denied' : 'mic')

/** Конструктор распознавателя браузера или null (Firefox). */
export function speechRecognitionCtor(win = globalThis) {
  return win?.SpeechRecognition || win?.webkitSpeechRecognition || null
}

/**
 * @param {{ persona?: string, onWake: (detail: { text: string, words: object[], preroll: () => null, full: true }) => void,
 *   onState?: (state: 'idle'|'asleep'|'listening'|'error', error?: 'denied'|'mic'|'network'|'unsupported') => void,
 *   onResult?: (text: string) => void, Recognition?: Function|null, getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>,
 *   activated?: () => boolean, now?: () => number }} opts
 */
export function createSpeechEar({
  persona = 'luna',
  onWake,
  onState = () => {},
  onResult = () => {},
  Recognition = speechRecognitionCtor(),
  getUserMedia = (c) => navigator.mediaDevices.getUserMedia(c),
  // Было ли касание страницы: до него браузер распознавание не пустит (или пустит молча).
  activated = () => globalThis.navigator?.userActivation?.hasBeenActive ?? true,
  now = () => Date.now(),
}) {
  const wake = wakeSet(persona)
  const langs = WAKE_LANGS[persona] || WAKE_LANGS.luna
  let langIdx = 0
  let state = 'idle'
  let run = null // { rec, startedAt, started, heard, timer }
  let quickEnds = 0

  const set = (next, error) => {
    state = next
    onState(next, error)
  }

  function fail(error) {
    const cur = run
    run = null
    if (cur) {
      clearTimeout(cur.timer)
      cur.rec.onend = null
      try {
        cur.rec.abort()
      } catch {
        /* уже остановлен */
      }
    }
    set('error', error)
  }

  function onEnd(cur) {
    if (run !== cur) return
    run = null
    clearTimeout(cur.timer)
    const quick = !cur.heard && now() - cur.startedAt < QUICK_END_MS
    quickEnds = quick ? quickEnds + 1 : 0
    if (quickEnds >= QUICK_ENDS) return set('error', 'unsupported')
    set('idle')
  }

  function start() {
    if (run || state === 'error') return
    if (!Recognition) return set('error', 'unsupported')
    if (!activated()) {
      if (state !== 'asleep') set('asleep')
      return
    }
    const rec = new Recognition()
    rec.lang = langs[langIdx]
    rec.continuous = true
    rec.interimResults = false
    rec.maxAlternatives = 1
    const cur = { rec, startedAt: now(), started: false, heard: false, timer: null }
    run = cur
    rec.onstart = () => {
      if (run !== cur) return
      cur.started = true
      clearTimeout(cur.timer)
      set('listening')
    }
    rec.onresult = (e) => {
      if (run !== cur) return
      const results = e?.results || []
      for (let i = e?.resultIndex ?? 0; i < results.length; i++) {
        const r = results[i]
        if (!r?.isFinal) continue
        const text = String(r[0]?.transcript || '').trim()
        if (!text) continue
        cur.heard = true
        onResult(text)
        if (matchWake(text, wake)) onWake?.({ text, words: [], preroll: () => null, full: true })
        // onWake обычно гасит «ухо» (useWakeWord): дальше этой записи не читаем.
        if (run !== cur) return
      }
    }
    rec.onerror = (e) => {
      if (run !== cur) return
      const code = e?.error
      // Браузер не знает казахского — тот же позывной на следующем языке, без ошибки.
      if (code === 'language-not-supported' && langIdx < langs.length - 1) {
        langIdx += 1
        run = null
        clearTimeout(cur.timer)
        cur.rec.onend = null
        return set('idle')
      }
      if (code === 'language-not-supported') return fail('unsupported')
      const err = ERRORS[code]
      if (err) fail(err)
      // no-speech, aborted — обычный конец: дальше придёт end.
    }
    rec.onend = () => onEnd(cur)
    cur.timer = setTimeout(() => {
      if (run === cur && !cur.started) fail('unsupported')
    }, START_TIMEOUT_MS)
    try {
      // Свой запуск арбитр микрофона не считает чужим (иначе «ухо» гасило бы само себя).
      withOwnMic(() => rec.start())
    } catch {
      fail('unsupported')
    }
  }

  // В нажатии на переключатель: спросить разрешение сейчас, рядом с переключателем, а не посреди урока.
  async function prepare() {
    if (run) return
    if (!Recognition) return set('error', 'unsupported')
    try {
      const probe = await withOwnMic(() => getUserMedia(AUDIO))
      for (const t of probe.getTracks()) t.stop()
    } catch (err) {
      return set('error', micError(err))
    }
    quickEnds = 0
    set('idle')
  }

  function stop() {
    const cur = run
    run = null
    if (cur) {
      clearTimeout(cur.timer)
      cur.rec.onend = null
      try {
        cur.rec.abort()
      } catch {
        /* уже остановлен */
      }
    }
    if (state !== 'idle' && state !== 'error') set('idle')
  }

  // Из нажатия: страница получила касание — спящее «ухо» может слушать.
  function resume() {
    if (state === 'asleep') set('idle')
  }

  return {
    get state() {
      return state
    },
    start,
    prepare,
    stop,
    resume,
    dispose: stop,
  }
}
