'use client'

// Озвучка голосом Soniox вместо браузерного синтеза — общая точка для всех
// кнопок «послушать» (Словарь, Воркбук, Чтение, Грамматика, тест уровня, слова
// курса без записи). Сервер — /api/tts (src/lib/soniox-tts.js).
//
// Устроено как speechSynthesis, которым эти места пользовались раньше: звучит
// всегда одна реплика на всё приложение, новая обрывает старую. Отличие одно и
// важное — провал виден. Раньше «speak() не бросил» считалось успехом, а на
// деле голоса могло не быть вовсе. Здесь вызывающий получает onFail и сам
// решает, что делать: как правило — договорить старым синтезом, чтобы кнопка
// не молчала, если Soniox лёг или упёрся в лимит.
//
// Элемент <audio> один на всё приложение, и это ради iOS: Safari выдаёт
// разрешение играть звук ЖЕСТУ и КОНКРЕТНОМУ элементу. Первая реплика по
// нажатию разблокирует элемент, и дальше им можно говорить уже без жеста —
// следующее предложение текста, следующая реплика диалога, слово нового
// задания. Свежий new Audio() на каждую реплику на iPhone молчал бы.

import { ttsUrl } from './ttsShared.js'

// 8 мс тишины, WAV 8 кГц моно — валидный источник для разблокировки: play()
// на элементе без src отклоняется и разрешения не даёт.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

// Сколько ждём первого звука, прежде чем признать провал и отдать реплику
// запасному голосу. Soniox отдаёт первый байт через ~0.6 с; запас — на
// мобильную сеть и холодный старт. Меньше нельзя: ложный провал — это две
// озвучки поверх друг друга (запасная началась, а следом доехала настоящая).
export const START_TIMEOUT_MS = 8000

let el = null
let seq = 0
let current = null // { my, onEnd, started, settled, fail }
let watchdog = null
const prefetched = new Set()

function element() {
  if (!el) {
    el = new Audio()
    el.preload = 'auto'
  }
  return el
}

function clearWatchdog() {
  if (watchdog !== null) {
    clearTimeout(watchdog)
    watchdog = null
  }
}

// Оборвать загрузку: без этого поток, который уже никто не слушает, докачивался
// бы до конца, а на медленной сети мешал бы следующей реплике.
function detach(a) {
  try {
    a.pause()
  } catch {
    /* элемент уже остановлен */
  }
  try {
    a.removeAttribute('src')
    a.load()
  } catch {
    /* jsdom и старые движки без load() */
  }
}

/**
 * Разблокировать общий элемент — СИНХРОННО из обработчика нажатия. Нужен
 * экранам, которые потом заговорят сами, без жеста (автоозвучка задания),
 * хотя первое нажатие было не на «послушать».
 */
export function unlockSpeech() {
  if (typeof window === 'undefined' || current) return
  try {
    const a = element()
    a.src = SILENT_WAV
    const p = a.play()
    if (p && typeof p.then === 'function') {
      p.then(() => {
        if (!current) a.pause()
      }).catch(() => {})
    }
  } catch {
    /* нет Audio — дальше всё равно уйдём в запасной голос */
  }
}

/**
 * Остановить текущую реплику. Если она уже звучала — её onEnd вызывается, как
 * это делал speechSynthesis.cancel(): индикатор «играет» на кнопке должен
 * погаснуть.
 */
export function stopTts() {
  clearWatchdog()
  seq++
  const cur = current
  current = null
  // Реплики нет — элемент не трогаем: на нём может доигрывать тишина
  // unlockSpeech(), и оборвать её значит рискнуть разрешением iPhone, которое
  // тап только что выдал.
  if (!cur) return
  if (el) detach(el)
  if (cur.started && !cur.settled) {
    cur.settled = true
    cur.onEnd?.()
  }
}

