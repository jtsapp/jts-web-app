// Фраза в плеере YouTube Видеодиктанта — без DOM: объект плеера (YT.Player или подделка в тесте) и часы кадров
// приходят снаружи. Здесь решается, какую фразу играть, когда встать на паузу и что делать с ошибкой ролика.
//
// Управление — только методами IFrame API (права, спека): setPlaybackRate, seekTo, playVideo, pauseVideo. Конец фразы
// ловим опросом getCurrentTime() на каждом кадре и встаём на паузу при t ≥ end − 0,05 с. Сразу после seekTo плеер
// может ещё отдавать прежнее время (конец прошлой фразы или этой же — «Ещё раз»), и пауза случилась бы мгновенно,
// поэтому конец «взводится», только когда время вошло в саму фразу.
// Скрытая вкладка останавливает requestAnimationFrame — пауза там может прийти с опозданием (принято); срок при этом
// растёт не больше MAX_TICK_MS на кадр.
//
// Контракт колбэков:
//   onEnd(segment) — фраза доиграла (время дошло до конца, либо ролик кончился — ENDED) и плеер на паузе.
//   onError(reason) — фраза не сыграна. reason:
//     'timeout'  — время не вошло во фразу за ARM_TIMEOUT_MS небуферизующего времени; плеер на паузе и годен для
//                  нового play (экран: «Видео не загрузилось, попробуйте ещё раз»);
//     число      — код onError плеера YouTube (2, 5, 100, 101, 150): ролик недоступен, play дальше возвращает false;
//     null       — отказал вызов API (плеер разрушен): то же, ролик недоступен.
//   Ни один из колбэков не вызывается после destroy().

export const END_EPSILON = 0.05
export const SLOW_RATE = 0.75
// seekTo встаёт на ближайший ключевой кадр — время может оказаться чуть раньше начала фразы.
const ARM_LEAD = 1
// Если время так и не вошло во фразу (ролик завис, не грузится), опрос не вечный. Срок — 5 с времени, когда плеер
// НЕ буферизует (BUFFERING, 3, отсчёт стоит), иначе медленная сеть дала бы ложную ошибку. По сроку — onError('timeout').
// До ENDED_GRACE_MS после play состояние ENDED может быть прежним (до seekTo): ни событие, ни опрос тогда не завершают фразу.
export const ARM_TIMEOUT_MS = 5000
export const ENDED_GRACE_MS = 1000
// Скрытая вкладка останавливает кадры; при возврате разрыв не должен съесть срок целиком — на кадр идёт не больше этого.
export const MAX_TICK_MS = 250
export const TIMEOUT_REASON = 'timeout'
const YT_ENDED = 0
const YT_PLAYING = 1
const YT_BUFFERING = 3

/**
 * @param player  { getCurrentTime, getPlayerState, seekTo, playVideo, pauseVideo, setPlaybackRate }
 * @param frame   (fn) => id — requestAnimationFrame
 * @param cancel  (id) => void — cancelAnimationFrame
 * @param now     () => мс — часы (performance.now); в тесте подделка
 * @param onEnd   (segment) => void — см. контракт выше
 * @param onError (reason) => void — см. контракт выше
 */
export function createPhrasePlayer({ player, frame, cancel, now = () => performance.now(), onEnd = () => {}, onError = () => {} }) {
  let state = 'idle' // idle | playing | paused | error | destroyed
  let segment = null
  let armed = false
  let endedSeen = false // ENDED пришёл в льготное окно, пока не взведено
  let rate = 1
  let raf = null
  let startedAt = 0
  let lastTickAt = 0
  let waited = 0 // мс ожидания взвода без буферизации

  function stopPolling() {
    if (raf !== null) cancel(raf)
    raf = null
  }

  function finish() {
    stopPolling()
    state = 'paused'
    try {
      player.pauseVideo()
    } catch {
      /* плеер уже разрушен */
    }
    onEnd(segment)
  }

  function tick() {
    raf = null
    if (state !== 'playing') return
    let t
    let playerState
    try {
      t = player.getCurrentTime()
      playerState = player.getPlayerState()
    } catch {
      return fail(null) // плеер разрушен: опрос не оставляем крутиться
    }
    const tickAt = now()
    if (!armed && playerState !== YT_BUFFERING) waited += Math.min(tickAt - lastTickAt, MAX_TICK_MS)
    lastTickAt = tickAt
    if (Number.isFinite(t)) {
      if (armed && t >= segment.end - END_EPSILON) return finish()
      if (!armed && t >= segment.start - ARM_LEAD && t < segment.end - END_EPSILON) armed = true
    }
    // Время внутри фразы — состояние свежее. ENDED тогда значит «ролик кончился раньше конца фразы» (фраза у конца
    // ролика: время до end не дойдёт); ENDED из льготного окна без возврата к игре — то же.
    // Сразу после play ENDED и время могут быть прежними (повтор фразы за концом ролика, что доиграл сам), поэтому
    // ENDED во взведённом состоянии читаем только после льготного окна.
    if (armed && isEnded(playerState) && tickAt - startedAt >= ENDED_GRACE_MS) return finish()
    if (!armed && waited >= ARM_TIMEOUT_MS) return timeout()
    raf = frame(tick)
  }

  function isEnded(playerState) {
    if (playerState === YT_ENDED) return true
    return endedSeen && playerState !== YT_PLAYING && playerState !== YT_BUFFERING
  }

  function timeout() {
    stopPolling()
    state = 'paused'
    try {
      player.pauseVideo()
    } catch {
      /* плеер уже разрушен */
    }
    onError(TIMEOUT_REASON)
  }

  function fail(code = null) {
    if (state === 'destroyed') return
    stopPolling()
    state = 'error'
    onError(code)
  }

  return {
    /** Играть фразу { start, end } с её начала. false — плеер в ошибке. */
    play(next) {
      if (state === 'error' || state === 'destroyed') return false
      stopPolling()
      segment = next
      armed = false
      endedSeen = false
      waited = 0
      startedAt = now()
      lastTickAt = startedAt
      try {
        player.setPlaybackRate(rate)
        player.seekTo(next.start, true)
        player.playVideo()
      } catch {
        fail(null)
        return false
      }
      state = 'playing'
      raf = frame(tick)
      return true
    },
    /** 1 или SLOW_RATE: сразу, если фраза играет, иначе — со следующего play. */
    setRate(next) {
      rate = next
      if (state !== 'playing') return
      try {
        player.setPlaybackRate(next)
      } catch {
        /* применится на следующем play */
      }
    },
    stop() {
      if (state !== 'playing') return
      stopPolling()
      state = 'paused'
      try {
        player.pauseVideo()
      } catch {
        /* плеер уже разрушен */
      }
    },
    /** onStateChange плеера: ролик кончился раньше конца фразы — кончилась и фраза. */
    onPlayerState(code) {
      if (code !== YT_ENDED || state !== 'playing') return
      if (!armed && now() - startedAt < ENDED_GRACE_MS) {
        endedSeen = true
        return
      }
      finish()
    },
    /** onError плеера (2, 5, 100, 101, 150) — ролик недоступен, дальше фразы не играют. */
    fail,
    state: () => state,
    destroy() {
      stopPolling()
      state = 'destroyed'
    },
  }
}
