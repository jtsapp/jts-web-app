// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { GoalPicker } from './chapters.jsx'

afterEach(cleanup)

const mount = (onChange = () => {}) => render(<I18nProvider><GoalPicker rw={680} math={690} onChange={onChange} /></I18nProvider>)
const chip = (r, name) => r.getAllByRole('radio').find((b) => b.textContent === name)
const row = (r, name) => [...r.container.querySelectorAll('.st-college')].find((el) => el.querySelector('b')?.textContent === name)

// Решения SAT, «1. Данные вузов»: каждый вуз — по своему типу, страны не ранжируются вместе.
describe('глава 3 — вузы по типу балла и по странам', () => {
  it('чипы — Все · США · Великобритания · Казахстан · Южная Корея; во «Все» — группы в том же порядке', () => {
    const r = mount()
    expect(r.getAllByRole('radio').map((b) => b.textContent)).toEqual(['Все', 'США', 'Великобритания', 'Казахстан', 'Южная Корея'])
    expect([...r.container.querySelectorAll('.st-colleges__head b')].map((b) => b.textContent)).toEqual(['США', 'Великобритания', 'Казахстан', 'Южная Корея'])
    expect(r.container.textContent).not.toMatch(/sat\.(goal|country)\./)
  })

  it('Британия — «минимум N» с доп. требованием, без диапазона до 1600', () => {
    const r = mount()
    fireEvent.click(chip(r, 'Великобритания'))
    const imp = row(r, 'Imperial College London')
    expect(imp.textContent).toContain('минимум 1460')
    expect(imp.textContent).toContain('на STEM 1480')
    expect(imp.textContent).toContain('только вместе с AP')
    expect(imp.textContent).not.toMatch(/1460–1600/)
    expect(imp.querySelector('.st-range')).toBeNull()
    expect(imp.querySelector('.st-mark')).not.toBeNull()
    expect(row(r, 'University of Warwick').textContent).toContain('только как GCSE')
    // 1370: проходят Warwick 1340, Edinburgh и Manchester 1290, KCL 1230
    expect(r.container.querySelector('.st-goal__reach').textContent).toBe('4 из 6 в досягаемости')
  })

  it('Корея — «балл не публикуется», без счётчика и без кнопки цели', () => {
    const r = mount()
    fireEvent.click(chip(r, 'Южная Корея'))
    const kaist = row(r, 'KAIST')
    expect(kaist.textContent).toContain('Балл не публикуется')
    expect(kaist.textContent).toContain('strongly recommended')
    expect(r.container.querySelector('.st-goal__reach')).toBeNull()
    expect(r.container.querySelector('.st-college__use')).toBeNull()
  })

  it('Harvard — «Total не публикует» и секции; Nazarbayev — ориентир, не диапазон', () => {
    const r = mount()
    fireEvent.click(chip(r, 'США'))
    fireEvent.click(r.getByText(/Показать ещё/))
    const harvard = row(r, 'Harvard University')
    expect(harvard.textContent).toContain('Total не публикует')
    expect(harvard.textContent).toContain('EBRW 720–770 · Math 730–790')
    expect(row(r, 'University of Michigan').textContent).toContain('SAT прислали 55% зачисленных')
    fireEvent.click(chip(r, 'Казахстан'))
    expect(row(r, 'Nazarbayev University').textContent).toContain('1400+ · ориентир')
  })

  it('«Цель N» подставляет верхнюю границу middle-50%', () => {
    const onChange = vi.fn()
    const r = mount(onChange)
    fireEvent.click(chip(r, 'США'))
    fireEvent.click(within(row(r, 'University of Michigan')).getByRole('button'))
    expect(onChange).toHaveBeenCalledWith({ rw: 760, math: 770 })
  })
})
