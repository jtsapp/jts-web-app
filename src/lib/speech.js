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
let current = null // { my, onEnd, onCancel, started, settled, fail }
let watchdog = null
// Кадр onTime текущей реплики (подсветка слов образца в Скорочтении): один на приложение, как и сама реплика.
let frame = null
const prefetched = new Set()

function element() {
  if (!el) {
    el = new Audio()
    el.preload = 'auto'
  }
  return el
}

function stopFrames() {
  if (frame === null) return
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
  frame = null
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
 * Остановить текущую реплику. Если она уже звучала — её onEnd('stopped')
 * вызывается, как это делал speechSynthesis.cancel(): индикатор «играет» на
 * кнопке должен погаснуть. Если ещё не зазвучала — onCancel (кто его просил):
 * очередь фраз помощника иначе ждала бы старта, которого уже не будет.
 */
export function stopTts() {
  clearWatchdog()
  stopFrames()
  seq++
  const cur = current
  current = null
  // Реплики нет — элемент не трогаем: на нём может доигрывать тишина
  // unlockSpeech(), и оборвать её значит рискнуть разрешением iPhone, которое
  // тап только что выдал.
  if (!cur) return
  if (el) detach(el)
  if (cur.settled) return
  cur.settled = true
  if (cur.started) cur.onEnd?.('stopped')
  else cur.onCancel?.()
}

/**
 * Сказать text голосом Soniox.
 *
 * @param {string} text
 * @param {{ voice?: string, lang?: string, speed?: number, rate?: number, volume?: number,
 *   onStart?: () => void, onEnd?: (reason: 'ended'|'stopped') => void, onCancel?: () => void,
 *   onFail?: (reason: 'empty'|'error'|'timeout'|'blocked') => void,
 *   onTime?: (currentTime: number) => void }} [opts]
 *   onTime — каждый кадр requestAnimationFrame, пока звук идёт (между «playing» и паузой, концом или
 *   обрывом): по нему Скорочтение подсвечивает слово образца. timeupdate для этого редок — 4 раза в секунду,
 *   а на 3x слово звучит быстрее.
 *   onFail приходит, только если звук так и не начался: сеть, 429/503 от
 *   сервера, отказ браузера без жеста. После onStart провала уже не бывает —
 *   обрыв посреди реплики считается её концом (onEnd('stopped')), обрыв до
 *   старта — onCancel.
 * @returns {boolean} false — озвучивать нечего (onFail('empty') уже вызван)
 */
export function playTts(text, opts = {}) {
  const { voice, lang, speed } = opts
  return playSrc(typeof window === 'undefined' ? null : ttsUrl({ text, voice, lang, speed }), opts)
}

/**
 * Сыграть готовую запись (файл из public) тем же элементом и по тем же
 * правилам, что playTts: одна реплика на приложение, onFail — только если звук
 * так и не начался. Отдельный new Audio() на iPhone молчал бы без жеста — а
 * разрешение живёт на этом элементе. Опции — как у playTts, кроме voice/lang/speed.
 */
export function playUrl(src, opts = {}) {
  return playSrc(typeof window === 'undefined' ? null : src || null, opts)
}

function playSrc(url, opts) {
  const { rate, volume, onStart, onEnd, onCancel, onFail, onTime } = opts
  if (!url) {
    onFail?.('empty')
    return false
  }
  stopTts()
  const my = ++seq
  const a = element()
  const cur = { my, onEnd, onCancel, started: false, settled: false }
  current = cur
  const live = () => my === seq && current === cur

  const fail = (reason) => {
    if (!live() || cur.settled || cur.started) return
    cur.settled = true
    clearWatchdog()
    stopFrames()
    current = null
    detach(a)
    onFail?.(reason)
  }
  cur.fail = fail
  const finish = () => {
    if (!live() || cur.settled) return
    cur.settled = true
    clearWatchdog()
    stopFrames()
    current = null
    onEnd?.('ended')
  }

  const tick = () => {
    frame = null
    if (!live() || cur.settled || a.paused) return
    onTime(a.currentTime)
    frame = requestAnimationFrame(tick)
  }
  a.onplaying = () => {
    if (!live()) return
    // Кадры — и на первом старте, и после паузы (повторный «playing» приходит и тогда).
    if (onTime && frame === null && !cur.settled && typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(tick)
    if (cur.started) return
    cur.started = true
    clearWatchdog()
    onStart?.()
  }
  // Ставится всегда: обработчик прошлой реплики не должен жить на общем элементе.
  a.onpause = () => {
    if (live()) stopFrames()
  }
  a.onended = finish
  a.onerror = () => (cur.started ? finish() : fail('error'))
  a.src = url
  // load() (его зовёт смена src) сбрасывает playbackRate в defaultPlaybackRate
  // — ставим оба, иначе темп предыдущей записи прилип бы к этой.
  // rate — темп на устройстве, а не в синтезе: адрес /api/tts от него не
  // зависит, и игра, гоняющая одну фразу на пяти темпах («Числа»), платит за
  // синтез и кэш один раз. Высота голоса при этом сохраняется.
  const r = rate > 0 ? rate : 1
  a.defaultPlaybackRate = r
  a.playbackRate = r
  a.preservesPitch = true
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

/**
 * Промис-обёртка: 'played' (реплика дозвучала или её оборвали), 'failed', 'cancelled' (новая реплика или stopTts
 * до первого звука), 'timeout' (сработал maxMs). Промис завершается всегда: экзамен Speaking ждёт его, чтобы начать
 * запись, и висящий промис оставлял ученика перед экраном без записи и без выхода (жалоба 29.10.2026).
 * maxMs — потолок всей реплики: поток /api/tts может встать после первого звука, и тогда ни ended, ни error не придут.
 */
export function speakTts(text, opts = {}) {
  return new Promise((resolve) => {
    let guard = null
    let timedOut = false
    const done = (v) => {
      clearTimeout(guard)
      resolve(v)
    }
    playTts(text, {
      ...opts,
      onEnd: (reason) => {
        opts.onEnd?.(reason)
        done(timedOut ? 'timeout' : 'played')
      },
      onCancel: () => {
        opts.onCancel?.()
        done(timedOut ? 'timeout' : 'cancelled')
      },
      onFail: (reason) => {
        opts.onFail?.(reason)
        done('failed')
      },
    })
    if (opts.maxMs > 0) {
      const mine = seq
      guard = setTimeout(() => {
        timedOut = true
        // обрываем только свою реплику: после неё могла зазвучать другая
        if (mine === seq) stopTts()
        resolve('timeout')
      }, opts.maxMs)
    }
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
  if (typeof window === 'undefined') return
  prefetchUrl(ttsUrl({ text, ...opts }))
}

/**
 * Прогреть HTTP-кэш готовой записи (следующее задание), один раз на адрес.
 * Запись с чужого адреса (бакет MinIO, у него нет CORS) — запросом no-cors: обычный fetch браузер отклонил бы с
 * ошибкой в консоли на каждую запись, а непрозрачный ответ ложится в кэш так же, и <audio> его потом берёт.
 */
export function prefetchUrl(url) {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return
  if (!url || prefetched.has(url)) return
  prefetched.add(url)
  if (prefetched.size > 300) prefetched.delete(prefetched.values().next().value)
  let foreign = false
  try {
    const u = new URL(url, window.location.href)
    foreign = /^https?:$/.test(u.protocol) && u.origin !== window.location.origin
  } catch {
    /* кривой адрес — как раньше */
  }
  fetch(url, foreign ? { mode: 'no-cors' } : undefined)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => {
      prefetched.delete(url)
    })
}
