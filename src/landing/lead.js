// Заявка с формы лендинга «Получить консультацию».
//
// Публичной ручки для заявки без входа у бэкенда нет: `POST /mobile/leads`
// берёт имя и телефон из токена (см. createLead в src/api.js — открытая форма
// с чужим номером стала бы каналом спама), а `/trial/link/{token}/lead`
// живёт под ссылкой пробного урока. Поэтому пока заявка уходит менеджеру
// сообщением в WhatsApp — тот же номер поддержки, что у кнопок «написать
// менеджеру» в приложении. Появится ручка — меняется только TrialForm.submit.
import { normalizePhone } from '../api.js'
import { SUPPORT_WHATSAPP_URL } from '../lib/support.js'

// Десять цифр номера после кода страны из того, что сейчас в поле. Поле
// держит префикс «+7 (», поэтому его семёрка — код страны, а не начало
// номера. Вставленный целиком номер бывает и с восьмёркой: 8 747 163 41 18.
export function phoneDigits(raw) {
  const s = String(raw || '').trim()
  let d = s.replace(/\D/g, '')
  if (s.startsWith('+7')) d = d.slice(1)
  else if (d.length === 11 && /^[78]/.test(d)) d = d.slice(1)
  return d.slice(0, 10)
}

// «+7 (747) 163-41-18». Разделитель дописывается только перед следующей
// цифрой: допиши мы «)» сразу после третьей, Backspace упирался бы в скобку —
// стёртая скобка тут же возвращалась бы маской.
export function formatPhone(digits) {
  const d = String(digits || '').replace(/\D/g, '').slice(0, 10)
  let s = '+7 (' + d.slice(0, 3)
  if (d.length > 3) s += ') ' + d.slice(3, 6)
  if (d.length > 6) s += '-' + d.slice(6, 8)
  if (d.length > 8) s += '-' + d.slice(8, 10)
  return s
}

export function isPhoneComplete(digits) {
  return String(digits || '').length === 10
}

export function buildLeadMessage(template, { name, digits, goal }) {
  return template
    .replace('{name}', String(name || '').trim())
    .replace('{phone}', formatPhone(digits))
    .replace('{goal}', goal || '—')
}

// Номер — в формате бэкенда (7XXXXXXXXXX): появится ручка — менять формат не
// придётся.
export function leadPayload({ name, digits, goal }) {
  return { name: String(name || '').trim(), phone: normalizePhone('7' + digits), goal }
}

export function leadWhatsappUrl(message) {
  return `${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(message)}`
}
