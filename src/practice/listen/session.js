// Машина теста Just to Listen вне React — порт item()/checkWord()/hintLetter()/
// revealWord()/toSentence()/checkSentence()/finishSentence()/result() прототипа
// без DOM и звука. Экран подписан через useSyncExternalStore (subscribe /
// getSnapshot); что сказать вслух, сессия сообщает колбэком onSay, а таймеры
// автоплея и сам звук — у экрана.

import { enMain, letters } from './compare.js'
import {
  HINTS_PER_TEST, SHOWS_PER_TEST, TRIES, hasSentence, judgeSentence, judgeWord, sentenceCoins, sentenceRef,
  wordCoins, wordTarget,
} from './rules.js'

function newItem(card) {
  return {
    card,
    target: wordTarget(card.en),
    step: 'word', // word → sent → done
    typed: '',
    wordTries: 0,
    revealed: 0, // открытые подсказкой буквы (подсветка ячеек)
    hintsUsed: 0, // нажатия «Подсказать букву» (монеты)
    wordMark: null, // ok | near | bad | shown — цвет ячеек
    wordFeedback: null,
    wordOk: false,
    wordAns: '',
    sentence: '',
    sentTries: 0,
    sentHinted: false,
    sentMark: null, // bad | ok
    sentFeedback: null,
    sentOk: false,
  }
}

