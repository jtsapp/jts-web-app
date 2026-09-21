// Плеер записи «Слушай и выбирай»: обёртка над HTMLAudioElement с главной
// причудой раздела — «прослушал до конца» считается по РЕАЛЬНО проигранному, а
// не по факту `ended`. Порт media-ветки ListeningPlayer из
// data/jtslistenchoose.html; ветка браузерного синтеза не переносится
// (решение владельца, 2026-09-20: звучит только запись).
//
// DOM плеер не трогает, элемент audio ему передают, а часы — параметр `now`:
// поэтому подсчёт сверяется с оракулом на трассах событий
// (__fixtures__/oracle.json, их прогнал сам прототип), без браузера.
//
// Как считается прослушанное. Пока запись играет, на каждом timeupdate (и на
// pause/ended/смене громкости) берётся кусок [прошлая точка, сейчас] и
// засчитывается, только если он честный: не после перемотки (`seeking`,
// якорь сброшен), не при громкости 0 и не «быстрее реального времени» —
// продвинуться за интервал больше, чем прошло на стене × темп (+0.3 с на
// дрожь timeupdate), плеер не мог. Иначе достаточно было бы дёрнуть ползунок в
// конец. Кусочки склеиваются, и запись считается дослушанной, когда на ended
// покрыто не меньше `duration − 0.32 с`.

export const RATES = [0.75, 1, 1.25]
export const HEARD_TAIL = 0.32
const DEFAULT_RATE = 1
const DEFAULT_VOLUME = 0.8
// Куски ближе 35 мс — один кусок: timeupdate приходит с дрожью, и без склейки
// диапазоны копились бы сотнями.
const MERGE_GAP = 0.035
// Допуск на дрожь timeupdate при проверке «не быстрее реального времени».
const REALTIME_SLACK = 0.3

const clamp01 = (v) => Math.max(0, Math.min(1, v))

/** Чистая склейка диапазонов: новый список, вход не меняется. */
export function addRange(ranges, a, b) {
  const all = [...ranges, [a, b]].sort((x, y) => x[0] - y[0])
  const merged = []
  for (const range of all) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1] + MERGE_GAP) last[1] = Math.max(last[1], range[1])
    else merged.push([...range])
  }
  return merged
}

export function coverageOf(ranges) {
  return ranges.reduce((n, r) => n + r[1] - r[0], 0)
}

export class ListenPlayer {
  constructor({ audio, now = () => performance.now(), onHeard = () => {}, rate = DEFAULT_RATE, volume = DEFAULT_VOLUME }) {
    this.audio = audio
    this.now = now
    this.onHeard = onHeard
    this.rate = RATES.includes(rate) ? rate : DEFAULT_RATE
    this.volume = Number.isFinite(volume) ? clamp01(volume) : DEFAULT_VOLUME
    this.state = 'idle'
    this.position = 0
    this.duration = 0
    this._ranges = []
    this.arm = false
    this.lastMedia = 0
    this.lastWall = 0
    this.listeners = new Set()
    this.snap = null
    this.refreshSnapshot()

    // Обработчики событий audio. Состояние переходит ТОЛЬКО по ним: play() не
    // объявляет «играет», пока браузер не прислал playing.
    this.handlers = {
      loadedmetadata: () => {
        this.duration = Number.isFinite(audio.duration) ? audio.duration : 0
        this.state = 'ready'
        this.arm = false
        this.emit()
      },
      waiting: () => {
        this.state = 'loading'
        this.emit()
      },
      playing: () => {
        this.state = 'playing'
        this.anchor()
        this.emit()
      },
      // Из «играет» и из «догружается посреди воспроизведения» (waiting: якорь
      // подсчёта ещё взведён; после load() и stop() он сброшен). Но не после
      // stop(): браузер присылает pause и туда, а прототип перекрашивал
      // остановленный плеер в «На паузе».
      pause: () => {
        if (this.state !== 'playing' && !(this.state === 'loading' && this.arm)) return
        this.sample()
        this.state = 'paused'
        this.emit()
      },
      seeking: () => {
        this.arm = false
      },
      seeked: () => {
        this.anchor()
        this.emit()
      },
      timeupdate: () => {
        this.sample()
        this.position = audio.currentTime
        this.emit()
      },
      ended: () => {
        this.sample()
        this.state = 'ended'
        this.position = this.duration
        if (this.coverage() >= Math.max(0, this.duration - HEARD_TAIL)) this.onHeard()
        this.emit()
      },
      error: () => {
        this.state = 'error'
        this.emit()
      },
      canplay: () => {
        if (this.state === 'loading') {
          this.state = audio.paused ? 'ready' : 'playing'
          this.emit()
        }
      },
    }
    for (const [type, fn] of Object.entries(this.handlers)) audio.addEventListener(type, fn)
  }

  // ── подписка (useSyncExternalStore) ────────────────────────────────────
  refreshSnapshot() {
    this.snap = { state: this.state, position: this.position, duration: this.duration, rate: this.rate, volume: this.volume }
  }

