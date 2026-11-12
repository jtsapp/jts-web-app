import { useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { CATEGORY_KEY, DEFAULT_CATEGORY, ECAT, categories, emojisOf } from './emoji.js'

/**
 * Панель смайликов (прототип: вкладки категорий, заголовок, сетка 9 в ряд). После выбора не закрывается — смайлики
 * часто ставят по нескольку подряд; закрывают её кнопка смайлика в форме, Esc или фокус в поле ввода.
 */
export default function EmojiPanel({ recent, onPick, onClose }) {
  const { t } = useI18n()
  const tabs = categories(recent)
  const [chosen, setChosen] = useState(DEFAULT_CATEGORY)
  // «Недавние» могли опустеть или ещё не появиться — тогда открыты «Эмоции».
  const current = tabs.includes(chosen) ? chosen : DEFAULT_CATEGORY
  const label = (name) => t(`birge.emoji.cat.${CATEGORY_KEY[name]}`)

  return (
    <div
      className="brg-pop"
      role="dialog"
      aria-label={t('birge.compose.emoji')}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose?.()
      }}
    >
      <div className="brg-ecats" role="tablist">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={current === name}
            aria-label={label(name)}
            title={label(name)}
            className={current === name ? 'is-on' : ''}
            onClick={() => setChosen(name)}
          >
            {ECAT[name]}
          </button>
        ))}
      </div>
      <div className="brg-etitle">{label(current)}</div>
      <div className="brg-emo">
        {emojisOf(current, recent).map((emoji, i) => (
          <button
            key={`${current}-${i}`}
            type="button"
            // Кнопка не забирает фокус из поля: на телефоне иначе прыгала бы клавиатура на каждом смайлике.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
