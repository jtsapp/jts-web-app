// Машина попытки «Практикуй» — порт состояния P и функций startAttempt …
// finishSpeech из data/jtsverbs.html, без DOM.
//
// Почему отдельный класс, а не хук: попытка — это цепочка событий на часах
// бита (послушай → отсчёт → твоя очередь → проверка), таймеров, микрофона и
// распознавателя, и каждое звено обязано умереть, если студент нажал «стоп»
// или ушёл на другую вкладку. Прототип держал это на жетоне P.token:
// любой колбэк сверяет свой жетон с текущим и молча отваливается, если
// попытка уже другая. Здесь ровно так же, а React только рисует снимок
// (subscribe/getSnapshot) — иначе замыкания эффектов ловили бы старое
// состояние посреди такта.
//
// Все внешние зависимости (бит, записи, микрофон, распознаватель, таймеры,
// хранилище) приходят снаружи — тест гоняет машину на фейковых часах.

import {
  buildQueue,
  checkWritten as checkWrittenAnswers,
  clipKey,
  expectedForms,
  firstEmpty,
  gapFor,
  isContextual,
  isSpoken,
  MODES,
  progressKey,
  scoreTargets,
  trickyItems,
  writtenFields,
} from './engine.js'

const MIC_TIMEOUT_MS = 20000 // getUserMedia не ответил — микрофон не поднялся
const SR_READY_MS = 9000 // распознаватель не стартовал
const GAP_LISTEN_MS = 7000 // на пропущенную форму
const FINISH_GRACE_MS = 1800 // хвост распознавания после «готово»
const AUTO_NEXT_MS = 2400

function defaultEnv() {
  const w = typeof window !== 'undefined' ? window : {}
  return {
    SpeechRecognition: () => w.SpeechRecognition || w.webkitSpeechRecognition || null,
    hasMic: () => !!(typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    raf: (fn) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(fn) : setTimeout(fn, 16)),
    caf: (id) => (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame(id) : clearTimeout(id)),
  }
}

// Ошибки getUserMedia и распознавателя → ключ сообщения прототипа.
export function micErrorKey(name) {
  if (name === 'NotAllowedError') return 'denied'
  if (name === 'NotFoundError' || name === 'NotReadableError') return 'noDevice'
  return 'micFailed'
}

export function recognitionErrorKey(error) {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'denied'
  if (error === 'audio-capture') return 'noDevice'
  if (error === 'network') return 'network'
  if (error === 'no-speech') return 'noSpeech'
  return 'micFailed'
}

function savedSignature(saved) {
  return Object.keys(saved || {})
    .filter((k) => saved[k])
    .sort()
    .join(',')
}

export class VerbDrill {
  /**
   * @param {object} deps
   * @param {{verbs, sentences, fixes, aliases}} deps.data
   * @param {object} deps.beat   createBeat()
   * @param {object} deps.clips  createClips()
   * @param {() => object} deps.getSettings
   * @param {(patch: object) => void} deps.saveSettings
   * @param {() => object} deps.getSaved     отмеченные глаголы { v1: true }
   * @param {(key: string) => object} deps.getScores
   * @param {(key: string, id: string, result: object) => void} deps.persist
   * @param {(ok: boolean) => void} [deps.onWrittenChecked] навык письма
   * @param {object} [deps.env]
   */
  constructor({ data, beat, clips, getSettings, saveSettings, getSaved, getScores, persist, onWrittenChecked, env }) {
    this.data = data
    this.beat = beat
    this.clips = clips
    this.getSettings = getSettings
    this.saveSettings = saveSettings
    this.getSaved = getSaved
    this.getScoresFor = getScores
    this.persistResult = persist
    this.onWrittenChecked = onWrittenChecked
    this.env = { ...defaultEnv(), ...(env || {}) }
    this.byVerb = Object.fromEntries(data.verbs.map((v) => [v.v1, v]))

    this.mode = 'repeat'
    this.queue = null
    this.available = []
    this.idx = 0
    this.result = null
    this.phase = 'ready'
    this.busy = false
    this.input = 'manual'
    this.token = 0
    this.timers = []
    this.autoTimer = null
    this.stage = { kind: 'ready' }
    this.highlight = -1
    this.notice = null
    this.transcript = ''
    this.finalTranscript = ''
    this.tempoPending = false
    this.rec = null
    this.stream = null
    this.source = null
    this.analyser = null
    this.meterData = null
    this.meterFrame = null
    this.accept = false
    this.resultOffset = 0
    this.stopRecognition = null
    this.meterListener = null
    this.checkedOnce = new Set() // письменные задания, уже отданные в навык

    // Бит сообщает о своих событиях машине, а не экрану: «звук не поднялся»
    // и «новый темп вступил» — это состояние попытки.
    beat.onError = (key) => {
      this.setNotice(key)
      this.emit()
    }
    beat.onTempoApplied = () => this.tempoApplied()

    this.listeners = new Set()
    this.snapshot = null
    this.rebuild(false)
    this.snapshot = this.makeSnapshot()
  }

