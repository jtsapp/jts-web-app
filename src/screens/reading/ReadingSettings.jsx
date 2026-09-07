'use client'

import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n.jsx'
import { FONT_SIZES, LINE_HEIGHTS, WIDTHS } from '../../practice/reading/viewSettings.js'

// Панель типографики (renderDrawer прототипа, :690). Тумблера тёмной темы тут
// нет намеренно: тема в приложении общая и переключается в профиле, а вторая
// кнопка «тёмный режим» внутри раздела рассинхронизировала бы её с остальными
// экранами.
export default function ReadingSettings({ view, onChange, onClose }) {
  const { t } = useI18n()
  const ref = useRef(null)

  useEffect(() => {
    const first = ref.current && ref.current.querySelector('button')
    if (first) first.focus()
    const esc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const seg = (label, values, cur, field, render) => (
    <div className="rd-set">
      <span className="rd-set__lbl">{label}</span>
      <div className="rd-seg" role="group" aria-label={label}>
        {values.map((v) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={String(v) === String(cur)}
            onClick={() => onChange({ ...view, [field]: v })}
          >
            {render(v)}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <div className="rd-backdrop" onClick={onClose} />
      <aside className="rd-drawer" role="dialog" aria-modal="true" aria-labelledby="rd-drawer-title" ref={ref}>
        <div className="rd-drawer__head">
          <h2 id="rd-drawer-title">⚙ {t('reading.settings.title')}</h2>
          <button type="button" className="rd-tb__btn" onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>

        {seg(t('reading.settings.fontSize'), FONT_SIZES, view.fs, 'fs', (v) =>
          v === 16 ? 'A−' : v === 20 ? 'A' : v === 24 ? 'A+' : 'A++',
        )}
        {seg(t('reading.settings.lineHeight'), LINE_HEIGHTS, view.lh, 'lh', (v) => v.toFixed(1))}
        {seg(t('reading.settings.width'), WIDTHS, view.width, 'width', (v) =>
          t(v === 'narrow' ? 'reading.settings.narrow' : 'reading.settings.normal'),
        )}

        <button
          type="button"
          className="rd-switch"
          role="switch"
          aria-checked={view.dys}
          onClick={() => onChange({ ...view, dys: !view.dys })}
        >
          <span>🔤 {t('reading.settings.dys')}</span>
          <span className="rd-switch__knob" />
        </button>

        <div className="rd-preview" lang="en">{t('reading.settings.preview')}</div>
      </aside>
    </>
  )
}
