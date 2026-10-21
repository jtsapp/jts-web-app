'use client'

// Шаг 2: предложение на слух (или своё — у своего списка без образца). Enter —
// «Проверить», после ответа — «Дальше»; Shift+Enter — перенос строки.

import { enMain } from '../../practice/listen/compare.js'
import { hasSentence, sentenceRef } from '../../practice/listen/rules.js'
import { say } from '../../practice/listen/voice.js'
import Icon from './ListenIcons.jsx'
import { SentenceFeedback } from './ListenFeedback.jsx'

export default function SentenceStep({ item, session, hintsLeft, showsLeft, last, t, inputRef, nextRef, onNext }) {
  const card = item.card
  const withSentence = hasSentence(card)
  const ref = sentenceRef(card)
  const word = enMain(card.en)
  const done = item.step === 'done'
  return (
    <>
      {withSentence && (
        <div className="jl-listen">
          <button
            type="button"
            className="jl-play"
            aria-label={t('listen.play.sentence')}
            onClick={() => {
              say(ref, { kind: 'sentence' })
              inputRef.current?.focus()
            }}
          >
            <Icon name="sound" />
          </button>
          <button
            type="button"
            className="jl-tool"
            onClick={() => {
              say(ref, { kind: 'sentence', slow: true })
              inputRef.current?.focus()
            }}
          >
            {t('listen.slower')}
          </button>
        </div>
      )}
      <textarea
        ref={inputRef}
        className={`jl-sent${item.sentMark ? ` is-${item.sentMark}` : ''}`}
        value={item.sentence}
        readOnly={done}
        spellCheck={false}
        aria-label={t('listen.sent.input')}
        placeholder={withSentence ? t('listen.sent.placeholder') : t('listen.sent.placeholderOwn')}
        onChange={(e) => session.typeSentence(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.shiftKey) return
          e.preventDefault()
          if (done) onNext()
          else session.submitSentence()
        }}
      />
      <div className="jl-tools">
        <button type="button" className="jl-tool" onClick={() => say(word, { kind: 'word' })}>
          <Icon name="sound" /> {t('listen.sayWord')}
        </button>
        <button
          type="button"
          className="jl-tool"
          disabled={done || item.sentHinted || hintsLeft <= 0}
          onClick={() => session.hintSentence()}
        >
          <Icon name="bulb" /> {t('listen.sent.hint')} <span className="jl-cnt">{hintsLeft}</span>
        </button>
        <button type="button" className="jl-tool" disabled={done || showsLeft <= 0} onClick={() => session.showSentence()}>
          <Icon name="eye" /> {t('listen.show')} <span className="jl-cnt">{showsLeft}</span>
        </button>
      </div>
      <SentenceFeedback item={item} word={word} t={t} />
      <div className="jl-foot">
        {done ? (
          <button ref={nextRef} type="button" className="jl-btn" onClick={onNext}>
            {last ? t('listen.toResult') : t('listen.next')} <Icon name="arrow" />
          </button>
        ) : (
          <button type="button" className="jl-btn" disabled={!item.sentence.trim()} onClick={() => session.submitSentence()}>
            {t('listen.check')}
          </button>
        )}
      </div>
    </>
  )
}
