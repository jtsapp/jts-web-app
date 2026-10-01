'use client'

// Форма «Получить консультацию». Куда уходит заявка и почему пока в
// WhatsApp — см. шапку lead.js.
import { useState } from 'react'
import { buildLeadMessage, formatPhone, isPhoneComplete, leadWhatsappUrl, phoneDigits } from './lead.js'

export default function TrialForm({ f, privacyUrl, mascot, icons }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [goal, setGoal] = useState(f.goals[0])
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const digits = phoneDigits(phone)

  const onPhone = (e) => {
    setPhone(formatPhone(phoneDigits(e.target.value)))
    if (errors.phone) setErrors((x) => ({ ...x, phone: null }))
  }

  const submit = (e) => {
    e.preventDefault()
    const next = {
      name: name.trim() ? null : f.errName,
      phone: isPhoneComplete(digits) ? null : f.errPhone,
    }
    setErrors(next)
    if (next.name || next.phone) return
    const message = buildLeadMessage(f.message, { name, digits, goal })
    window.open(leadWhatsappUrl(message), '_blank', 'noopener,noreferrer')
    setSent(true)
  }

  return (
    <form className="ld-form" onSubmit={submit} noValidate>
      <img className="ld-form__mascot" src={mascot} width="150" height="150" alt="" aria-hidden="true" />
      <h3 className="ld-form__title">{f.title}</h3>

      <label className="ld-field">
        <span className="ld-field__label">{f.nameLabel}</span>
        <span className={'ld-field__box' + (errors.name ? ' is-error' : '')}>
          <img src={icons.person} width="20" height="20" alt="" />
          <input
            type="text"
            name="name"
            autoComplete="given-name"
            placeholder={f.namePlaceholder}
            value={name}
            aria-invalid={!!errors.name}
            onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((x) => ({ ...x, name: null })) }}
          />
        </span>
        {errors.name && <span className="ld-field__error">{errors.name}</span>}
      </label>

      <label className="ld-field">
        <span className="ld-field__label">{f.phoneLabel}</span>
        <span className={'ld-field__box' + (errors.phone ? ' is-error' : '')}>
          <img src={icons.phone} width="20" height="20" alt="" />
          <input
            type="tel"
            name="phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder={f.phonePlaceholder}
            value={phone}
            aria-invalid={!!errors.phone}
            onFocus={() => { if (!phone) setPhone(formatPhone('')) }}
            onBlur={() => { if (!digits) setPhone('') }}
            onChange={onPhone}
          />
        </span>
        {errors.phone && <span className="ld-field__error">{errors.phone}</span>}
      </label>

      <fieldset className="ld-field ld-goals">
        <legend className="ld-field__label">{f.goalLabel}</legend>
        <div className="ld-goals__list">
          {f.goals.map((g) => (
            <label key={g} className={'ld-goal' + (g === goal ? ' is-on' : '')}>
              <input type="radio" name="goal" value={g} checked={g === goal} onChange={() => setGoal(g)} />
              {g}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="ld-cta ld-cta--form">
        <span>{f.submit}</span>
        <span className="ld-cta__arrow"><img src={icons.arrow} width="18" height="18" alt="" /></span>
      </button>
      {sent
        ? <p className="ld-form__note ld-form__note--ok" role="status">{f.sent}</p>
        : <p className="ld-form__note"><a href={privacyUrl} target="_blank" rel="noopener noreferrer">{f.consent}</a></p>}
    </form>
  )
}