  // ── Подписка для React ─────────────────────────────────────────────────
  subscribe = (fn) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = () => this.snapshot

  emit() {
    this.snapshot = this.makeSnapshot()
    for (const fn of this.listeners) fn()
  }

  makeSnapshot() {
    const s = this.getSettings()
    const queue = this.list()
    return {
      mode: this.mode,
      idx: this.idx,
      queue,
      count: queue.length,
      available: this.available,
      item: this.item(),
      verb: this.currentVerb(),
      gap: this.gap(),
      formCount: s.formCount,
      level: s.practiceLevel,
      scores: this.scores(),
      busy: this.busy,
      phase: this.phase,
      stage: { ...this.stage },
      highlight: this.highlight,
      input: this.input,
      transcript: this.transcript,
      result: this.result,
      notice: this.notice,
      autoPending: !!this.autoTimer,
      tempoPending: this.tempoPending,
      audible: this.beat.audible,
      running: this.beat.running,
      previewing: !this.busy && this.beat.running,
      bpm: this.beat.bpm,
      canListen: this.canListen(),
    }
  }

  /**
   * Есть ли чем слушать: распознавание речи и доступ к микрофону. Без них
   * кнопки микрофона не показываем вовсе — иначе ученик узнавал бы об этом
   * только после нажатия (Firefox, встроенные браузеры, http без TLS).
   */
  canListen() {
    return !!this.env.SpeechRecognition() && this.env.hasMic()
  }

  // ── Очередь ────────────────────────────────────────────────────────────
  list() {
    return this.queue || []
  }

  item() {
    const l = this.list()
    return l[Math.min(this.idx, l.length - 1)] || null
  }

  currentVerb() {
    const it = this.item()
    return it ? this.byVerb[it.verb || it.id] || null : null
  }

  gap() {
    return gapFor(this.idx, this.getSettings().formCount)
  }

  scoresKey() {
    const s = this.getSettings()
    return progressKey(this.mode, s.formCount, s.practiceLevel)
  }

  scores() {
    return this.getScoresFor(this.scoresKey()) || {}
  }

  expected() {
    const s = this.getSettings()
    return expectedForms(this.currentVerb(), { mode: this.mode, formCount: s.formCount, gap: this.gap() })
  }

  rebuild(shuffle, rng) {
    const s = this.getSettings()
    const { available, queue } = buildQueue(this.data, {
      mode: this.mode,
      set: s.set,
      saved: this.getSaved(),
      level: s.practiceLevel,
      formCount: s.formCount,
      limit: s.limit,
      shuffle,
      rng,
    })
    this.available = available
    this.queue = queue
    this.idx = 0
    this.result = null
    this.checkedOnce.clear()
    this.savedSig = savedSignature(this.getSaved())
  }

