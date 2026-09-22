// Контроллер экрана «Слушай и выбирай»: сложность, наборы по сложностям, раунд,
// «дослушал / картинки загрузились» и сохранение на устройстве. Здесь живёт то,
// что в прототипе размазано по глобальным переменным IIFE (`sessions`, `heard`,
// `imagesReady`, `level`…), — без React и без DOM (кроме предзагрузки).
//
// Вне React на той же причине, что машина попытки у «Неправильных глаголов»:
// плеер, повторная загрузка картинок и колбэк «дослушал» приходят асинхронно, и
// состояние в useState с эффектами разъезжалось бы с тем, что реально звучит.
// Экран подписан через useSyncExternalStore (subscribe / getSnapshot).
//
// Наборы неизменяемы: каждое действие кладёт в this.runs НОВЫЙ объект, поэтому
// снимок можно сравнивать по ссылке.

import { IMAGE_SIZES, imagePath, imageSrcSet, optionsOf } from './data.js'
import {
  LEVELS,
  MAX_COUNT,
  answerRound,
  canAnswer,
  createRun,
  isValidRun,
  retryIds,
  roundOf,
  runFromIds,
  sampleQuestions,
  scoreOf,
} from './engine.js'
import { RATES, createListenPlayer } from './player.js'

/**
 * Кадры и запись следующего задания грузятся заранее: пока студент решает
 * текущее, следующее уже в кэше. srcset и sizes — те же, что у показанной
 * картинки (data.js), поэтому браузер выберет тот же файл, что выберет показ;
 * порядок важен — sizes раньше srcset, srcset раньше src.
 */
export function defaultPreload(question) {
  const keep = []
  for (let i = 0; i < 4; i++) {
    const img = new Image()
    img.decoding = 'async'
    img.sizes = IMAGE_SIZES
    img.srcset = imageSrcSet(question.scene, i)
    img.src = imagePath(question.scene, i, 512)
    keep.push(img)
  }
  const audio = new Audio()
  audio.preload = 'auto'
  audio.src = question.audio
  keep.push(audio)
  return keep
}

export class ListenChooseSession {
  /**
   * data — buildData(); device — { read(), write(patch) }; progress —
   * { readSeen(level), writeSeen(level, ids, { sync }) }; level — сложность из
   * диплинка (сильнее запомненной; без него набор запомненной сложности
   * рисовался бы зря); createPlayer получает { rate, volume, onHeard } и
   * возвращает плеер; onResolved вызывается один раз на каждое закрытое
   * задание: { questionId, level, correct, attempts }.
   */
  constructor({
    data,
    device,
    progress,
    level,
    createPlayer = createListenPlayer,
    preload = defaultPreload,
    random = Math.random,
    onResolved = () => {},
  }) {
    this.data = data
    this.device = device
    this.progress = progress
    this.preload = preload
    this.random = random
    this.onResolved = onResolved
    this.listeners = new Set()
    this.snap = null
    this.destroyed = false
    this.preloads = []

    const saved = device.read()
    this.level = LEVELS.includes(level) ? level : saved.level
    this.counts = saved.counts
    this.prefs = { rate: saved.rate, volume: saved.volume }
    // Недоигранный набор мог прийти от старой версии данных или быть побитым:
    // принимаем только целый набор своей сложности.
    this.runs = {}
    for (const level of LEVELS) {
      if (isValidRun(saved.runs[level], data, level)) this.runs[level] = saved.runs[level]
    }
    this.heard = false
    this.imagesReady = false
    this.transcriptOpen = false

    this.player = createPlayer({ rate: saved.rate, volume: saved.volume, onHeard: () => this.markHeard() })
    // Набор при монтировании — только локальная запись «уже было»: серверное
    // могло ещё не приехать, и replace затёр бы его. Уйдёт с первым набором по
    // действию студента (setLevel, «Новый набор»).
    if (!this.runs[this.level]) this.runs[this.level] = this.drawRun(this.level, { sync: false })
    this.enterQuestion()
  }

  // ── подписка ───────────────────────────────────────────────────────────
  subscribe = (fn) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = () => this.snap

  emit() {
    if (this.destroyed) return
    this.snap = this.buildSnapshot()
    for (const fn of [...this.listeners]) fn()
  }

  get run() {
    return this.runs[this.level]
  }

  buildSnapshot() {
    const run = this.run
    const question = run.complete ? null : this.data.byId[run.queue[run.index]]
    return {
      level: this.level,
      counts: this.counts,
      count: this.counts[this.level],
      run,
      question,
      options: question ? optionsOf(this.data, question) : null,
      round: question ? run.rounds[question.id] : null,
      index: run.index,
      total: run.queue.length,
      complete: run.complete,
      isLast: run.index === run.queue.length - 1,
      score: scoreOf(run),
      retryCount: run.complete ? retryIds(run).length : 0,
      heard: this.heard,
      imagesReady: this.imagesReady,
      transcriptOpen: this.transcriptOpen,
    }
  }

  // ── наборы ─────────────────────────────────────────────────────────────
  /**
   * Новый набор сложности. Первое задание не из сцены, на которой остановился
   * прошлый набор, — иначе после «Новый набор» студент видел бы те же четыре
   * фото подряд. «Уже было» читается заново при каждом наборе: с сервера мог
   * приехать более свежий (гидратация после входа).
   */
  drawRun(level, { sync = true } = {}) {
    // У завершённого набора index остаётся на последнем задании, и его сцена
    // тоже считается «прошлой» — как у прототипа.
    const previous = this.runs[level]
    const prevQuestion = previous ? this.data.byId[previous.queue[previous.index]] : null
    const previousScene = prevQuestion ? prevQuestion.scene : null
    const draw = sampleQuestions(
      this.data.questions,
      { level, count: this.counts[level], seen: this.progress.readSeen(level), previousScene },
      this.random,
    )
    this.progress.writeSeen(level, draw.seen, { sync })
    return createRun(draw.queue)
  }

