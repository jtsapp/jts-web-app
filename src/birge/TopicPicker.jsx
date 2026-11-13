import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { TOPICS } from './labels.js'

/**
 * Тема ветки рядом с именем («Айгерім › Вопрос ⌄», ТЗ §3.2). Своё меню, а не <select>: системный список на Windows
 * рисовался квадратной коробкой с серой рамкой и синей строкой поверх карточки (жалоба владельца 12.11.2026), а стилями
 * его выпадающую часть не перекрасить. Клавиатура как у списка: стрелки, Home/End, Enter/пробел — выбрать, Esc — закрыть.
 */
export default function TopicPicker({ value, disabled, onChange }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const itemsRef = useRef([])
  const label = (key) => t(`birge.topic.${key}`)

  // Форма занята публикацией — меню не висит открытым над шагами проверки.
  const shown = open && !disabled

  useEffect(() => {
    if (!shown) return undefined
    const away = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [shown])

  useEffect(() => {
    if (shown) itemsRef.current[active]?.focus()
  }, [shown, active])

  const show = () => {
    setActive(Math.max(0, TOPICS.indexOf(value)))
    setOpen(true)
  }
  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }
  const choose = (key) => {
    onChange(key)
    close()
  }

  const onListKey = (e) => {
    const last = TOPICS.length - 1
    const moves = { ArrowDown: Math.min(last, active + 1), ArrowUp: Math.max(0, active - 1), Home: 0, End: last }
    if (e.key in moves) {
      e.preventDefault()
      setActive(moves[e.key])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(TOPICS[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <span className="brg-tpick" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`brg-tpick__btn${shown ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={shown}
        aria-label={`${t('birge.compose.topic')}: ${label(value)}`}
        disabled={disabled}
        onClick={() => (shown ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            show()
          }
        }}
      >
        {label(value)}
        <svg className="brg-tpick__chev" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {shown && (
        <ul className="brg-tpick__list" role="listbox" aria-label={t('birge.compose.topic')} onKeyDown={onListKey}>
          {TOPICS.map((key, i) => (
            <li
              key={key}
              ref={(el) => {
                itemsRef.current[i] = el
              }}
              role="option"
              tabIndex={-1}
              aria-selected={key === value}
              className={`brg-tpick__opt${key === value ? ' is-on' : ''}${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(key)}
            >
              {label(key)}
            </li>
          ))}
        </ul>
      )}
    </span>
  )
}
