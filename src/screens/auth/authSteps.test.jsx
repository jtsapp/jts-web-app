// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { MIN_AGE } from '../../lib/birthDate.js'
import { identityConflictField } from '../../api.js'
import NameStep from './NameStep.jsx'
import ContactsStep from './ContactsStep.jsx'
import CodeStep from './CodeStep.jsx'
import PasswordStep from './PasswordStep.jsx'
import { splitPhone, joinPhone } from './fields.jsx'
import { loginIdentifier } from './LoginScreens.jsx'

// Шаги регистрации по макету «Регистрация» (21.10.2026). Проверяем то, что
// ломает регистрацию молча: что уходит в onSubmit и когда форма его не зовёт.

function mount(Page, props = {}) {
  return render(
    <I18nProvider>
      <Page onSubmit={() => {}} {...props} />
    </I18nProvider>,
  )
}

function typeBirth(container, day, month, year) {
  const [d, m, y] = container.querySelectorAll('.dob-field__part')
  fireEvent.change(d, { target: { value: day } })
  fireEvent.change(m, { target: { value: month } })
  fireEvent.change(y, { target: { value: year } })
}

const submit = (container) => fireEvent.submit(container.querySelector('form'))

describe('«Давайте знакомиться»', () => {
  it('пустую форму не отправляет и показывает обе ошибки', () => {
    const onSubmit = vi.fn()
    const { container } = mount(NameStep, { onSubmit })
    submit(container)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.querySelectorAll('.rg-note--error')).toHaveLength(2)
  })

  it('отдаёт имя без пробелов по краям и дату в ISO', () => {
    const onSubmit = vi.fn()
    const { container } = mount(NameStep, { onSubmit })
    fireEvent.change(container.querySelector('#rg-name'), { target: { value: '  Анна ' } })
    typeBirth(container, '14', '03', '1998')
    submit(container)
    expect(onSubmit).toHaveBeenCalledWith('Анна', '1998-03-14')
  })

  it('младше порога — ошибка сразу, без нажатия', () => {
    const { container } = mount(NameStep)
    const young = new Date()
    young.setFullYear(young.getFullYear() - (MIN_AGE - 1))
    const iso = young.toISOString().slice(0, 10)
    typeBirth(container, iso.slice(8, 10), iso.slice(5, 7), iso.slice(0, 4))
    expect(container.querySelector('.rg-dob.is-invalid')).not.toBeNull()
  })

  it('«назад» есть только с обработчиком', () => {
    const onBack = vi.fn()
    const withBack = mount(NameStep, { onBack })
    fireEvent.click(withBack.container.querySelector('.rg-back'))
    expect(onBack).toHaveBeenCalled()
    withBack.unmount()
    expect(mount(NameStep).container.querySelector('.rg-back')).toBeNull()
  })
})

describe('«Как с вами связаться?»', () => {
  it('без почты и полного номера не отправляет', () => {
    const onSubmit = vi.fn()
    const { container } = mount(ContactsStep, { onSubmit })
    fireEvent.change(container.querySelector('#rg-email'), { target: { value: 'anna@' } })
    fireEvent.change(container.querySelector('#rg-phone'), { target: { value: '70012' } })
    submit(container)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.querySelectorAll('.rg-input.is-invalid')).toHaveLength(2)
  })

  it('отдаёт почту и номер в формате +7…', () => {
    const onSubmit = vi.fn()
    const { container } = mount(ContactsStep, { onSubmit })
    fireEvent.change(container.querySelector('#rg-email'), { target: { value: ' anna@mail.com ' } })
    fireEvent.change(container.querySelector('#rg-phone'), { target: { value: '8 700 000 45 67' } })
    submit(container)
    expect(onSubmit).toHaveBeenCalledWith('anna@mail.com', '+77000004567')
  })

  it('занятая почта — под полем почты, со ссылкой «Войти»', () => {
    const onLogin = vi.fn()
    const { container } = mount(ContactsStep, {
      onLogin,
      initialEmail: 'anna@mail.com',
      serverError: { field: 'email', text: 'Пользователь с такой почтой уже есть в системе' },
    })
    const fields = container.querySelectorAll('.rg-field')
    expect(fields[0].querySelector('.rg-note--error')).not.toBeNull()
    expect(fields[1].querySelector('.rg-note--error')).toBeNull()
    fireEvent.click(fields[0].querySelector('.rg-note--error button'))
    expect(onLogin).toHaveBeenCalled()
  })

  it('номер с лендинга уже вписан', () => {
    const { container } = mount(ContactsStep, { initialPhone: '+77001234567' })
    expect(container.querySelector('#rg-phone').value).toMatch(/700/)
  })
})

