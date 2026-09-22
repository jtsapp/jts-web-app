'use client'

// Панель набора: сколько заданий в подходе (5/10/20/30/50 или своё число) и
// «Новый случайный набор». Размер относится к СЛЕДУЮЩЕМУ набору — текущий не
// перекраивается на лету, об этом строка «Сейчас: N · Новый подход: M».
//
// Внутри свой стейт (режим селекта и введённое число), поэтому родитель ставит
// key={сложность}: у каждой сложности свой размер набора, и состояние должно
// пересобираться заново.

import { useRef, useState } from 'react'
import { COUNT_PRESETS, MAX_COUNT } from '../../practice/listenchoose/engine.js'

export default function LcSetup({ snap, t, onCount, onNewSet }) {
  const [mode, setMode] = useState(COUNT_PRESETS.includes(snap.count) ? String(snap.count) : 'custom')
  const [custom, setCustom] = useState(String(snap.count))
  const customRef = useRef(null)

  const raw = mode === 'custom' ? custom : mode
  const n = Number(raw)
  const valid = raw.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= MAX_COUNT

  return (
    <div className="lc-setup">
      <div className="lc-setup__left">
        <label htmlFor="lc-count">
          <span>{t('listenchoose.countLabel')}</span>
          <select
            id="lc-count"
            value={mode}
            onChange={(e) => {
              const v = e.target.value
              setMode(v)
              if (v === 'custom') {
                setCustom(String(snap.count))
                // Поле появляется только после рендера — фокус на следующий кадр.
                requestAnimationFrame(() => customRef.current?.focus())
              } else onCount(Number(v))
            }}
          >
            {COUNT_PRESETS.map((c) => (
              <option key={c} value={String(c)}>
                {c}
              </option>
            ))}
            <option value="custom">{t('listenchoose.customCount')}</option>
          </select>
        </label>
        {mode === 'custom' && (
          <label htmlFor="lc-custom" className="lc-setup__custom">
            <span className="lc-sr">{t('listenchoose.customCount')}</span>
            <input
              id="lc-custom"
              ref={customRef}
              type="number"
              min={1}
              max={MAX_COUNT}
              step={1}
              inputMode="numeric"
              value={custom}
              aria-label={`Number of questions, 1 to ${MAX_COUNT}`}
              aria-invalid={!valid}
              onChange={(e) => {
                setCustom(e.target.value)
                const v = Number(e.target.value)
                if (e.target.value.trim() !== '' && Number.isInteger(v) && v >= 1 && v <= MAX_COUNT) onCount(v)
              }}
            />
          </label>
        )}
        <p className="lc-note" role="status">
          {valid
            ? `${t('listenchoose.bankNote')} · ${t('listenchoose.currentSet')} ${snap.total}${n !== snap.total ? ` · ${t('listenchoose.countPending')} ${n}` : ''}`
            : t('listenchoose.countInvalid')}
        </p>
      </div>
      <div className="lc-setup__right">
        <button type="button" className="lc-primary" disabled={!valid} onClick={onNewSet}>
          {t('listenchoose.startSet')}
        </button>
      </div>
    </div>
  )
}
