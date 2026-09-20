'use client'

// Итог набора: круг «верно/всего», три счётчика (с первой попытки, со второй,
// промахи), «Новый набор», «Повторить ошибки» и разбор по заданиям. «Повторить»
// предлагается, только когда есть что повторять (промах или вторая попытка).

import { useEffect, useRef, useState } from 'react'

export default function LcResult({ snap, data, t, onNewSet, onRetry }) {
  const { score, total, run, retryCount } = snap
  const [review, setReview] = useState(false)
  const titleRef = useRef(null)
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
  }, [])
  return (
    <section className="lc-result" aria-labelledby="lc-result-title">
      <div className="lc-result__circle">
        {score.first + score.second}/{total}
      </div>
      <h2 id="lc-result-title" tabIndex={-1} ref={titleRef}>
        {t('listenchoose.done')}
      </h2>
      <p>{t('listenchoose.doneSub')}</p>
      <div className="lc-stats">
        <div>
          <strong>{score.first}</strong>
          <span>{t('listenchoose.first')}</span>
        </div>
        <div>
          <strong>{score.second}</strong>
          <span>{t('listenchoose.second')}</span>
        </div>
        <div>
          <strong>{score.missed}</strong>
          <span>{t('listenchoose.missed')}</span>
        </div>
      </div>
      <div className="lc-result__actions">
        <button type="button" className="lc-primary" onClick={onNewSet}>
          {t('listenchoose.newSet')}
        </button>
        {retryCount > 0 && (
          <button type="button" className="lc-secondary" onClick={onRetry}>
            {t('listenchoose.repeat')}
          </button>
        )}
        <button type="button" className="lc-quiet" aria-expanded={review} onClick={() => setReview((v) => !v)}>
          {t(review ? 'listenchoose.reviewHide' : 'listenchoose.review')}
        </button>
      </div>
      {review && (
        <ul className="lc-review">
          {run.queue.map((id, i) => (
            <li key={id}>
              <b>
                {i + 1}. {data.byId[id].key}
              </b>
              <br />
              <span lang="en">{data.byId[id].text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
