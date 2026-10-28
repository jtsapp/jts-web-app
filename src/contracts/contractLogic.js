// Чистая логика раздела «Договоры» (ТЗ кабинетов, 14а): состояние формы подписи, готовность к отправке и разбор кода.
// Без React и сети — чтобы накрыть тестом. Окончательную проверку делает сервер, здесь только подсказка на экране.

export const LEARNERS = ['SELF', 'CHILD', 'OTHER']

/** Форма из данных, которые подставил сервер (профиль и прошлый договор). Согласие всегда пустое: его ставит человек. */
export function formFrom(prefill, party) {
  const p = prefill || {}
  return {
    fullName: p.fullName || '',
    iin: p.iin || '',
    phone: p.phone || '',
    email: p.email || '',
    learner: p.learner || 'SELF',
    learnerName: p.learnerName || '',
    learnerIin: p.learnerIin || '',
    tariffVariant: p.tariffVariant || '',
    photoConsent: !!p.photoConsent,
    idNumber: p.idNumber || '',
    idIssuedBy: p.idIssuedBy || '',
    idIssuedAt: p.idIssuedAt || '',
    address: p.address || '',
    agreed: false,
    party,
  }
}

/** Только цифры ИИН, не больше двенадцати: буквы и пробелы из вставленного значения отбрасываются. */
export function cleanIin(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 12)
}

/** Код из SMS — четыре цифры. */
export function cleanCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 4)
}

export function codeReady(code) {
  return cleanCode(code).length === 4
}

/** Что ещё не заполнено: пустой список — форму можно отправлять за кодом. */
export function missingFields(form) {
  const missing = []
  if (!form.fullName.trim()) missing.push('fullName')
  if (cleanIin(form.iin).length !== 12) missing.push('iin')
  if (!form.phone.trim()) missing.push('phone')
  if (form.party === 'TEACHER') {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) missing.push('email')
    if (!form.idNumber.trim()) missing.push('idNumber')
    if (!form.idIssuedBy.trim()) missing.push('idIssuedBy')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.idIssuedAt.trim())) missing.push('idIssuedAt')
    if (!form.address.trim()) missing.push('address')
  } else if (form.learner !== 'SELF' && !form.learnerName.trim()) {
    missing.push('learnerName')
  }
  if(form.party !== 'TEACHER' && form.learner !== 'SELF' && cleanIin(form.learnerIin).length !== 12) missing.push('learnerIin')
  if(form.tariffVariants?.length && !form.tariffVariants.includes(form.tariffVariant)) missing.push('tariffVariant')
  if (!form.agreed) missing.push('agreed')
  return missing
}

/** Тело запроса кода: ровно то, что человек видел и подтвердил, без служебного поля `party`. */
export function requestBody(form) {
  const { party, tariffVariants, ...fields } = form
  return { ...fields, iin: cleanIin(form.iin), learnerIin:form.learner==='SELF'?'':cleanIin(form.learnerIin), fullName: form.fullName.trim(), learnerName: form.learner === 'SELF' ? '' : form.learnerName.trim() }
}

/** Договоры, которые человек может подписать сейчас: у них есть документ и статус «нужно подписать». */
export function signable(contract) {
  return !!contract && contract.canSign && contract.id != null
}

export function isOffer(contract) {
  return contract?.kind === 'OFFER'
}

/** Счётчик у пункта меню — сколько договоров ждут подписи. */
export function toSignCount(mine) {
  return Math.max(0, Number(mine?.toSign) || 0)
}

/** Сколько секунд осталось до нового кода; не меньше нуля. */
export function resendLeft(sentAtMs, nowMs, resendSeconds) {
  return Math.max(0, Math.ceil((sentAtMs + resendSeconds * 1000 - nowMs) / 1000))
}
