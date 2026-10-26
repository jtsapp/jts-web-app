import { useState } from 'react'
import { INTEREST_CATS, interestLabel, toggleInterest } from './interests.js'
import { useMatchingT } from './texts.js'

// Интересы — до 5, шесть категорий-аккордеонов (ТЗ §2.4): выбранные сверху чипами с «✕», у категории счётчик.
// Один и тот же выбор в мастере и в профиле — значения уходят на сервер русскими названиями (interests.js).
export default function InterestsPicker({ value, onChange, onLimit, hint }) {
  const { t, lang } = useMatchingT()
  const [open, setOpen] = useState(0)
  const toggle = (item) => {
    const next = toggleInterest(value, item)
    if (next.error === 'limit') onLimit?.()
    else onChange(next.list)
  }
  return (
    <div className="mt-stack mt-stack--tight">
      {value.length ? (
        <div className="mt-selrow">
          {value.map((item) => (
            <button key={item} type="button" onClick={() => toggle(item)} aria-label={t('interests.remove', { name: interestLabel(lang, item) })}>
              {interestLabel(lang, item)} ✕
            </button>
          ))}
        </div>
      ) : (
        hint && <p className="mt-tiny">{hint}</p>
      )}
      {INTEREST_CATS.map((cat, i) => {
        const picked = cat.items.filter((x) => value.includes(x)).length
        return (
          <details
            key={cat.id}
            className="mt-cat"
            open={open === i}
            onToggle={(e) => {
              if (e.currentTarget.open) setOpen(i)
              else if (open === i) setOpen(-1)
            }}
          >
            <summary>
              <span>
                {t('cat.' + cat.id)} {picked > 0 && <span className="mt-pill">{picked}</span>}
              </span>
            </summary>
            <div className="mt-chips">
              {cat.items.map((item) => (
                <button key={item} type="button" className="mt-chip" aria-pressed={value.includes(item)} onClick={() => toggle(item)}>
                  {interestLabel(lang, item)}
                </button>
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}
