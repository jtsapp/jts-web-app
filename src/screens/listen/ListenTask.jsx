'use client'

// Экран задания: шапка теста (выход, прогресс, лимиты, монеты), шаг 1 — слово
// по буквам, шаг 2 — предложение на слух. Фокус ведёт за шагом: ячейки → поле
// предложения → «Дальше»; после неверной попытки набранное выделено, чтобы
// следующий набор его заменил (как inp.select() прототипа).

import { useEffect, useRef } from 'react'
import { enMain, first } from '../../practice/listen/compare.js'
import { hasSentence } from '../../practice/listen/rules.js'
import { say } from '../../practice/listen/voice.js'
import Icon from './ListenIcons.jsx'
import { WordFeedback } from './ListenFeedback.jsx'
import SentenceStep from './SentenceStep.jsx'
import WordCells from './WordCells.jsx'

/** Подпись прогона над заданием: «A1 · L3 · Часть 1 · My biography». */
function runLabel(owner, run, t) {
  const where = owner ? (owner.kind === 'field' ? owner.name : owner.id) : ''
  let what = run.title
  if (run.kind === 'test') what = t(owner?.kind === 'field' ? 'listen.test.field' : 'listen.test.level')
  if (run.kind === 'unit') what = `${t('listen.unitReview')} · ${t('listen.unit', { u: run.u })}`
  if (run.kind === 'lesson') what = `L${run.l}${run.parts > 1 ? ` · ${t('listen.part', { n: run.part + 1 })}` : ''} · ${run.title}`
  if (run.kind === 'review') what = `${t('listen.lessonReview', { l: run.l })} · ${run.title}`
  return where ? `${where} · ${what}` : what
}

export default function ListenTask({ snap, session, owner, run, t, onQuit }) {
  const { item, index, total, hintsLeft, showsLeft, earned } = snap
  const card = item.card
  const word = enMain(card.en)
  const wordRef = useRef(null)
  const sentRef = useRef(null)
  const nextRef = useRef(null)
  const step = item.step

  useEffect(() => {
    if (step === 'word') {
      wordRef.current?.focus({ preventScroll: true })
      return undefined
    }
    if (step === 'done') {
      nextRef.current?.focus({ preventScroll: true })
      return undefined
    }
    const id = setTimeout(() => {
      sentRef.current?.focus({ preventScroll: true })
      sentRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    }, 350)
    return () => clearTimeout(id)
  }, [index, step])

  useEffect(() => {
    if (step === 'word' && item.wordTries > 0) wordRef.current?.select()
  }, [item.wordTries, step])

  const done = step === 'done'
  const passed = done ? index + 1 : index
  return (
    <div className="jl-run">
      <div className="jl-run__top">
        <button type="button" className="jl-x" onClick={onQuit} aria-label={t('listen.quit')}>
          <Icon name="close" />
        </button>
        <div className="jl-pbar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={passed}>
          <i style={{ width: `${(passed / total) * 100}%` }} />
        </div>
        <span className="jl-lims">
          <span className={hintsLeft ? '' : 'is-zero'} title={t('listen.hintsLeft')}>
            <Icon name="bulb" />
            <b>{hintsLeft}</b>
          </span>
          <span className={showsLeft ? '' : 'is-zero'} title={t('listen.showsLeft')}>
            <Icon name="eye" />
            <b>{showsLeft}</b>
          </span>
        </span>
        <span className="jl-coins">
          <span className="jl-coin">J</span>
          <span>{earned}</span>
        </span>
      </div>

      <section className="jl-card jl-ex">
        <div className="jl-stage">
          <div className="jl-stage__h">
            <span className={`jl-n${step !== 'word' ? ' is-done' : ''}`}>{step !== 'word' ? <Icon name="check" /> : 1}</span>
            {t('listen.step1')}
          </div>
          <div className="jl-listen">
            <button
              type="button"
              className="jl-play"
              aria-label={t('listen.play.word')}
              onClick={() => {
                say(word, { kind: 'word' })
                wordRef.current?.focus()
              }}
            >
              <Icon name="sound" />
            </button>
            <button
              type="button"
              className="jl-tool"
              onClick={() => {
                say(word, { kind: 'word', slow: true })
                wordRef.current?.focus()
              }}
            >
              {t('listen.slower')}
            </button>
            <small>{runLabel(owner, run, t)}</small>
          </div>
          <WordCells
            item={item}
            inputRef={wordRef}
            label={t('listen.word.input')}
            onType={(v) => session.typeWord(v)}
            onSubmit={() => session.submitWord()}
          />
          <div className="jl-tools">
            <button type="button" className="jl-tool" disabled={step !== 'word' || hintsLeft <= 0} onClick={() => session.hintLetter()}>
              <Icon name="bulb" /> {t('listen.word.hint')} <span className="jl-cnt">{hintsLeft}</span>
            </button>
            <button type="button" className="jl-tool" disabled={step !== 'word' || showsLeft <= 0} onClick={() => session.showWord()}>
              <Icon name="eye" /> {t('listen.show')} <span className="jl-cnt">{showsLeft}</span>
            </button>
          </div>
          <WordFeedback item={item} word={word} ru={first(card.ru)} t={t} />
        </div>

        <div className={`jl-stage${step === 'word' ? ' is-locked' : ''}`} aria-disabled={step === 'word' || undefined}>
          <div className="jl-stage__h">
            <span className={`jl-n${item.sentOk ? ' is-done' : ''}`}>{item.sentOk ? <Icon name="check" /> : 2}</span>
            {hasSentence(card) ? t('listen.step2') : t('listen.step2.own')}
          </div>
          {step === 'word' ? (
            <div className="jl-locked">{t('listen.step2.locked')}</div>
          ) : (
            <SentenceStep
              item={item}
              session={session}
              hintsLeft={hintsLeft}
              showsLeft={showsLeft}
              last={index + 1 >= total}
              t={t}
              inputRef={sentRef}
              nextRef={nextRef}
              onNext={() => session.next()}
            />
          )}
        </div>
      </section>
    </div>
  )
}
