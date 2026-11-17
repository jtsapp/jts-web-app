// src/screens/chess/NewGameDialog.jsx
'use client'

import { useState } from 'react'
import { MIN_BOT, MAX_BOT, BOT_STEP, clampBot, levelKey } from '../../practice/chess/strength.js'
import { TIME_OPTIONS } from '../../practice/chess/chessProgress.js'
import { Piece } from './pieces.jsx'

const COLORS = [['w', 'white'], ['b', 'black'], ['random', 'random']]

export default function NewGameDialog({ t, rating, defaults, engine, onPlay, onRetry, onClose }) {
  const [color, setColor] = useState(defaults.color || 'w')
  // По умолчанию соперник — ровня ученику.
  const [bot, setBot] = useState(clampBot(defaults.botRating ?? rating))
  const [time, setTime] = useState(TIME_OPTIONS.includes(defaults.time) ? defaults.time : 0)
  return (
    <div className="ch-dialog" data-dialog="new" role="dialog" aria-modal="true" aria-label={t('newGame')}>
      <div className="ch-dialog__card">
        <div className="ch-dialog__head">
          <Piece type="n" color="w" className="ch-dialog__ico" />
          <div>
            <h2 className="ch-dialog__title">{t('newGame')}</h2>
            <p className="ch-dialog__note" data-rating={rating}>{t('yourRating')}: <b>{rating}</b></p>
          </div>
        </div>

        <span className="ch-field__label">{t('playAs')}</span>
        <div className="ch-seg" role="radiogroup" aria-label={t('playAs')}>
          {COLORS.map(([value, key]) => (
            <button key={value} type="button" role="radio" aria-checked={color === value} data-color={value}
              className={`ch-seg__item ch-seg__item--side ${color === value ? 'is-on' : ''}`} onClick={() => setColor(value)}>
              <span className={`ch-side-pick ch-side-pick--${value}`} aria-hidden="true">
                {value === 'random'
                  ? <><Piece type="k" color="w" /><Piece type="k" color="b" /></>
                  : <Piece type="k" color={value} />}
              </span>
              {t(key)}
            </button>
          ))}
        </div>

        <label className="ch-field__label" htmlFor="ch-bot">{t('botRating')}</label>
        <div className="ch-level"><b data-bot-rating={bot}>{bot}</b><span>{t(`level.${levelKey(bot)}`)}</span></div>
        {/* Заливка дорожки до бегунка — переменной: у range нет общего для браузеров «левой части». */}
        <input id="ch-bot" className="ch-range" type="range" min={MIN_BOT} max={MAX_BOT} step={BOT_STEP} value={bot}
          style={{ '--fill': `${((bot - MIN_BOT) / (MAX_BOT - MIN_BOT)) * 100}%` }}
          onChange={(e) => setBot(clampBot(e.target.value))} />

        <span className="ch-field__label">{t('time')}</span>
        <div className="ch-seg ch-seg--time" role="radiogroup" aria-label={t('time')}>
          {TIME_OPTIONS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={time === m} data-time={m}
              className={`ch-seg__item ${time === m ? 'is-on' : ''}`} onClick={() => setTime(m)}>{m ? t('minutes', { n: m }) : t('noClock')}</button>
          ))}
        </div>

        {engine === 'failed' && (
          <p className="ch-dialog__error" role="alert">{t('engineFailed')} <button type="button" className="ch-link" data-act="retry" onClick={onRetry}>{t('retry')}</button></p>
        )}
        <div className="ch-dialog__actions">
          {onClose && <button type="button" className="ch-btn ch-btn--ghost" onClick={onClose}>{t('cancel')}</button>}
          <button type="button" className="ch-btn ch-btn--main" data-act="play" disabled={engine !== 'ready'} onClick={() => onPlay({ color, botRating: bot, time })}>
            {engine === 'loading' ? t('loadingEngine') : t('play')}
          </button>
        </div>
      </div>
    </div>
  )
}
