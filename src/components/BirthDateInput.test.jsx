// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import BirthDateInput from './BirthDateInput.jsx'

function setup(props = {}) {
  const onChange = vi.fn()
  const utils = render(
    <I18nProvider>
      <BirthDateInput value="" onChange={onChange} {...props} />
    </I18nProvider>
  )
  const [day, month, year] = utils.container.querySelectorAll('.dob-field__part')
  return { ...utils, onChange, day, month, year }
}

describe('BirthDateInput', () => {
  it('собирает ISO только когда дата набрана целиком', () => {
    const { onChange, day, month, year } = setup()
    fireEvent.change(day, { target: { value: '21' } })
    fireEvent.change(month, { target: { value: '03' } })
    expect(onChange).toHaveBeenLastCalledWith('')
    fireEvent.change(year, { target: { value: '1998' } })
    expect(onChange).toHaveBeenLastCalledWith('1998-03-21')
  })

  it('дополняет одиночные цифры нулём', () => {
    const { onChange, day, month, year } = setup()
    fireEvent.change(day, { target: { value: '5' } })
    fireEvent.change(month, { target: { value: '7' } })
    fireEvent.change(year, { target: { value: '2001' } })
    expect(onChange).toHaveBeenLastCalledWith('2001-07-05')
  })

  it('переводит фокус, когда поле заполнено', () => {
    const { day, month, year } = setup()
    day.focus()
    fireEvent.change(day, { target: { value: '21' } })
    expect(document.activeElement).toBe(month)
    fireEvent.change(month, { target: { value: '03' } })
    expect(document.activeElement).toBe(year)
  })

  it('одна цифра фокус не уводит', () => {
    const { day, month } = setup()
    day.focus()
    fireEvent.change(day, { target: { value: '2' } })
    expect(document.activeElement).not.toBe(month)
  })

  it('выкидывает не-цифры и лишние символы', () => {
    const { day, year } = setup()
    fireEvent.change(day, { target: { value: 'a1b2c3' } })
    expect(day.value).toBe('12')
    fireEvent.change(year, { target: { value: '19988' } })
    expect(year.value).toBe('1998')
  })

  // Регрессия: maxLength резал хвост, пока фокус переезжал в следующее поле,
  // и у быстро печатающего от «21031998» оставалось «21».
  it('очередь цифр раскладывается по трём полям', () => {
    const { onChange, day, month, year } = setup()
    fireEvent.change(day, { target: { value: '21031998' } })
    expect([day.value, month.value, year.value]).toEqual(['21', '03', '1998'])
    expect(onChange).toHaveBeenLastCalledWith('1998-03-21')
  })

  it('вставка даты с точками разбирается так же', () => {
    const { onChange, day, month, year } = setup()
    fireEvent.change(day, { target: { value: '21.03.1998' } })
    expect([day.value, month.value, year.value]).toEqual(['21', '03', '1998'])
    expect(onChange).toHaveBeenLastCalledWith('1998-03-21')
  })

  it('Backspace в пустом поле возвращает к предыдущему', () => {
    const { day, month } = setup()
    month.focus()
    fireEvent.keyDown(month, { key: 'Backspace' })
    expect(document.activeElement).toBe(day)
  })

  it('раскладывает дату, пришедшую снаружи', () => {
    const { day, month, year } = setup({ value: '1990-12-31' })
    expect([day.value, month.value, year.value]).toEqual(['31', '12', '1990'])
  })

  it('выбор в системном календаре заполняет три поля', () => {
    const { container, onChange, day, month, year } = setup()
    const native = container.querySelector('input[type="date"]')
    fireEvent.change(native, { target: { value: '2004-06-09' } })
    expect(onChange).toHaveBeenLastCalledWith('2004-06-09')
    expect([day.value, month.value, year.value]).toEqual(['09', '06', '2004'])
  })

  it('кнопка календаря зовёт системный пикер', () => {
    const { container } = setup()
    const native = container.querySelector('input[type="date"]')
    native.showPicker = vi.fn()
    fireEvent.click(container.querySelector('.dob-field__picker'))
    expect(native.showPicker).toHaveBeenCalled()
  })
})
