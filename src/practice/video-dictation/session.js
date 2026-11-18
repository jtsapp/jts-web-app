// Машина урока Видеодиктанта вне React — по образцу ListenSession (src/practice/listen/session.js): фраза, набор,
// подсказка, проверка, показ, следующая, итог. Без DOM и плеера: что и когда играть, решает экран (player.js),
// сессия знает только ответы. Экран подписан через useSyncExternalStore (subscribe / getSnapshot).
//
// Правила сверки (спека, «Правила сверки»): вердикт — judgeWord Just to Listen над склейкой букв всех пропусков фразы:
// ok, near (почти — не засчитывается), bad. Попыток TRIES (две), потом фраза показывается. Итог фразы: clean — верно с
// первой попытки без подсказок, ok — верно иначе, miss — показана после двух неудач.

import { letters } from '../listen/compare.js'
import { TRIES, judgeWord } from '../listen/rules.js'

function newItem(phrase) {
  return {
    phrase,
    typed: '',
    tries: 0,
    revealed: 0, // открытые подсказкой буквы (подсветка ячеек)
    hintsUsed: 0,
    mark: null, // ok | near | bad | shown — цвет ячеек
    done: false,
    outcome: null, // clean | ok | miss
    attempt: '', // набранное до показа фразы — Луне (data-assistant-entered) и в итог
  }
}

export class DictationSession {
  constructor({ phrases, onPhrase = () => {}, onDone = () => {} }) {
    this.phrases = phrases
    this.onPhrase = onPhrase
    this.onDone = onDone
    this.listeners = new Set()
    this.index = 0
    this.results = []
    this.phase = phrases.length ? 'intro' : 'result'
    this.item = null
    this.publish()
  }

  subscribe = (fn) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = () => this.snap

  // Новый объект на каждое изменение: useSyncExternalStore сравнивает снимки по ссылке.
  publish() {
    this.snap = {
      phase: this.phase,
      index: this.index,
      total: this.phrases.length,
      item: this.item && { ...this.item },
      summary: this.phase === 'result' ? this.summary() : null,
    }
    for (const fn of this.listeners) fn()
  }

  /** «Начать»: первая фраза. */
  start() {
    if (this.phase !== 'intro') return
    this.phase = 'phrase'
    this.item = newItem(this.phrases[0])
    this.publish()
  }

  type(value) {
    const it = this.item
    if (!it || it.done) return
    const typed = letters(value).slice(0, it.phrase.target.length)
    if (typed === it.typed) return
    it.typed = typed
    it.mark = null
    this.publish()
  }

  /** Enter или «Проверить». Пустой набор попытку не тратит. */
  check() {
    const it = this.item
    if (!it || it.done || !it.typed) return
    it.tries++
    const verdict = judgeWord(it.typed, it.phrase.target)
    if (verdict === 'ok') return this.finish(it.tries === 1 && it.hintsUsed === 0 ? 'clean' : 'ok', 'ok')
    if (it.tries < TRIES) {
      it.mark = verdict
      return this.publish()
    }
    it.attempt = it.typed
    it.typed = it.phrase.target
    return this.finish('miss', 'shown')
  }

  /** «Подсказка»: следующая буква, верно набранное начало сохраняется; последняя буква — сразу проверка. */
  hint() {
    const it = this.item
    if (!it || it.done) return
    const target = it.phrase.target
    let p = 0
    while (p < it.typed.length && it.typed[p] === target[p]) p++
    it.hintsUsed++
    it.revealed = Math.min(Math.max(it.revealed, p) + 1, target.length)
    it.typed = target.slice(0, it.revealed)
    it.mark = null
    if (it.revealed >= target.length) return this.check()
    return this.publish()
  }

  finish(outcome, mark) {
    const it = this.item
    Object.assign(it, { done: true, outcome, mark })
    const result = { n: it.phrase.n, text: it.phrase.plain, outcome, attempt: it.attempt }
    this.results.push(result)
    this.publish()
    this.onPhrase(result)
  }

  /** «Дальше»: следующая фраза, после последней — итог. */
  next() {
    if (!this.item?.done) return
    this.index++
    if (this.index < this.phrases.length) {
      this.item = newItem(this.phrases[this.index])
      return this.publish()
    }
    this.phase = 'result'
    this.item = null
    this.publish()
    this.onDone(this.summary())
  }

  summary() {
    const count = (outcome) => this.results.filter((r) => r.outcome === outcome).length
    return {
      n: this.results.length,
      clean: count('clean'),
      ok: count('ok'),
      miss: count('miss'),
      items: this.results.map((r) => ({ ...r })),
      // «Пройти ошибки заново» — фразы не с первого раза (n — номер фразы в уроке).
      mistakes: this.results.filter((r) => r.outcome !== 'clean').map((r) => r.n),
    }
  }
}
