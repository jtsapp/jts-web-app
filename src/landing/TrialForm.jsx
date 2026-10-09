'use client'

// Форма «Получить консультацию». Заявка уходит на свой роут
// (/api/landing/lead → бэкенд → amoCRM), а человек сразу переходит в
// регистрацию приложения на шаг почты: имя и номер он уже дал здесь, роут
// возвращает готовый адрес перехода.
import { useState } from 'react'
import { formatPhone, isPhoneComplete, phoneDigits } from './lead.js'
import { pickUtm } from '../lib/attribution.js'

export default function TrialForm({ f, lang, privacyUrl, mascot, icons }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [goal, setGoal] = useState(f.goals[0])
  // Ловушка для ботов: поле есть в разметке, но человеку его не видно.
  const [website, setWebsite] = useState('')
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent | error | too_many

  const digits = phoneDigits(phone)

  const onPhone = (e) => {
    setPhone(formatPhone(phoneDigits(e.target.value)))
    if (errors.phone) setErrors((x) => ({ ...x, phone: null }))
  }
  // Вставка — номер целиком. Без своего разбора он дописывался бы к уже
  // стоящему «+7 (», и «+77471634118» или «87471634118» превращались бы в
  // неверные десять цифр, которые к тому же проходят проверку.
  const onPhonePaste = (e) => {
    const text = e.clipboardData?.getData('text')
    if (!text) return
    e.preventDefault()
    setPhone(formatPhone(phoneDigits(text)))
    if (errors.phone) setErrors((x) => ({ ...x, phone: null }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (status === 'sending' || status === 'sent') return
    const next = {
      // Не короче двух букв — как требует регистрация, куда имя уйдёт дальше.
      name: name.trim().length >= 2 ? null : f.errName,
      phone: isPhoneComplete(digits) ? null : f.errPhone,
    }
    setErrors(next)
    if (next.name || next.phone) return
    setStatus('sending')
    try {
      const res = await fetch('/api/landing/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Метки рекламы из адреса лендинга — в сделку amoCRM (src/lib/attribution.js).
        body: JSON.stringify({
          name: name.trim(), phone: digits, goal, lang, website,
          utm: pickUtm(new URLSearchParams(window.location.search)),
        }),
      })
      if (res.status === 429) return setStatus('too_many')
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) return setStatus('error')
      setStatus('sent')
      // Ловушка сработала — адреса нет, бот остаётся на «принято».
      if (data.redirect) window.location.assign(data.redirect)
    } catch {
      setStatus('error')
    }
  }

  const note = {
    sending: f.sending,
    sent: f.sent,
    error: f.errSend,
    too_many: f.errTooMany,
  }[status]

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
            maxLength={100}
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
            onPaste={onPhonePaste}
          />
        </span>
        {errors.phone && <span className="ld-field__error">{errors.phone}</span>}
      </label>

      <input
        className="ld-form__trap"
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />

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

      <button type="submit" className="ld-cta ld-cta--form" disabled={status === 'sending' || status === 'sent'}>
        <span>{status === 'sending' ? f.sending : f.submit}</span>
        <span className="ld-cta__arrow"><img src={icons.arrow} width="18" height="18" alt="" /></span>
      </button>
      {note
        ? <p className={'ld-form__note' + (status === 'sent' ? ' ld-form__note--ok' : status === 'sending' ? '' : ' ld-form__note--err')} role="status">{note}</p>
        : <p className="ld-form__note"><a href={privacyUrl} target="_blank" rel="noopener noreferrer">{f.consent}</a></p>}
    </form>
  )
}
