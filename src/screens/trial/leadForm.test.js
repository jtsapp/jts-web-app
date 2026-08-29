// Проверка заявки на консультацию — единственного коммерческого выхода
// пробного урока. Если она пропустит пустой телефон, лид уедет менеджеру без
// способа связаться; если завернёт нормальный — школа потеряет ученика на
// последнем шаге.
import { describe, it, expect } from 'vitest'
import { validateLead } from './TrialPlanScreen.jsx'

describe('заявка с пробного урока', () => {
  it('нормальные контакты проходят', () => {
    expect(validateLead({ name: 'Асель', phone: '+7 777 123 45 67' })).toBeNull()
    expect(validateLead({ name: 'A', phone: '87771234567' })).toBeNull()
  })

  it('без имени не отправляется', () => {
    expect(validateLead({ name: '', phone: '+77771234567' })).toBe('Укажите имя')
    expect(validateLead({ name: '   ', phone: '+77771234567' })).toBe('Укажите имя')
    expect(validateLead({ phone: '+77771234567' })).toBe('Укажите имя')
  })

  it('телефон короче шести цифр — не телефон', () => {
    expect(validateLead({ name: 'Асель', phone: '' })).toBe('Укажите телефон или WhatsApp')
    expect(validateLead({ name: 'Асель', phone: '12345' })).toBe('Укажите телефон или WhatsApp')
    expect(validateLead({ name: 'Асель', phone: '+7 (7)' })).toBe('Укажите телефон или WhatsApp')
  })

  // Ученик пишет номер как привык: со скобками, пробелами и дефисами.
  it('разделители в номере не мешают', () => {
    expect(validateLead({ name: 'Асель', phone: '+7 (777) 123-45-67' })).toBeNull()
  })
})