  /** renderDrill прототипа: сброс уведомления и фаза по наличию результата. */
  refresh() {
    this.notice = null
    // Набор «отмеченные» мог поменяться в таблице, пока человек был там:
    // очередь, собранная по старым звёздочкам, разошлась бы с подписью набора.
    // Прототип это пропускал; перестраиваем только вне попытки.
    const staleSaved =
      this.queue && !this.busy && this.getSettings().set === 'saved' && savedSignature(this.getSaved()) !== this.savedSig
    if (!this.queue || staleSaved) this.rebuild(false)
    if (this.result) this.phase = 'result'
    else {
      this.phase = 'ready'
      this.stage = { kind: 'ready' }
    }
    this.prefetch()
    this.emit()
  }

  // Записи текущего и следующего глагола — заранее, пока студент читает
  // задание: иначе первая попытка ждала бы сеть посреди такта.
  prefetch() {
    if (!isSpoken(this.mode)) return
    const s = this.getSettings()
    const l = this.list()
    for (const it of [l[this.idx], l[this.idx + 1]]) {
      const v = it && this.byVerb[it.verb || it.id]
      if (!v) continue
      this.clips.prefetch([0, 1, 2].slice(0, s.formCount).map((i) => clipKey(v, i)))
    }
  }

  // ── Выбор режима и набора ──────────────────────────────────────────────
  setMode(mode) {
    if (!MODES.includes(mode)) return
    this.stopAttempt(true)
    this.mode = mode
    this.rebuild(false)
    this.refresh()
  }

  updateScope(patch) {
    this.stopAttempt(true)
    this.saveSettings(patch)
    this.rebuild(false)
    this.refresh()
  }

  shuffleSession(rng) {
    this.stopAttempt(true)
    this.rebuild(true, rng)
    this.refresh()
  }

  restart() {
    this.rebuild(false)
    this.refresh()
  }

  select(i) {
    this.stopAttempt(true)
    this.idx = Math.max(0, Math.min(i, this.list().length - 1))
    this.refresh()
  }

  /** «Потренировать трудные» с экрана итога. Пусто — честно говорим, что нечего. */
  tricky() {
    const list = trickyItems(this.available, this.scores())
    if (!list.length) {
      this.setNotice('allDone')
      this.emit()
      return
    }
    this.queue = list
    this.idx = 0
    this.result = null
    this.refresh()
  }

  next() {
    this.stopAttempt(true)
    if (this.idx + 1 >= this.list().length) {
      this.phase = 'summary'
      this.stage = { kind: 'summary' }
      this.emit()
      return
    }
    this.idx++
    this.refresh()
  }

  // ── Уведомления ────────────────────────────────────────────────────────
  setNotice(key, actions) {
    this.notice = { key, actions: actions || null }
  }

  clearNotice() {
    this.notice = null
  }

  setPhase(phase) {
    this.phase = phase
  }

  setHighlight(i) {
    this.highlight = i
    this.emit()
  }

  // ── Таймеры под жетоном ────────────────────────────────────────────────
  later(fn, ms, token) {
    const id = this.env.setTimeout(() => {
      if (token === undefined || token === this.token) fn()
    }, ms)
    this.timers.push(id)
    return id
  }

