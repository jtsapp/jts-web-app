'use client'

// Два окна раздела: справка «Как заниматься» и увеличение картинки с
// перелистыванием. Нативный <dialog> + showModal: фокус, Esc и затемнение даёт
// браузер, а верхний слой (top layer) не зависит от transform у предков —
// position: fixed внутри анимированной обёртки экрана иначе уезжал бы на scrollY.

import { useEffect, useRef } from 'react'
import { imagePath } from '../../practice/listenchoose/data.js'

function LcDialog({ open, onClose, label, className, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`lc-dialog${className ? ` ${className}` : ''}`}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        // Клик по затемнению приходит в сам <dialog>: закрываем, только если он
        // пришёл вне рамки окна (внутри рамки target тоже dialog, когда клик
        // попал в его поля).
        if (e.target !== e.currentTarget) return
        const r = e.currentTarget.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose()
      }}
    >
      {children}
    </dialog>
  )
}

export function LcHelpDialog({ open, onClose, t }) {
  return (
    <LcDialog open={open} onClose={onClose} label={t('listenchoose.help')}>
      <h2>{t('listenchoose.help')}</h2>
      <p>{t('listenchoose.helpBody')}</p>
      <p>{t('listenchoose.keyboard')}</p>
      <p>{t('listenchoose.scoreHelp')}</p>
      <div className="lc-dialog__actions">
        <button type="button" className="lc-primary" onClick={onClose}>
          {t('listenchoose.close')}
        </button>
      </div>
    </LcDialog>
  )
}

/** index — позиция на экране (0–3) или null, когда окно закрыто. */
export function LcZoomDialog({ index, onIndex, onClose, question, options, order, t }) {
  const open = index != null && !!question
  const oi = open ? order[index] : 0
  return (
    <LcDialog open={open} onClose={onClose} label="Picture preview" className="lc-dialog--zoom">
      {open && <img src={imagePath(question.scene, oi, 512)} alt={options[oi]} lang="en" />}
      <div className="lc-dialog__actions">
        <span className="lc-dialog__label">
          {t('listenchoose.picture')} {open ? index + 1 : ''} / 4
        </span>
        <button type="button" className="lc-secondary" aria-label="Previous picture" onClick={() => onIndex((index + 3) % 4)}>
          ←
        </button>
        <button type="button" className="lc-secondary" aria-label="Next picture" onClick={() => onIndex((index + 1) % 4)}>
          →
        </button>
        <button type="button" className="lc-primary" onClick={onClose}>
          {t('listenchoose.close')}
        </button>
      </div>
    </LcDialog>
  )
}
