'use client'

// Итог прогона: «С первого раза: 7 из 10», список фраз с отметкой (с первого раза / верно / показана),
// «Пройти ошибки заново» — только фразы не с первого раза, в этой же сессии, — и «К списку». Фокус — на заголовок
// итога: экран сменился целиком, и читалка начинает с результата.

import { useEffect, useRef } from 'react'
import Icon from '../listen/ListenIcons.jsx'

const MARK = {
  clean: { cls: 'jl-mark--y', icon: 'check' },
  ok: { cls: 'vd-mark--ok', icon: 'check' },
  miss: { cls: 'jl-mark--n', icon: 'x' },
}

function message(clean, n) {
  if (clean === n) return 'videoDictation.result.great'
  return clean / n >= 0.7 ? 'videoDictation.result.good' : 'videoDictation.result.again'
}

export default function DictationResult({ summary, redo, t, onRedo, onExit }) {
  const { n, clean, items, mistakes } = summary
  const headRef = useRef(null)
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true })
  }, [])
  return (
    <section className="jl-card jl-result vd-result">
      <div>
        <h2 ref={headRef} tabIndex={-1}>
          {t('videoDictation.firstTry', { clean, n })}
        </h2>
        <p className="jl-muted">{t(message(clean, n))}</p>
        {redo && <p className="jl-result__note">{t('videoDictation.result.redoNote')}</p>}
      </div>
      <ol className="jl-review vd-review">
        {items.map((r) => (
          <li className="vd-rv" key={r.n}>
            <i className={`jl-mark ${MARK[r.outcome].cls}`}>
              <Icon name={MARK[r.outcome].icon} />
            </i>
            <span className="vd-rv__text" lang="en">
              {r.text}
            </span>
            <span className="vd-rv__mark">{t(`videoDictation.mark.${r.outcome}`)}</span>
          </li>
        ))}
      </ol>
      <div className="jl-row">
        {mistakes.length > 0 && (
          <button type="button" className="jl-btn" onClick={() => onRedo(mistakes)}>
            {t('videoDictation.result.redo')}
          </button>
        )}
        <button type="button" className={`jl-btn${mistakes.length ? ' jl-btn--ghost' : ''}`} onClick={onExit}>
          {t('videoDictation.toList')}
        </button>
      </div>
    </section>
  )
}
