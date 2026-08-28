import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { maxBirthDate, minBirthDate } from '../lib/birthDate.js'

// Три поля вместо одного <input type="date">: нативное поле заставляет
// набирать дату вслепую по маске «дд.мм.гггг» и без календаря не даёт понять,
// куда ты попал. Здесь день, месяц и год набираются руками (курсор сам
// перескакивает), а кнопка справа открывает тот же системный календарь —
// он живёт в спрятанном рядом type="date".

// Поля в порядке набора и сколько цифр держит каждое.
const ORDER = [
  ['day', 2],
  ['month', 2],
  ['year', 4],
]

// Наружу отдаём ISO 'yyyy-mm-dd' — формат бэкенда (birthDate) и правил
// проверки из lib/birthDate.js. Пока дата не набрана целиком, отдаём '',
// чтобы «Продолжить» не оживало на полпути.
function toIso({ day, month, year }) {
  if (!day || !month || year.length !== 4) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function fromIso(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  if (!m) return { day: '', month: '', year: '' }
  return { day: m[3], month: m[2], year: m[1] }
}

export default function BirthDateInput({ value, onChange, autoFocus = false, id }) {
  const { t } = useI18n()
  const [parts, setParts] = useState(() => fromIso(value))
  // Зеркало состояния: обработчики полей создаются на рендер, и при быстром
  // наборе следующая цифра приходит раньше, чем React перерисует компонент —
  // из замыкания там был бы вчерашний parts, и уже набранное затиралось бы.
  const partsRef = useRef(parts)
  const inputsRef = useRef([])
  const nativeRef = useRef(null)

  // Значение может прийти снаружи (профиль подтягивает дату из /user/me).
  // Свой же ISO обратно не разбираем — иначе набранный «5» превратился бы в
  // «05» под пальцами.
  useEffect(() => {
    if (value !== toIso(partsRef.current)) {
      const next = fromIso(value)
      partsRef.current = next
      setParts(next)
    }
  }, [value])

  function commit(next, focusIndex) {
    partsRef.current = next
    setParts(next)
    onChange?.(toIso(next))
    const el = focusIndex == null ? null : inputsRef.current[focusIndex]
    if (el) {
      el.focus()
      el.select?.()
    }
  }

  // Лишние цифры переливаются в следующие поля, а не отбрасываются: набранное
  // одной очередью «21031998» раскладывается на день/месяц/год, и то же самое
  // спасает вставку «21.03.1998» из буфера. Ограничения maxLength здесь нет
  // намеренно — оно резало цифры, пока фокус ещё не переехал, и хвост даты
  // пропадал у любого, кто печатает быстро.
  function handleChange(index, raw) {
    const typed = raw.replace(/\D/g, '')
    const next = { ...partsRef.current }
    let rest = typed
    let i = index
    do {
      const [key, max] = ORDER[i]
      next[key] = rest.slice(0, max)
      rest = rest.slice(max)
      i += 1
    } while (rest && i < ORDER.length)

    // Курсор уводим дальше, только когда текущее поле набрано целиком: иначе
    // правка одной цифры в середине выбрасывала бы из поля.
    const last = i - 1
    const lastFull = next[ORDER[last][0]].length === ORDER[last][1]
    const moved = last !== index
    const focusIndex = lastFull && last + 1 < ORDER.length ? last + 1 : moved ? last : null
    commit(next, lastFull || moved ? focusIndex : null)
  }

  // Backspace в пустом поле возвращает к предыдущему — иначе стирать набранное
  // приходится мышью.
  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !e.target.value && index > 0) {
      e.preventDefault()
      inputsRef.current[index - 1]?.focus()
    }
  }

  function openPicker() {
    const el = nativeRef.current
    if (!el) return
    // showPicker есть в Chrome/Edge/Firefox/Safari 16+; где его нет —
    // остаётся фокус, и мобильные браузеры открывают колесо сами.
    try {
      el.showPicker()
    } catch {
      el.focus()
    }
  }

  const fields = [
    { key: 'day', cls: 'day', autoComplete: 'bday-day', ph: 'dob.day', label: 'dob.dayLabel' },
    { key: 'month', cls: 'month', autoComplete: 'bday-month', ph: 'dob.month', label: 'dob.monthLabel' },
    { key: 'year', cls: 'year', autoComplete: 'bday-year', ph: 'dob.year', label: 'dob.yearLabel' },
  ]

  return (
    <div className="dob-field">
      {fields.map((f, index) => (
        <span key={f.key} className="dob-field__cell">
          {index > 0 && <span className="dob-field__sep">.</span>}
          <input
            ref={(el) => {
              inputsRef.current[index] = el
            }}
            id={index === 0 ? id : undefined}
            className={`dob-field__part dob-field__part--${f.cls}`}
            inputMode="numeric"
            autoComplete={f.autoComplete}
            autoFocus={index === 0 ? autoFocus : undefined}
            placeholder={t(f.ph)}
            aria-label={t(f.label)}
            value={parts[f.key]}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
          />
        </span>
      ))}

      <button
        type="button"
        className="dob-field__picker"
        onClick={openPicker}
        aria-label={t('dob.pick')}
        title={t('dob.pick')}
      >
        <CalendarIcon />
      </button>
      {/* Системный календарь. Не display:none — скрытое поле браузер не
          показывает и showPicker() на нём падает. */}
      <input
        ref={nativeRef}
        type="date"
        className="dob-field__native"
        tabIndex={-1}
        aria-hidden="true"
        max={maxBirthDate()}
        min={minBirthDate()}
        value={toIso(parts)}
        onChange={(e) => commit(fromIso(e.target.value), null)}
      />
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="4" width="15" height="13.5" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 8h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.5 2.5v3M13.5 2.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
