'use client'

// Итог теста: монеты (и сколько ушло в баланс — только прирост к лучшему),
// верно слов / предложений, точность, разбор каждого слова с ответом ученика.

import { enMain, first } from '../../practice/listen/compare.js'
import { sentenceRef } from '../../practice/listen/rules.js'
import Icon from './ListenIcons.jsx'

function Mark({ ok }) {
  return (
    <i className={`jl-mark jl-mark--${ok ? 'y' : 'n'}`}>
      <Icon name={ok ? 'check' : 'x'} />
    </i>
  )
}

function balanceNote(settled, earned, t) {
  if (!settled || earned === 0) return null
  if (!settled.keyed) return t('listen.result.practiceRun')
  return settled.credit > 0 ? t('listen.result.credited', { n: settled.credit }) : t('listen.result.noGain')
}

export default function ListenResult({ summary, settled, owner, t, onRedo, onRestart, onExit }) {
  const { n, wordsOk, sentencesOk, ok, accuracy, earned, wrong, items } = summary
  const msg = ok === n ? t('listen.result.perfect') : ok / n >= 0.7 ? t('listen.result.good') : t('listen.result.again')
  const note = balanceNote(settled, earned, t)
  const back = owner
    ? owner.kind === 'field'
      ? t('listen.result.toField')
      : t('listen.result.toLevel', { id: owner.id })
    : t('listen.result.toMenu')
  return (
    <section className="jl-card jl-result">
      <span className="jl-coin jl-bigcoin">J</span>
      <div>
        <h2>{t('listen.result.coins', { n: earned })}</h2>
        <p className="jl-muted">{msg}</p>
        {note && <p className="jl-result__note">{note}</p>}
      </div>
      <div className="jl-stats">
        <div className="jl-stat"><b>{wordsOk}/{n}</b><span>{t('listen.result.words')}</span></div>
        <div className="jl-stat"><b>{sentencesOk}/{n}</b><span>{t('listen.result.sentences')}</span></div>
        <div className="jl-stat"><b>{accuracy}%</b><span>{t('listen.result.accuracy')}</span></div>
      </div>
      <div className="jl-review">
        {items.map((r, i) => (
          <div className="jl-rv" key={i}>
            <span className="jl-rv__d">
              <Mark ok={r.wordOk} />
              <Mark ok={r.sentOk} />
            </span>
            <div className="jl-rv__w">
              {enMain(r.card.en)} <span>— {first(r.card.ru)}</span>
            </div>
            <div className="jl-rv__s">
              {sentenceRef(r.card)}
              {r.sentAns && r.sentAns !== '—' && (
                <>
                  <br />
                  {t('listen.result.yourAnswer')} <em>{r.sentAns}</em>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="jl-row">
        {wrong.length > 0 && (
          <button type="button" className="jl-btn" onClick={() => onRedo(wrong)}>
            {t('listen.result.redo', { n: wrong.length })}
          </button>
        )}
        <button type="button" className={`jl-btn${wrong.length ? ' jl-btn--ghost' : ''}`} onClick={onRestart}>
          {t('listen.result.restart')}
        </button>
        <button type="button" className="jl-btn jl-btn--ghost" onClick={onExit}>
          {back}
        </button>
      </div>
    </section>
  )
}