  patchRun(patch) {
    this.runs = { ...this.runs, [this.level]: { ...this.run, ...patch } }
  }

  save() {
    this.device.write({
      level: this.level,
      counts: this.counts,
      rate: this.prefs.rate,
      volume: this.prefs.volume,
      runs: this.runs,
    })
  }

  /** Перешли к заданию: раунд заведён, запись грузится, флаги сброшены. */
  enterQuestion() {
    this.transcriptOpen = false
    this.imagesReady = false
    const run = this.run
    if (run.complete) {
      this.player.stop()
      this.heard = true
      this.save()
      this.emit()
      return
    }
    const question = this.data.byId[run.queue[run.index]]
    const round = roundOf(run, question.id, this.random)
    if (run.rounds[question.id] !== round) this.patchRun({ rounds: { ...run.rounds, [question.id]: round } })
    // Уже решённое задание считается «услышанным»: разбор открыт с порога.
    this.heard = round.resolved
    this.player.load(question.audio)
    this.save()
    this.preloadNext()
    this.emit()
  }

  preloadNext() {
    const run = this.run
    const nextId = run.queue[run.index + 1]
    this.preloads = nextId ? this.preload(this.data.byId[nextId]) || [] : []
  }

  startNewSet() {
    this.player.stop()
    this.runs = { ...this.runs, [this.level]: this.drawRun(this.level) }
    this.enterQuestion()
  }

  /** «Повторить ошибки»: те же задания, где был промах или вторая попытка. */
  retryMistakes() {
    const ids = retryIds(this.run)
    if (!ids.length) return
    this.player.stop()
    this.runs = { ...this.runs, [this.level]: runFromIds(this.data, ids, this.level, this.random) }
    this.enterQuestion()
  }

  setLevel(level) {
    if (!LEVELS.includes(level) || level === this.level) return
    this.player.stop()
    this.level = level
    if (!this.runs[level]) this.runs = { ...this.runs, [level]: this.drawRun(level) }
    this.enterQuestion()
  }

  /** Размер СЛЕДУЮЩЕГО набора этой сложности; текущий не трогаем. */
  setCount(n) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_COUNT) return false
    this.counts = { ...this.counts, [this.level]: n }
    this.save()
    this.emit()
    return true
  }

  // ── раунд ──────────────────────────────────────────────────────────────
  markHeard() {
    if (this.heard) return
    this.heard = true
    this.emit()
  }

  /** Картинки грузятся асинхронно: отчёт о готовности старого задания не считается. */
  setImagesReady(ok, questionId) {
    const q = this.snap && this.snap.question
    if (!q || q.id !== questionId || this.imagesReady === ok) return
    this.imagesReady = ok
    this.emit()
  }

  toggleTranscript() {
    const q = this.snap && this.snap.question
    if (!q || !this.run.rounds[q.id].resolved) return
    this.transcriptOpen = !this.transcriptOpen
    this.emit()
  }

  /**
   * Ответ по индексу ФОТО (а не позиции на экране: позицию в фото переводит
   * round.order). false — ответ не принят (не дослушано, картинки не готовы,
   * задание закрыто, эта картинка уже ошибочная); экран по нему решает, куда
   * вернуть фокус.
   */
  answer(optionIndex) {
    const question = this.snap && this.snap.question
    if (!question) return false
    const round = this.run.rounds[question.id]
    if (!canAnswer(round, { heard: this.heard, imagesReady: this.imagesReady }, optionIndex)) return false
    this.player.stop()
    const next = answerRound(round, question, optionIndex)
    this.patchRun({ rounds: { ...this.run.rounds, [question.id]: next } })
    // Первая ошибка не закрывает задание и ответа не открывает: чтобы выбрать
    // снова, запись нужно прослушать ещё раз.
    if (!next.resolved) {
      this.heard = false
      this.player.resetListening()
    }
    this.save()
    this.emit()
    if (next.resolved) {
      this.onResolved({ questionId: question.id, level: this.level, correct: next.correct, attempts: next.attempts })
    }
    return true
  }

  next() {
    const question = this.snap && this.snap.question
    if (!question || !this.run.rounds[question.id].resolved) return
    this.player.stop()
    const run = this.run
    if (run.index + 1 < run.queue.length) {
      this.patchRun({ index: run.index + 1 })
    } else {
      this.patchRun({ complete: true })
    }
    this.enterQuestion()
  }

  // ── плеер: темп и громкость запоминаются на устройстве ─────────────────
  setRate(rate) {
    if (!RATES.includes(rate)) return
    this.player.setRate(rate)
    this.prefs = { ...this.prefs, rate }
    this.save()
  }

  setVolume(volume) {
    if (!Number.isFinite(volume)) return
    this.player.setVolume(volume)
    this.prefs = { ...this.prefs, volume }
    this.save()
  }

  /** «Try again» после сбоя записи: тот же файл, заново. */
  reloadAudio() {
    const question = this.snap && this.snap.question
    if (question) this.player.load(question.audio)
  }

  /** Вкладку спрятали — запись не должна играть в пустоту. */
  pause() {
    this.player.pause()
  }

  destroy() {
    this.destroyed = true
    this.listeners.clear()
    this.player.destroy()
    this.preloads = []
  }
}
