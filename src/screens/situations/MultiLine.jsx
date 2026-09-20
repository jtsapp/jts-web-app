'use client'

import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'

// Строка материала: английский текст плюс переводы по кнопкам KZ и RU.
//
// Переводы скрыты намеренно (так же было в прототипе): смысл упражнения в том,
// чтобы студент сначала попробовал понять по-английски, а подсказку открыл,
// когда не вышло. Показывать сразу — значит читать русский текст и не глядеть
// на английский.
//
// Оба языка доступны всегда, независимо от языка интерфейса: половина
// студентов читает по-русски, но проверяет себя по-казахски.
export default function MultiLine({ data, prefix = '', main = false, className = '' }) {
  const { t } = useI18n()
  const [open, setOpen] = useState({ kz: false, ru: false })
  if (!data) return null

  const toggle = (lang) => setOpen((prev) => ({ ...prev, [lang]: !prev[lang] }))

  return (
    <div className={`sit-ml ${className}`}>
      <div className="sit-ml__main">
        {prefix && <span className="sit-ml__num">{prefix}</span>}
        <span className={main ? 'sit-ml__title' : ''}>{data.en}</span>
        <span className="sit-ml__toggles">
          {['kz', 'ru'].map((lang) => (
            <button
              key={lang}
              type="button"
              className={`sit-ml__toggle${open[lang] ? ' is-on' : ''}`}
              aria-pressed={open[lang]}
              aria-label={t(`situations.translate.${lang}`)}
              onClick={() => toggle(lang)}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </span>
      </div>
      {open.kz && (
        <div className="sit-ml__tr">
          <span className="sit-ml__lab">ҚАЗАҚША</span>
          {data.kz}
        </div>
      )}
      {open.ru && (
        <div className="sit-ml__tr">
          <span className="sit-ml__lab">РУССКИЙ</span>
          {data.ru}
        </div>
      )}
    </div>
  )
}
