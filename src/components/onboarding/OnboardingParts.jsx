import { useState } from 'react'
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, InfoIcon, RadioOffIcon } from '../../ielts/icons.jsx'

// Кирпичи анкеты General English на «Главной» (спека 2026-10-12): карточка-ответ с радио, большая карточка с
// иллюстрацией и календарь месяца. Это копия кирпичей онбординга IELTS (IeltsOnboardingPage.jsx, дизайн «IELTS new»):
// макета у анкеты нет, она нарочно выглядит так же. Копия, а не общий модуль, — раздел IELTS не трогаем (решение
// владельца 12.10.2026), поэтому правки вида здесь до IELTS не доходят и наоборот.

export const Radio = ({ on }) => <span className="ih-obopt__radio">{on ? <CheckCircleIcon size={22} /> : <RadioOffIcon size={22} />}</span>

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Месяц календаря с понедельника (Figma 1.4). Прошедшие дни недоступны: дата — только будущая.
export function Calendar({ value, onChange, lang }) {
  const today = new Date(new Date().toDateString())
  const [month, setMonth] = useState(() => {
    const v = value ? new Date(`${value}T00:00:00`) : today
    return new Date(v.getFullYear(), v.getMonth(), 1)
  })
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const lead = (month.getDay() + 6) % 7
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  // «октябрь 2026 г.» из Intl → «Октябрь 2026», как в макете: месяц в именительном, без «г.»
  const monthName = new Intl.DateTimeFormat(loc, { month: 'long' }).format(month)
  const title = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${month.getFullYear()}`
  const wd = new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { weekday: 'short' })
  const monday = new Date(2024, 0, 1)
  return (
    <div className="ih-cal">
      <div className="ih-cal__head">
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="‹"><ChevronLeftIcon size={18} /></button>
        <b>{title}</b>
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="›"><ChevronRightIcon size={18} /></button>
      </div>
      <div className="ih-cal__grid">
        {Array.from({ length: 7 }, (_, i) => <span key={`w${i}`} className="ih-cal__wd">{wd.format(new Date(monday.getTime() + i * 86400000))}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = new Date(month.getFullYear(), month.getMonth(), i + 1)
          const v = iso(d)
          return (
            <button key={v} type="button" disabled={d < today} className={`ih-cal__day ${value === v ? 'is-on' : ''}`} onClick={() => onChange(v)}>{i + 1}</button>
          )
        })}
      </div>
    </div>
  )
}

export function Option({ on, title, hint, chip, icon, onClick, children }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={`ih-obopt ${on ? 'is-on' : ''}`} onClick={onClick}>
      {icon && <span className="ih-obopt__icon">{icon}</span>}
      <span className="ih-obopt__body">
        <b>{title}{chip && <span className="ih-chip ih-chip--violet ih-chip--sm"><span>{chip}</span></span>}</b>
        {hint && <span>{hint}</span>}
        {children}
      </span>
      <Radio on={on} />
    </button>
  )
}

// Большая карточка с иллюстрацией (Figma 1.1 — картинка слева сверху, 1.2 — по центру, с чипом и плашкой «что внутри»)
export function ImageCard({ on, img, title, hint, chip, note, big, onClick }) {
  return (
    <button type="button" role="radio" aria-checked={on} className={`ih-obcard ${big ? 'ih-obcard--big' : ''} ${on ? 'is-on' : ''}`} onClick={onClick}>
      <span className="ih-obcard__top">
        {!big && <img src={`/ielts/onboarding/${img}.webp`} alt="" width={96} height={96} />}
        {big && (chip ? <span className="ih-obcard__chip">{chip}</span> : <span />)}
        <Radio on={on} />
      </span>
      {big && <img className="ih-obcard__art" src={`/ielts/onboarding/${img}.webp`} alt="" width={168} height={168} />}
      <b className="ih-obcard__title">{title}</b>
      <span className="ih-obcard__hint">{hint}</span>
      {note && <span className="ih-obcard__note"><InfoIcon size={16} />{note}</span>}
    </button>
  )
}