describe('код из письма', () => {
  it('проверяет сам после четвёртой цифры', () => {
    const onSubmit = vi.fn()
    const { container } = mount(CodeStep, { to: 'anna@mail.com', onSubmit })
    const cells = container.querySelectorAll('.rg-code__cell')
    ;['4', '8', '2', '7'].forEach((d, i) => fireEvent.change(cells[i], { target: { value: d } }))
    expect(onSubmit).toHaveBeenCalledWith('4827')
  })

  it('вставка кода целиком в первую ячейку', () => {
    const onSubmit = vi.fn()
    const { container } = mount(CodeStep, { to: 'anna@mail.com', onSubmit })
    fireEvent.change(container.querySelector('.rg-code__cell'), { target: { value: '1234' } })
    expect(onSubmit).toHaveBeenCalledWith('1234')
  })

  it('после ошибки новая цифра начинает код заново', () => {
    const onSubmit = vi.fn()
    const onEdit = vi.fn()
    const view = mount(CodeStep, { to: 'anna@mail.com', onSubmit, onEdit })
    const cells = () => view.container.querySelectorAll('.rg-code__cell')
    ;['4', '8', '2', '7'].forEach((d, i) => fireEvent.change(cells()[i], { target: { value: d } }))
    view.rerender(
      <I18nProvider>
        <CodeStep to="anna@mail.com" onSubmit={onSubmit} onEdit={onEdit} error="Неверный код" />
      </I18nProvider>,
    )
    expect(view.container.querySelector('.rg-code.is-invalid')).not.toBeNull()
    fireEvent.change(cells()[3], { target: { value: '5' } })
    expect(onEdit).toHaveBeenCalled()
    expect([...cells()].map((c) => c.value)).toEqual(['5', '', '', ''])
  })

  it('SMS-адресата пишет номером, а не цифрами подряд', () => {
    const { container } = mount(CodeStep, { to: '+77000004567' })
    expect(container.querySelector('.rg-to').textContent).toContain('+7 (700) 000-45-67')
  })
})

describe('пароль', () => {
  function fill(container, a, b) {
    fireEvent.change(container.querySelector('#rg-pass'), { target: { value: a } })
    fireEvent.change(container.querySelector('#rg-pass2'), { target: { value: b } })
  }

  it('короткий и несовпадающий не отправляет', () => {
    const onSubmit = vi.fn()
    const { container } = mount(PasswordStep, { onSubmit })
    fill(container, '12345', '12345')
    submit(container)
    fill(container, '1234567', '1234568')
    submit(container)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.querySelector('.rg-note--error')).not.toBeNull()
  })

  it('совпавший пароль от шести символов уходит', () => {
    const onSubmit = vi.fn()
    const { container } = mount(PasswordStep, { onSubmit })
    fill(container, 'secret1', 'secret1')
    submit(container)
    expect(onSubmit).toHaveBeenCalledWith('secret1')
  })

  it('глаз переключает видимость', () => {
    const { container } = mount(PasswordStep)
    const input = container.querySelector('#rg-pass')
    expect(input.type).toBe('password')
    fireEvent.click(container.querySelector('.rg-input__icon'))
    expect(input.type).toBe('text')
  })
})

describe('номер: разбор и сборка', () => {
  it('+7 — Казахстан, код не уходит в национальную часть', () => {
    const p = splitPhone('+77001234567')
    expect(p.country.iso).toBe('kz')
    expect(p.digits).toBe('7001234567')
    expect(joinPhone(p)).toBe('+77001234567')
  })

  it('длинный код страны не читается коротким', () => {
    expect(splitPhone('998901234567').country.iso).toBe('uz')
  })

  it('пусто — Казахстан и пустой номер', () => {
    expect(splitPhone('')).toMatchObject({ digits: '' })
  })
})

describe('что занято при регистрации', () => {
  it('различает почту и телефон по ответу бэкенда', () => {
    expect(identityConflictField(new Error('Пользователь с такой почтой уже есть в системе'))).toBe('email')
    expect(identityConflictField(new Error('Пользователь с таким телефоном уже есть в системе'))).toBe('phone')
    expect(identityConflictField(new Error('Этот пользователь уже есть в системе'))).toBeNull()
  })
})

describe('вход: телефон или почта', () => {
  it('десять цифр без кода — казахстанский номер', () => {
    expect(loginIdentifier('777 123 45 67')).toBe('+77771234567')
  })
  it('почту и номер с кодом не трогает', () => {
    expect(loginIdentifier(' Anna@Mail.com ')).toBe('Anna@Mail.com')
    expect(loginIdentifier('+998 90 123 45 67')).toBe('+998 90 123 45 67')
    expect(loginIdentifier('87771234567')).toBe('87771234567')
  })
})