  releaseMic() {
    if (this.rec) {
      const rec = this.rec
      this.rec = null
      rec.onend = null
      rec.onerror = null
      rec.onresult = null
      rec.onstart = null
      try {
        rec.abort()
      } catch {
        /* уже остановлен */
      }
    }
    if (this.stream) {
      for (const tr of this.stream.getTracks()) tr.stop()
      this.stream = null
    }
    if (this.source) {
      try {
        this.source.disconnect()
      } catch {
        /* уже отключён */
      }
      this.source = null
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect()
      } catch {
        /* уже отключён */
      }
      this.analyser = null
    }
    if (this.meterFrame) this.env.caf(this.meterFrame)
    this.meterFrame = null
    this.accept = false
  }

  /** stopAttempt прототипа: жетон вперёд, всё живое — стоп. */
  stopAttempt(reset) {
    this.token++
    for (const id of this.timers) this.env.clearTimeout(id)
    this.timers = []
    if (this.autoTimer) this.env.clearTimeout(this.autoTimer)
    this.autoTimer = null
    this.releaseMic()
    this.clips.stop()
    this.beat.stop()
    this.busy = false
    this.phase = 'ready'
    this.stage = { kind: 'ready' }
    this.stopRecognition = null
    // Бит остановлен — отложенному темпу ждать нечего: следующая попытка и
    // так стартует с темпа из настроек.
    this.tempoPending = false
    if (reset) this.result = null
    this.highlight = -1
  }

  /** Кнопка «Стоп» и пробел во время попытки. */
  abort() {
    this.stopAttempt(true)
    this.refresh()
  }

  /** Уход со вкладки или экрана: ничего не должно звучать и слушать. */
  cleanup() {
    this.stopAttempt(true)
    this.refresh()
  }

  destroy() {
    this.stopAttempt(true)
    this.listeners.clear()
    this.beat.onError = null
    this.beat.onTempoApplied = null
  }

  // ── Попытка ────────────────────────────────────────────────────────────
  startAttempt(input) {
    if (this.busy || !this.item() || !isSpoken(this.mode)) return
    this.stopAttempt(true)
    this.input = input
    this.busy = true
    this.transcript = ''
    this.finalTranscript = ''
    this.tempoPending = false
    this.clearNotice()
    const token = this.token
    // Контекст будим здесь, синхронно в обработчике касания: после
    // getUserMedia и загрузки записей жест уже «остыл».
    this.beat.wake()

    if (input === 'speech') {
      if (!this.env.SpeechRecognition()) return this.failAttempt('noSR')
      if (!this.env.hasMic()) return this.failAttempt('micFailed')
      this.setPhase('preparing')
      this.stage = { kind: 'status', key: 'preparing' }
      const timer = this.later(() => this.failAttempt('micFailed'), MIC_TIMEOUT_MS, token)
      this.env
        .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
        .then(
          (stream) => {
            this.env.clearTimeout(timer)
            if (token !== this.token) {
              for (const tr of stream.getTracks()) tr.stop()
              return
            }
            this.stream = stream
            this.setupMeter()
            this.beginTutor(token)
          },
          (err) => {
            if (token !== this.token) return
            this.env.clearTimeout(timer)
            this.failAttempt(micErrorKey(err && err.name))
          },
        )
      this.emit()
    } else {
      this.beginTutor(token)
    }
  }

  beginTutor(token) {
    const s = this.getSettings()
    if (this.mode === 'gap') {
      // Пропуск без тьютора и без отсчёта: часы идут молча, микрофон
      // открывается сразу, как только готов.
      this.beat.start(false, s.bpm)
      if (this.input === 'speech') this.prepareRecognition(token)
      else this.openResponse(token)
      return
    }
    this.beat.start(s.beat, s.bpm)
    this.playTutor(() => {
      if (token !== this.token) return
      if (this.input === 'speech') this.prepareRecognition(token)
      else this.openResponse(token)
    }, token)
  }

  playTutor(done, token) {
    if (token !== this.token) return
    const s = this.getSettings()
    const v = this.currentVerb()
    const keys = [0, 1, 2].slice(0, s.formCount).map((i) => clipKey(v, i))
    this.setPhase('listening')
    this.stage = { kind: 'status', key: 'listenCycle' }
    this.emit()
    this.clips.ensure(keys).then(
      () => {
        if (token !== this.token) return
        // Запись могла не встать в буфер (старый Safari не строит буфер на
        // 16 кГц) — тогда то же, что и без записи, а не вечное «Слушай».
        try {
          const start = this.beat.nextBar()
          const beatLen = 60 / this.beat.bpm
          for (let i = 0; i < 4; i++) {
            if (i < s.formCount && !this.clips.play(keys[i], start + i * beatLen)) throw new Error('clip')
            this.beat.at(start + i * beatLen, () => {
              if (token === this.token) this.setHighlight(i)
            })
          }
          this.beat.at(start + 4 * beatLen, () => {
            if (token !== this.token) return
            this.highlight = -1
            done()
          })
        } catch {
          this.voiceUnavailable(token)
        }
      },
      () => this.voiceUnavailable(token),
    )
  }

  // В прототипе бит после отказа голоса продолжал играть; тишина честнее.
  voiceUnavailable(token) {
    if (token !== this.token) return
    this.stopAttempt(false)
    this.setNotice('voiceUnavailable')
    this.emit()
  }

  setupMeter() {
    const ctx = this.beat.ctx
    if (!ctx || !this.stream) return
    try {
      this.source = ctx.createMediaStreamSource(this.stream)
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = 256
      this.source.connect(this.analyser)
      this.meterData = new Uint8Array(this.analyser.fftSize)
    } catch {
      this.analyser = null
    }
  }

  /** Уровень микрофона — мимо React: 60 кадров в секунду в стейт не нужны. */
  onMeter(fn) {
    this.meterListener = fn
  }

  meterLoop(token) {
    if (token !== this.token || !this.analyser) return
    this.analyser.getByteTimeDomainData(this.meterData)
    let sum = 0
    for (let i = 0; i < this.meterData.length; i++) {
      const n = (this.meterData[i] - 128) / 128
      sum += n * n
    }
    const level = Math.sqrt(sum / this.meterData.length)
    if (this.meterListener) this.meterListener(Math.min(19, 3 + level * 95))
    this.meterFrame = this.env.raf(() => this.meterLoop(token))
  }

  prepareRecognition(token) {
    const SR = this.env.SpeechRecognition()
    this.setPhase('preparing')
    this.stage = { kind: 'status', key: 'preparing' }
    this.emit()
    const rec = new SR()
    this.rec = rec
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = true
    let ready = false
    let closing = false
    this.accept = false
    this.transcript = ''
    this.finalTranscript = ''
    this.resultOffset = 0
    const readyTimer = this.later(() => this.failAttempt('micFailed'), SR_READY_MS, token)

    rec.onstart = () => {
      if (token !== this.token) return
      ready = true
      this.env.clearTimeout(readyTimer)
      if (this.mode === 'gap') this.openResponse(token)
      else this.countIn(token)
    }
    // Всё, что распознаватель услышал ДО «твоя очередь», — это тьютор и
    // отсчёт; пропускаем их по смещению, а не по времени.
    rec.onresult = (ev) => {
      if (token !== this.token) return
      if (!this.accept) {
        this.resultOffset = ev.results.length
        return
      }
      let text = ''
      let finalText = ''
      for (let i = this.resultOffset; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript + ' '
        if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript + ' '
      }
      this.transcript = text.trim()
      this.finalTranscript = finalText.trim()
      this.emit()
    }
    rec.onerror = (ev) => {
      if (token !== this.token) return
      if (ev.error === 'aborted' && closing) return
      this.failAttempt(recognitionErrorKey(ev.error))
    }
    rec.onend = () => {
      if (token !== this.token) return
      this.rec = null
      if (this.phase === 'processing' || this.phase === 'speaking') {
        this.finishSpeech()
        return
      }
      if (!ready || this.phase === 'counting' || this.phase === 'preparing') this.failAttempt('micFailed')
    }
    try {
      rec.start()
    } catch {
      this.failAttempt('micFailed')
      return
    }
    this.stopRecognition = () => {
      if (token !== this.token || closing) return
      closing = true
      this.setPhase('processing')
      this.stage = { kind: 'status', key: 'processing' }
      this.beat.duck(false)
      try {
        rec.stop()
      } catch {
        /* уже остановлен */
      }
      this.later(() => this.finishSpeech(), FINISH_GRACE_MS, token)
      this.emit()
    }
  }

  countIn(token) {
    this.setPhase('counting')
    this.stage = { kind: 'countdown', n: 4 }
    this.emit()
    const at = this.beat.nextBar()
    const beatLen = 60 / this.beat.bpm
    ;[4, 3, 2, 1].forEach((n, i) => {
      this.beat.click(at + i * beatLen, i === 3)
      this.beat.at(at + i * beatLen, () => {
        if (token !== this.token) return
        this.stage = { kind: 'countdown', n }
        this.emit()
      })
    })
    this.beat.at(at + 4 * beatLen, () => {
      if (token === this.token) this.openResponse(token)
    })
  }

  // Подсветка долей, пока студент повторяет: от «сейчас», такт за тактом.
  responsePulse(token, start) {
    if (token !== this.token || this.phase !== 'speaking') return
    const beatLen = 60 / this.beat.bpm
    for (let i = 0; i < 4; i++) {
      this.beat.at(start + i * beatLen, () => {
        if (token === this.token && this.phase === 'speaking') this.setHighlight(i)
      })
    }
    this.beat.at(start + 4 * beatLen, () => {
      if (token === this.token && this.phase === 'speaking') this.responsePulse(token, start + 4 * beatLen)
    })
  }

  openResponse(token) {
    if (token !== this.token) return
    this.setPhase('speaking')
    this.beat.duck(this.input === 'speech')
    this.stage = { kind: 'speaking', key: this.mode === 'repeat' ? 'yourCycle' : 'sayNow', mic: this.input === 'speech' }
    if (this.mode === 'repeat') this.responsePulse(token, this.beat.now())
    if (this.input === 'speech') {
      this.accept = true
      this.meterLoop(token)
      // Четыре такта на повтор или 7 секунд на одну форму — дальше
      // распознавание закрывается само.
      const ms = this.mode === 'gap' ? GAP_LISTEN_MS : (16 * 60000) / this.beat.bpm
      this.later(() => {
        if (this.phase === 'speaking' && this.stopRecognition) this.stopRecognition()
      }, ms, token)
    }
    this.emit()
  }

  /** «Готово» во время речи. */
  finishSpeaking() {
    if (this.stopRecognition) this.stopRecognition()
  }

  // «Повторить» при отсутствии распознавания бесполезно — повтор упрётся в
  // то же самое, поэтому там остаётся только путь без микрофона.
  failAttempt(key) {
    this.stopAttempt(false)
    this.setNotice(key, key === 'noSR' ? ['manual'] : ['retry', 'manual'])
    this.emit()
  }

  /** Кнопка «Без микрофона» из уведомления об ошибке. */
  fallbackManual() {
    if (this.mode === 'gap') this.finishManual('manual')
    else this.startAttempt('manual')
  }

  finishSpeech() {
    if (!this.busy) return
    const text = this.finalTranscript || ''
    const s = this.getSettings()
    const score = scoreTargets(this.expected(), text, { mode: this.mode, gap: this.gap(), aliases: this.data.aliases || {} })
    this.stopAttempt(false)
    this.result = { kind: 'speech', score, text }
    this.save(this.result)
    this.notice = null
    this.phase = 'result'
    if (s.auto && score.hits === score.total) {
      const token = this.token
      this.autoTimer = this.env.setTimeout(() => {
        this.autoTimer = null
        if (token === this.token) this.next()
      }, AUTO_NEXT_MS)
    }
    this.emit()
  }

  cancelAuto() {
    if (this.autoTimer) this.env.clearTimeout(this.autoTimer)
    this.autoTimer = null
    this.emit()
  }

  /** Самопроверка ритма («я повторил») или «показать ответ» у пропуска. */
  finishManual(kind = 'manual') {
    this.stopAttempt(false)
    this.result = { kind, text: '' }
    this.save(this.result)
    this.notice = null
    this.phase = 'result'
    this.emit()
  }

  /**
   * «Показать ответ» у пропуска. Прототип ставил перед этим P.input = 'manual':
   * иначе «Ещё раз» после показа снова открывал бы микрофон прошлой попытки.
   */
  reveal() {
    this.input = 'manual'
    this.finishManual('manual')
  }

  /** «Ещё раз» у ритма во время самопроверки: цикл заново с тем же вводом. */
  againCycle() {
    this.stopAttempt(false)
    this.startAttempt('manual')
  }

  save(result) {
    const it = this.item()
    if (it) this.persistResult(this.scoresKey(), it.id, result)
  }

  // ── Письменные режимы ──────────────────────────────────────────────────
  fields() {
    const it = this.item()
    const v = this.currentVerb()
    if (!it || !v) return []
    return writtenFields(this.mode, it, v, this.getSettings().formCount)
  }

  /**
   * Проверка написанного. Возвращает номер пустого поля (его надо
   * сфокусировать) или -1.
   */
  checkWritten(values, reveal = false) {
    if (isSpoken(this.mode)) return -1
    const fields = this.fields()
    if (!reveal) {
      const empty = firstEmpty(fields.map((_, i) => values[i]))
      if (empty >= 0) {
        this.setNotice('needsAnswer')
        this.emit()
        return empty
      }
    }
    this.clearNotice()
    const it = this.item()
    const score = checkWrittenAnswers(fields, values, { mode: this.mode, item: it, v: this.currentVerb(), reveal })
    this.result = { kind: 'written', score, revealed: reveal }
    this.save(this.result)
    // В навык — только первая проверка задания за сессию: повтор после
    // подсказки иначе накручивал бы «верно».
    if (this.onWrittenChecked && !this.checkedOnce.has(it.id)) {
      this.checkedOnce.add(it.id)
      this.onWrittenChecked(!reveal && score.hits === score.total)
    }
    this.emit()
    return -1
  }

  retryWritten() {
    this.result = null
    this.clearNotice()
    this.emit()
  }

  // ── Бит и настройки ────────────────────────────────────────────────────
  /**
   * Тумблер бита — сама настройка «играть бит под формы». В прототипе он
   * показывал, звучит ли бит прямо сейчас, и в покое писал «выключен», хотя
   * по умолчанию бит включён; предпрослушка жила в том же тумблере. Теперь
   * тумблер — настройка (посреди попытки она включает и глушит бит сразу),
   * а послушать бит заранее — отдельной кнопкой (togglePreview).
   */
  toggleBeat() {
    if (this.mode !== 'repeat') return
    const on = !this.getSettings().beat
    this.saveSettings({ beat: on })
    if (this.busy && this.beat.running) this.beat.setAudible(on)
    this.emit()
  }

  /** Послушать бит до попытки: крутится, пока не нажмут ещё раз. */
  togglePreview() {
    if (this.mode !== 'repeat' || this.busy) return
    if (this.beat.running) {
      this.beat.stop()
      this.tempoPending = false
    } else {
      this.beat.wake()
      this.beat.start(true, this.getSettings().bpm)
    }
    this.emit()
  }

  /**
   * Новый темп. Посреди попытки он ждёт следующей (три формы уже стоят на
   * долях), на холостом бите — начала такта, иначе вступает сразу.
   */
  setTempo(bpm) {
    this.saveSettings({ bpm })
    const value = this.getSettings().bpm
    if (this.busy) this.tempoPending = true
    else if (this.beat.running) {
      this.beat.pending = value
      this.tempoPending = true
    } else {
      this.beat.bpm = value
      this.tempoPending = false
    }
    this.emit()
  }

  tempoApplied() {
    this.tempoPending = false
    this.emit()
  }

  setBeatVolume(v) {
    this.saveSettings({ volume: v })
    this.beat.setVolume(this.getSettings().volume)
  }

  setTutorVolume(v) {
    this.saveSettings({ tutor: v })
    this.clips.setVolume(this.getSettings().tutor)
  }

  setAuto(on) {
    this.saveSettings({ auto: !!on })
    this.emit()
  }

  /** После сброса прогресса или прихода его с сервера — перерисовать метки. */
  touch() {
    this.emit()
  }

  get contextual() {
    return isContextual(this.mode)
  }
}