/**
 * Сказать text голосом Soniox.
 *
 * @param {string} text
 * @param {{ voice?: string, lang?: string, speed?: number, volume?: number,
 *   onStart?: () => void, onEnd?: () => void,
 *   onFail?: (reason: 'empty'|'error'|'timeout'|'blocked') => void }} [opts]
 *   onFail приходит, только если звук так и не начался: сеть, 429/503 от
 *   сервера, отказ браузера без жеста. После onStart провала уже не бывает —
 *   обрыв посреди реплики считается её концом (onEnd).
 * @returns {boolean} false — озвучивать нечего (onFail('empty') уже вызван)
 */
export function playTts(text, opts = {}) {
  const { voice, lang, speed, volume, onStart, onEnd, onFail } = opts
  const url = typeof window === 'undefined' ? null : ttsUrl({ text, voice, lang, speed })
  if (!url) {
    onFail?.('empty')
    return false
  }
  stopTts()
  const my = ++seq
  const a = element()
  const cur = { my, onEnd, started: false, settled: false }
  current = cur
  const live = () => my === seq && current === cur

  const fail = (reason) => {
    if (!live() || cur.settled || cur.started) return
    cur.settled = true
    clearWatchdog()
    current = null
    detach(a)
    onFail?.(reason)
  }
  cur.fail = fail
  const finish = () => {
    if (!live() || cur.settled) return
    cur.settled = true
    clearWatchdog()
    current = null
    onEnd?.()
  }

  a.onplaying = () => {
    if (!live() || cur.started) return
    cur.started = true
    clearWatchdog()
    onStart?.()
  }
  a.onended = finish
  a.onerror = () => (cur.started ? finish() : fail('error'))
  a.src = url
  // load() (его зовёт смена src) сбрасывает playbackRate в defaultPlaybackRate
  // — ставим оба, иначе темп предыдущей записи прилип бы к этой.
  a.defaultPlaybackRate = 1
  a.playbackRate = 1
  if (volume != null) a.volume = Math.max(0, Math.min(1, volume))
  else a.volume = 1
  watchdog = setTimeout(() => fail('timeout'), START_TIMEOUT_MS)
  try {
    const p = a.play()
    if (p && typeof p.catch === 'function') {
      p.catch((e) => fail(e && e.name === 'NotAllowedError' ? 'blocked' : 'error'))
    }
  } catch {
    fail('error')
  }
  return true
}

/** Промис-обёртка: 'played' (реплика дозвучала или её оборвали), 'failed'. */
export function speakTts(text, opts = {}) {
  return new Promise((resolve) => {
    playTts(text, {
      ...opts,
      onEnd: () => {
        opts.onEnd?.()
        resolve('played')
      },
      onFail: (reason) => {
        opts.onFail?.(reason)
        resolve('failed')
      },
    })
  })
}

export function pauseTts() {
  if (!current || !el) return
  clearWatchdog()
  try {
    el.pause()
  } catch {
    /* нечего ставить на паузу */
  }
}

export function resumeTts() {
  if (!current || !el) return
  // Пауза пришлась на ожидание первого звука — сторож снят в pauseTts, и без
  // нового реплика, так и не начавшись, висела бы вечно.
  if (!current.started && watchdog === null) {
    const fail = current.fail
    watchdog = setTimeout(() => fail('timeout'), START_TIMEOUT_MS)
  }
  try {
    const p = el.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch {
    /* элемент уже отпущен */
  }
}

/** Звучит (или вот-вот зазвучит) реплика Soniox. */
export function isTtsActive() {
  return current !== null
}

/**
 * Заранее попросить запись, которая понадобится следующей (реплика диалога,
 * предложение текста): сервер синтезирует и положит её в кэш, пока звучит
 * текущая, и пауза между репликами не вырастет до секунды на каждую.
 */
export function prefetchTts(text, opts = {}) {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return
  const url = ttsUrl({ text, ...opts })
  if (!url || prefetched.has(url)) return
  prefetched.add(url)
  if (prefetched.size > 300) prefetched.delete(prefetched.values().next().value)
  fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => {
      prefetched.delete(url)
    })
}