export class ListenSession {
  constructor({ cards, onSay = () => {}, onItem = () => {}, onDone = () => {} }) {
    this.cards = cards
    this.onSay = onSay
    this.onItem = onItem
    this.onDone = onDone
    this.listeners = new Set()
    this.index = 0
    this.hintsLeft = HINTS_PER_TEST
    this.showsLeft = SHOWS_PER_TEST
    this.earned = 0
    this.results = []
    this.phase = cards.length ? 'task' : 'result'
    this.item = cards.length ? newItem(cards[0]) : null
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
      total: this.cards.length,
      hintsLeft: this.hintsLeft,
      showsLeft: this.showsLeft,
      earned: this.earned,
      item: this.item && { ...this.item },
      summary: this.phase === 'result' ? this.summary() : null,
    }
    for (const fn of this.listeners) fn()
  }

  /** Лимит на весь тест; на нуле кнопка неактивна. */
  useLimit(kind) {
    const key = kind === 'hint' ? 'hintsLeft' : 'showsLeft'
    if (this[key] <= 0) return false
    this[key]--
    return true
  }

  // ---------- шаг 1: слово ----------

  typeWord(value) {
    const it = this.item
    if (!it || it.step !== 'word') return
    it.typed = letters(value).slice(0, it.target.length)
    it.wordMark = null
    this.publish()
    if (it.typed.length === it.target.length) this.checkWord()
  }

  submitWord() {
    const it = this.item
    if (it && it.step === 'word' && it.typed.length) this.checkWord()
  }

  checkWord() {
    const it = this.item
    it.wordTries++
    const verdict = judgeWord(it.typed, it.card.en)
    if (verdict === 'ok') {
      const coins = wordCoins(it.wordTries, it.hintsUsed)
      this.earned += coins
      Object.assign(it, { wordOk: true, wordAns: it.typed, wordMark: 'ok', wordFeedback: { kind: 'ok', coins } })
      this.onSay(enMain(it.card.en), 'word')
      return this.toSentence()
    }
    it.wordMark = verdict
    if (it.wordTries < TRIES) {
      it.wordFeedback = { kind: verdict, retry: true }
      return this.publish()
    }
    return this.revealWord(it.typed)
  }

  /** Открывает следующую букву: верно набранное начало сохраняется. */
  hintLetter() {
    const it = this.item
    if (!it || it.step !== 'word' || !this.useLimit('hint')) return
    let p = 0
    while (p < it.typed.length && it.typed[p] === it.target[p]) p++
    it.hintsUsed++
    it.revealed = Math.min(Math.max(it.revealed, p) + 1, it.target.length)
    it.typed = it.target.slice(0, it.revealed)
    it.wordMark = null
    this.publish()
    if (it.revealed >= it.target.length) this.checkWord()
  }

  showWord() {
    const it = this.item
    if (it && it.step === 'word' && this.useLimit('show')) this.revealWord(null)
  }

  // Показ после двух ошибок лимит не тратит — зовётся из checkWord напрямую.
  revealWord(typed) {
    const it = this.item
    Object.assign(it, {
      wordOk: false,
      wordAns: typed || '—',
      typed: it.target,
      wordMark: 'shown',
      wordFeedback: { kind: 'shown', typed: typed || null },
    })
    this.onSay(enMain(it.card.en), 'word')
    this.toSentence()
  }

  toSentence() {
    this.item.step = 'sent'
    this.publish()
  }

  // ---------- шаг 2: предложение ----------

  typeSentence(value) {
    const it = this.item
    if (!it || it.step !== 'sent') return
    it.sentence = String(value)
    it.sentMark = null
    this.publish()
  }

  submitSentence() {
    const it = this.item
    const raw = it?.sentence.trim()
    if (!raw || it.step !== 'sent') return
    it.sentTries++
    const j = judgeSentence(raw, it.card)
    if (j.ok) return this.finishSentence(true, raw, j)
    if (it.sentTries < TRIES) {
      it.sentMark = 'bad'
      it.sentFeedback = { kind: j.near ? 'near' : 'bad', reason: j.reason, missing: j.missing, own: !hasSentence(it.card) }
      return this.publish()
    }
    return this.finishSentence(false, raw, j)
  }

  /** Подсказка шага 2 — одна на задание: первая треть образца или совет для своего предложения. */
  hintSentence() {
    const it = this.item
    if (!it || it.step !== 'sent' || it.sentHinted || !this.useLimit('hint')) return
    it.sentHinted = true
    if (hasSentence(it.card)) {
      const words = sentenceRef(it.card).split(' ')
      it.sentFeedback = { kind: 'hint', text: words.slice(0, Math.ceil(words.length / 3)).join(' ') }
    } else {
      it.sentFeedback = { kind: 'ownHint' }
    }
    this.publish()
  }

  showSentence() {
    const it = this.item
    if (it && it.step === 'sent' && this.useLimit('show')) this.finishSentence(false, it.sentence.trim() || '—', null)
  }

  finishSentence(ok, raw, judged) {
    const it = this.item
    const ref = sentenceRef(it.card)
    it.step = 'done'
    it.sentOk = ok
    it.sentMark = ok ? 'ok' : 'bad'
    if (ok) {
      const coins = sentenceCoins(it.sentTries, it.sentHinted)
      this.earned += coins
      it.sentFeedback = { kind: 'ok', coins, exact: judged?.distance === 0, ref, ru: it.card.exRu }
      this.onSay(ref || raw, 'sentence')
    } else {
      it.sentFeedback = { kind: 'answer', ref, ru: it.card.exRu }
      if (ref) this.onSay(ref, 'sentence')
    }
    const result = { card: it.card, wordOk: it.wordOk, wordAns: it.wordAns, sentOk: ok, sentAns: raw }
    this.results.push(result)
    this.onItem(result)
    this.publish()
  }

  next() {
    if (!this.item || this.item.step !== 'done') return
    this.index++
    if (this.index < this.cards.length) {
      this.item = newItem(this.cards[this.index])
      return this.publish()
    }
    this.phase = 'result'
    this.item = null
    this.publish()
    this.onDone(this.summary())
  }

  summary() {
    const n = this.results.length
    const wordsOk = this.results.filter((r) => r.wordOk).length
    const sentencesOk = this.results.filter((r) => r.sentOk).length
    return {
      n,
      wordsOk,
      sentencesOk,
      ok: this.results.filter((r) => r.wordOk && r.sentOk).length,
      accuracy: n ? Math.round(((wordsOk + sentencesOk) / (2 * n)) * 100) : 0,
      earned: this.earned,
      wrong: this.results.filter((r) => !(r.wordOk && r.sentOk)).map((r) => r.card),
      items: this.results,
    }
  }
}
