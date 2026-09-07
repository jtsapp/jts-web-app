'use client'

import { useI18n } from '../../../i18n.jsx'
import { useGrab, useZone, justDragged } from '../../workbook/dnd.js'

// Заполнение пропусков. Перетаскивание берём готовое из воркбука
// (screens/workbook/dnd.js): оно на pointer-событиях, поэтому работает и
// пальцем, в отличие от HTML5 drag прототипа. Тап-путь («тапнул пропуск,
// тапнул слово») остаётся — он же единственный доступный с клавиатуры.
export default function GapTask({ ex, index, st, onGap, onChip, res }) {
  const { t } = useI18n()
  const rows = res ? res.detail.rows : null
  // Свой kind на упражнение: иначе слово из одного задания падало бы в пропуск
  // соседнего.
  const kind = 'rd-gap-' + index

  return (
    <>
      <p className="rd-gaptext" lang="en">
        {st.parts.map((p, k) => {
          if (k % 2 === 0) return <span key={k}>{p}</span>
          // Номер пропуска выводим из позиции куска: нечётные куски и есть
          // пропуски (см. gapParts), поэтому счётчик по ходу рендера не нужен.
          const gi = (k - 1) / 2
          const r = rows ? rows[gi] : null
          return <Gap key={k} kind={kind} gi={gi} st={st} row={r} disabled={!!res} onGap={onGap} />
        })}
      </p>
      <div className="rd-bank" aria-label={t('reading.bank')}>
        <span className="rd-bank__label">{t('reading.bank')}</span>
        {st.bank.map((w, b) => (
          <Chip key={b} kind={kind} b={b} word={w} used={st.fill.includes(b)} disabled={!!res} onChip={onChip} />
        ))}
      </div>
    </>
  )
}

function Gap({ kind, gi, st, row, disabled, onGap }) {
  const ref = useZone(kind, (payload) => onChipToGap(payload, gi, onGap), disabled)
  const b = st.fill[gi]
  const cls = ['rd-gap']
  if (b !== null && b !== undefined) cls.push('is-filled')
  if (st.activeGap === gi) cls.push('is-active')
  if (row) cls.push(row.ok ? 'is-correct' : 'is-wrong')

  return (
    <button
      type="button"
      ref={ref}
      className={cls.join(' ')}
      disabled={disabled}
      aria-label={`gap ${gi + 1}`}
      onClick={() => {
        if (justDragged()) return
        onGap(gi)
      }}
    >
      {row && !row.ok ? (
        <>
          {row.given && <s>{row.given}</s>}
          {row.given ? ' ' : ''}
          <b>{row.answer}</b>
        </>
      ) : b === null || b === undefined ? (
        '____'
      ) : (
        st.bank[b]
      )}
    </button>
  )
}

function onChipToGap(payload, gi, onGap) {
  if (payload && typeof payload.b === 'number') onGap(gi, payload.b)
}

function Chip({ kind, b, word, used, disabled, onChip }) {
  const ref = useGrab(kind, { b }, disabled)
  return (
    <button
      type="button"
      ref={ref}
      className={`rd-chipw${used ? ' is-used' : ''}`}
      disabled={disabled}
      lang="en"
      onClick={() => {
        if (justDragged()) return
        onChip(b)
      }}
    >
      {word}
    </button>
  )
}

/**
 * Положить слово b в пропуск k — порт gapPlace (jtsreading.html:920). Если это
 * слово уже стояло в другом пропуске, оттуда оно уходит: банк не бесконечный,
 * и дубль означал бы, что одно слово закрыло два пропуска.
 */
export function gapPlace(st, k, b) {
  const fill = st.fill.slice()
  const prev = fill.indexOf(b)
  if (prev > -1) fill[prev] = null
  fill[k] = b
  const next = fill.indexOf(null)
  return { ...st, fill, activeGap: next > -1 ? next : null }
}

/** Тап по пропуску: занятый — освобождаем и делаем активным, пустой — выделяем. */
export function gapTap(st, k) {
  if (st.fill[k] !== null && st.fill[k] !== undefined) {
    const fill = st.fill.slice()
    fill[k] = null
    return { ...st, fill, activeGap: k }
  }
  return { ...st, activeGap: st.activeGap === k ? null : k }
}

/** Тап по слову банка: кладём в активный пропуск, иначе в первый свободный. */
export function chipTap(st, b) {
  const k = st.activeGap !== null && st.activeGap !== undefined ? st.activeGap : st.fill.indexOf(null)
  if (k === -1 || k === null || k === undefined) return st
  return gapPlace(st, k, b)
}
