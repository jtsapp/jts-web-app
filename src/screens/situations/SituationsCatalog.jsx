'use client'

import { useI18n } from '../../i18n.jsx'

// Каталог уровня: десять сценариев карточками.
//
// Раньше уровень был одной длинной прокруткой с десятью раскрытыми
// сценариями (так рисовал прототип в iframe) — это десять <video> в DOM сразу.
// Каталог грузит один постер на карточку, а видео — только то, в которое
// студент вошёл.

// Заголовок берём на языке интерфейса. Казахский в данных лежит под 'kz', а
// язык интерфейса называется 'kk' (i18n.jsx) — без сопоставления казахский
// интерфейс молча получал русские названия.
export function pickLang(node, lang) {
  if (!node) return ''
  return node[lang] || (lang === 'kk' ? node.kz : '') || node.ru || node.en || ''
}

export default function SituationsCatalog({ level, items, done, onOpen, onBack }) {
  const { t, lang } = useI18n()
  const doneSet = new Set(done)
  const pct = items.length ? Math.round((doneSet.size / items.length) * 100) : 0

  return (
    <div className="sit-cat">
      <div className="sit-top">
        <button type="button" className="sit-back" onClick={onBack}>
          ← {t('situations.toPractice')}
        </button>
        <span className="sit-level">{level.toUpperCase()}</span>
      </div>

      <h1 className="sit-cat__title">{t('situations.title')}</h1>
      <p className="sit-cat__sub">{t('situations.catalogSub')}</p>

      <div className="sit-prog" aria-live="polite">
        <div className="sit-prog__top">
          <span>{t('situations.progress')}</span>
          <span className="sit-prog__count">
            <b>{doneSet.size}</b>/{items.length}
          </span>
        </div>
        <div className="sit-prog__bar">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="sit-grid">
        {items.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`sit-card${doneSet.has(s.id) ? ' is-done' : ''}`}
            onClick={() => onOpen(s.id)}
          >
            <span className="sit-card__thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.poster} alt="" loading="lazy" />
              <span className="sit-card__seq">{s.id}</span>
              {doneSet.has(s.id) && <span className="sit-card__check" aria-hidden="true">✓</span>}
            </span>
            <span className="sit-card__title">{pickLang(s.title, lang)}</span>
            <span className="sit-card__flag">
              {doneSet.has(s.id) ? t('situations.done') : t('situations.notYet')}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
