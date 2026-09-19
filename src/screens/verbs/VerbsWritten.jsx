'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { pattern } from '../../practice/verbs/engine.js'
import VerbWordCard from './VerbWordCard.jsx'

// Письменные режимы — renderWritten/checkWritten/showWrittenResult прототипа.
// Поля ввода — локальный стейт компонента: снимок VerbDrill хранит только
// итог проверки, а набранное до неё — дело формы. После проверки значения
// берутся из результата, как в прототипе (showWrittenResult возвращал их в
// поля).
export default function VerbsWritten({ drill, snap, data, token }) {
  const { t } = useI18n()
  const fields = drill.fields()
  const result = snap.result && snap.result.kind === 'written' ? snap.result : null
  const [values, setValues] = useState(() => (result ? result.score.results.map((r) => r.value) : fields.map(() => '')))
  const inputs = useRef([])
  const hostRef = useRef(null)
  const [word, setWord] = useState(null) // { text, at }
  const closeWord = useCallback(() => setWord(null), [])

  // «Попробовать ещё» сбрасывает результат — поля пустеют и фокус в первое.
  const hadResult = useRef(!!result)
  useEffect(() => {
    if (hadResult.current && !result) {
      setValues(fields.map(() => ''))
      if (inputs.current[0]) inputs.current[0].focus()
    }
    hadResult.current = !!result
  }, [result]) // eslint-disable-line react-hooks/exhaustive-deps

  const it = snap.item
  const v = snap.verb
  const last = snap.idx >= snap.count - 1

  const check = (reveal) => {
    const empty = drill.checkWritten(values, reveal)
    if (empty >= 0 && inputs.current[empty]) inputs.current[empty].focus()
  }

  // Слово предложения под пальцем: карточка встаёт у него ВНУТРИ блока
  // задания (position: absolute) — урок «Чтения»: у fixed-карточки её сносил
  // доводочный скролл браузера сразу после тапа. Сверху или снизу — решает
  // сама карточка, когда знает свою высоту. Верхняя кромка — у всего
  // предложения, а не у слова: над словом второй строки карточка закрывала
  // первую, и перевод читался без контекста.
  const onWord = (e, text) => {
    const host = hostRef.current
    if (!host) return
    const r = e.currentTarget.getBoundingClientRect()
    const h = host.getBoundingClientRect()
    const prompt = e.currentTarget.closest('.vb-prompt')
    const top = prompt ? prompt.getBoundingClientRect().top : r.top
    setWord({ text, at: { left: r.left - h.left, above: top - h.top, below: r.bottom - h.top } })
  }

  return (
    <div className="vb-written" ref={hostRef}>
      <div className="vb-prompt" lang="en">
        {snap.mode === 'write' ? (
          <>
            <span className="vb-pill">V1</span>
            <strong>{v.v1}</strong>
          </>
        ) : (
          <>
            <TapText text={it.text} mode={snap.mode} onWord={onWord} active={word && word.text} />
            {snap.mode === 'sentence' && <small> ({v.v1})</small>}
          </>
        )}
      </div>
      {/* Что слова нажимаются, иначе не видно ничем: без строки и пунктира
          перевод находили только случайно. */}
      {snap.mode !== 'write' && <p className="vb-taphint">{t('verbs.tapHint')}</p>}

      {word && (
        <VerbWordCard
          key={`${word.text}:${word.at.left}:${word.at.above}`}
          word={word.text}
          at={word.at}
          host={hostRef}
          dict={data.dict}
          token={token}
          onClose={closeWord}
        />
      )}

      <form
        className={`vb-form${fields.length === 1 ? ' is-single' : ''}`}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          check(false)
        }}
      >
        {fields.map((f, i) => {
          const r = result && result.score.results[i]
          const state = r ? (r.heard ? ' is-correct' : result.revealed ? '' : ' is-wrong') : ''
          return (
            <label className="vb-field" key={i}>
              <span className="vb-field__label">{f.label === 'yourAnswer' ? t('verbs.yourAnswer') : f.label}</span>
              <input
                ref={(el) => {
                  inputs.current[i] = el
                }}
                className={`vb-answer${state}`}
                lang="en"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={snap.mode === 'write' ? f.label : t('verbs.onlyForm')}
                aria-invalid={r ? !r.heard && !result.revealed : undefined}
                value={values[i] || ''}
                onChange={(e) => {
                  const next = values.slice()
                  next[i] = e.target.value
                  setValues(next)
                }}
              />
            </label>
          )
        })}
        <div className="vb-row">
          <button type="submit" className="vb-btn">
            {t('verbs.check')}
          </button>
          <button type="button" className="vb-btn vb-btn--ghost" onClick={() => check(true)}>
            {t('verbs.revealAnswer')}
          </button>
        </div>
      </form>

      {result && (
        <div className="vb-feedback" aria-live="polite">
          {result.score.results.map((r, i) => (
            <div key={i} className={`vb-answerrow${r.heard ? ' is-correct' : ''}`}>
              <span>{result.revealed ? t('verbs.revealCounts') : r.heard ? `✓ ${t('verbs.correct')}` : `↻ ${t('verbs.tryAgain')}`}</span>
              <strong lang="en">{r.form}</strong>
            </div>
          ))}
          <p className="vb-rule">
            {it.rule ? t('verbs.' + it.rule) : `${pattern(v)} · ${t('verbs.pattern' + pattern(v))}`}
          </p>
          <div className="vb-row vb-result-actions">
            <button type="button" className="vb-btn vb-btn--ghost" onClick={() => drill.retryWritten()}>
              {t('verbs.tryAgain')}
            </button>
            <button type="button" className="vb-btn" onClick={() => drill.next()}>
              {t(last ? 'verbs.finishSet' : 'verbs.next')} →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Предложение задания: слова тапаются, пропуск «____» и ошибка в {скобках}
// рисуются отдельно — их переводить нечего.
function TapText({ text, mode, onWord, active }) {
  const parts = String(text).split(/(\{[^}]+\}|____)/)
  return parts.map((part, pi) => {
    if (part === '____') {
      return (
        <span key={pi} className="vb-blank">
          ____
        </span>
      )
    }
    if (/^\{[^}]+\}$/.test(part) && mode === 'fix') return <mark key={pi}>{part.slice(1, -1)}</mark>
    return (
      <Fragment key={pi}>
        {part.split(/(\s+)/).map((tok, ti) =>
          !tok || /^\s+$/.test(tok) || !/[A-Za-z]/.test(tok) ? (
            <Fragment key={ti}>{tok}</Fragment>
          ) : (
            <span
              key={ti}
              role="button"
              tabIndex={0}
              className={`vb-w${active === tok ? ' is-on' : ''}`}
              onClick={(e) => onWord(e, tok)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onWord(e, tok)
                }
              }}
            >
              {tok}
            </span>
          ),
        )}
      </Fragment>
    )
  })
}
