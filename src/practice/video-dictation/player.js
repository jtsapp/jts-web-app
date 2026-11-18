// Фраза в плеере YouTube Видеодиктанта — без DOM: объект плеера (YT.Player или подделка в тесте) и часы кадров
// приходят снаружи. Здесь решается, какую фразу играть, когда встать на паузу и что делать с ошибкой ролика.
//
// Управление — только методами IFrame API (права, спека): setPlaybackRate, seekTo, playVideo, pauseVideo. Конец фразы
// ловим опросом getCurrentTime() на каждом кадре и встаём на паузу при t ≥ end − 0,05 с. Сразу после seekTo плеер
// может ещё отдавать прежнее время (конец прошлой фразы или этой же — «Ещё раз»), и пауза случилась бы мгновенно,
// поэтому конец «взводится», только когда время вошло в саму фразу.

export const END_EPSILON = 0.05
export const SLOW_RATE = 0.75
// seekTo встаёт на ближайший ключевой кадр — время может оказаться чуть раньше начала фразы.
const ARM_LEAD = 1
// Если время так и не вошло во фразу (фраза за концом ролика, ролик завис), опрос не вечный: по дедлайну фраза
// считается оконченной. До ENDED_GRACE_MS после play состояние ENDED может быть прежним (до seekTo) — его игнорируем.
export const ARM_TIMEOUT_MS = 5000
export const ENDED_GRACE_MS = 1000
const YT_ENDED = 0

/**
 * @param player  { getCurrentTime, seekTo, playVideo, pauseVideo, setPlaybackRate }
 * @param frame   (fn) => id — requestAnimationFrame
 * @param cancel  (id) => void — cancelAnimationFrame
 * @param now     () => мс — часы (performance.now); в тесте подделка
 * @param onEnd   (segment) => void — фраза доиграла и встала на паузу
 * @param onError (code) => void — ролик недоступен (код onError плеера или null, если отказал вызов API)
 */
export function createPhrasePlayer({ player, frame, cancel, now = () => performance.now(), onEnd = () => {}, onError = () => {} }) {
  let state = 'idle' // idle | playing | paused | error
  let segment = null
  let armed = false
  let rate = 1
  let raf = null
  let startedAt = 0

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
    try {
      t = player.getCurrentTime()
    } catch {
      return fail(null) // плеер разрушен: опрос не оставляем крутиться
    }
    if (Number.isFinite(t)) {
      if (!armed) armed = t >= segment.start - ARM_LEAD && t < segment.end - END_EPSILON
      else if (t >= segment.end - END_EPSILON) return finish()
    }
    if (!armed && now() - startedAt >= ARM_TIMEOUT_MS) return finish()
    raf = frame(tick)
  }

  function fail(code = null) {
    stopPolling()
    state = 'error'
    onError(code)
  }

  return {
    /** Играть фразу { start, end } с её начала. false — плеер в ошибке. */
    play(next) {
      if (state === 'error') return false
      stopPolling()
      segment = next
      armed = false
      startedAt = now()
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
      if (!armed && now() - startedAt < ENDED_GRACE_MS) return
      finish()
    },
    /** onError плеера (2, 5, 100, 101, 150) — ролик недоступен, дальше фразы не играют. */
    fail,
    state: () => state,
    destroy() {
      stopPolling()
      state = 'idle'
    },
  }
}
