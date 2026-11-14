// src/screens/chess/ResultDialog.jsx
'use client'

import { scoreFor } from '../../practice/chess/rating.js'

const HEADS = { 1: 'won', 0: 'lost', 0.5: 'draw' }

export default function ResultDialog({ t, snap, onRematch, onNew, onReview }) {
  const { outcome, ratingChange, playerColor } = snap
  const score = scoreFor(outcome.result, playerColor)
  return (
    <div className="ch-dialog" data-dialog="result" role="dialog" aria-modal="true" aria-label={t(HEADS[score])}>
      <div className="ch-dialog__card">
        <h2 className="ch-dialog__title" data-result={outcome.result}>{t(HEADS[score])}</h2>
        <p className="ch-dialog__note">{t(`reason.${outcome.reason}`)}</p>
        {ratingChange.rated
          ? <p className="ch-result__rating" data-rating={ratingChange.after}>{t('ratingChange', { before: ratingChange.before, after: ratingChange.after })}</p>
          : <p className="ch-result__rating" data-unrated>{t('unrated')}</p>}
        <div className="ch-dialog__actions ch-dialog__actions--stack">
          <button type="button" className="ch-btn ch-btn--main" data-act="rematch" onClick={onRematch}>{t('rematch')}</button>
          <button type="button" className="ch-btn" data-act="new" onClick={onNew}>{t('newGame')}</button>
          <button type="button" className="ch-btn ch-btn--ghost" data-act="review" onClick={onReview}>{t('review')}</button>
        </div>
      </div>
    </div>
  )
}