  emit() {
    this.refreshSnapshot()
    for (const fn of [...this.listeners]) fn()
  }

  // Стрелками-полями: useSyncExternalStore берёт их как есть, без bind, и не
  // переподписывается на каждый рендер.
  subscribe = (fn) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = () => this.snap

  // ── подсчёт прослушанного ──────────────────────────────────────────────
  anchor() {
    this.lastMedia = this.audio.currentTime
    this.lastWall = this.now()
    this.arm = true
  }

  sample() {
    const audio = this.audio
    const at = audio.currentTime
    const wall = this.now()
    if (this.arm && !audio.seeking && this.volume > 0 && !audio.muted) {
      const delta = at - this.lastMedia
      const possible = ((wall - this.lastWall) / 1000) * this.rate + REALTIME_SLACK
      if (delta > 0 && delta < possible + 0.001) this._ranges = addRange(this._ranges, this.lastMedia, at)
    }
    this.lastMedia = at
    this.lastWall = wall
    this.arm = true
  }

  get ranges() {
    return this._ranges.map((r) => [...r])
  }

  coverage() {
    return coverageOf(this._ranges)
  }

  /** После первой ошибки: чтобы выбрать снова, запись надо прослушать заново. */
  resetListening() {
    this._ranges = []
    this.arm = false
  }

  // ── управление ─────────────────────────────────────────────────────────
  load(url) {
    this.audio.pause()
    this._ranges = []
    this.arm = false
    this.position = 0
    this.duration = 0
    this.state = 'loading'
    this.applyRate()
    this.applyVolume()
    this.audio.src = url
    this.audio.load()
    this.emit()
  }

  // load() возвращает playbackRate к defaultPlaybackRate (так устроена загрузка
  // медиа в спецификации HTML; проверено в Chrome): темп, выставленный только в
  // playbackRate, терялся на каждой записи, хотя список и localStorage его
  // показывали. Поэтому темп ставится в оба свойства.
  applyRate() {
    this.audio.defaultPlaybackRate = this.rate
    this.audio.playbackRate = this.rate
  }

  // На iOS свойство volume у audio только для чтения: ползунок громкости там
  // ничего не меняет, а «Выключить звук» по volume = 0 оставил бы запись
  // слышной — и прослушивание не засчитывалось бы при звучащей записи. Поэтому
  // ноль дублируется через muted, который iOS слушается.
  applyVolume() {
    this.audio.volume = this.volume
    this.audio.muted = this.volume === 0
  }

  // Из «загружается» play() РАЗРЕШЁН: iOS Safari не подгружает запись до первого
  // касания (экономия трафика), и если бы Play ждал loadedmetadata, кнопку
  // нельзя было бы нажать никогда — метаданные пришли бы только после неё.
  // Браузер сам догрузит запись и начнёт играть.
  async play() {
    if (this.state === 'idle' || this.state === 'error') return
    if (this.audio.ended) this.audio.currentTime = 0
    try {
      await this.audio.play()
    } catch (e) {
      // Play, а следом Stop: браузер отклоняет первый play() как прерванный.
      // Это не сбой записи — красить плеер в «Audio could not play» нельзя.
      if (e && e.name === 'AbortError') return
      this.state = 'error'
      this.emit()
    }
  }

  pause() {
    this.audio.pause()
  }

  stop() {
    this.audio.pause()
    if (this.audio.readyState > 0) this.audio.currentTime = 0
    this.position = 0
    this.arm = false
    // «Ошибка» Stop не лечит: запись всё так же сломана, и баннер с «Try again»
    // не должен пропадать от нажатия на Stop.
    if (this.state !== 'idle' && this.state !== 'error') this.state = 'ready'
    this.emit()
  }

  replay() {
    this.stop()
    return this.play()
  }

  seek(seconds) {
    const target = Math.min(this.duration, Math.max(0, seconds))
    this.arm = false
    this.audio.currentTime = target
    this.position = target
    this.emit()
  }

  setRate(rate) {
    if (!RATES.includes(rate)) return
    this.rate = rate
    this.applyRate()
    this.emit()
  }

  setVolume(volume) {
    if (!Number.isFinite(volume)) return
    // Кусок ДО смены громкости считается по старой: он прозвучал так, как звучал.
    if (!this.audio.paused) this.sample()
    this.volume = clamp01(volume)
    this.applyVolume()
    this.emit()
  }

  destroy() {
    for (const [type, fn] of Object.entries(this.handlers)) this.audio.removeEventListener(type, fn)
    this.audio.pause()
    this.audio.removeAttribute('src')
    // load() после снятия src обрывает недокачанную запись.
    this.audio.load()
  }
}

// Отдельный элемент, а не <audio> в разметке: плеер живёт с экраном раздела, и
// ему нужен свой, чтобы предзагрузка следующей записи не толкалась с текущей.
export function createListenPlayer(opts) {
  const audio = new Audio()
  audio.preload = 'auto'
  return new ListenPlayer({ audio, ...opts })
}
