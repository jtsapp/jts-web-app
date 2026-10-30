// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import TimingBanner, { nearestFitDate } from './TimingBanner.jsx'
import { I18nProvider } from '../../i18n.jsx'

afterEach(cleanup)
beforeEach(() => window.localStorage.clear())
const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>)

const DATES = [{ testDate: '2026-12-05' }, { testDate: '2027-03-13' }, { testDate: '2027-05-01' }]
const SHORT = { status: 'short', weeksLeft: 5, weeksNeeded: 8, lessonsCut: 9, earliestExam: '2027-01-01' }

/** Баннер о сроках (ТЗ 21.10, задача 4; Figma «NEW 2», 17:5933): пример ТЗ — 5 недель до экзамена, нужно 8, не успеют 9 занятий. */
describe('баннер сроков SAT', () => {
  it('нехватка времени, первый показ — цифры, три решения и связь с менеджером', () => {
    const onManager = vi.fn()
    const { container, getByRole } = wrap(<TimingBanner onManager={onManager} timing={SHORT} />)
    const text = container.textContent
    expect(text).toContain('нужно 8 недель — до экзамена 5')
    expect(text).toContain('9 занятий останутся непройденными')
    expect(container.querySelectorAll('.st-timing__opts li')).toHaveLength(3)
    fireEvent.click(getByRole('button', { name: 'Связаться с менеджером' }))
    expect(onManager).toHaveBeenCalled()
  })

  it('× сворачивает в строку, «Что можно сделать» раскрывает обратно', () => {
    const { container, getByRole } = wrap(<TimingBanner timing={SHORT} onManager={() => {}} />)
    fireEvent.click(getByRole('button', { name: 'Свернуть' }))
    expect(container.querySelector('.st-timing.is-line').textContent).toContain('До экзамена 5 недель, для полной программы нужно 8 · 9 занятий')
    fireEvent.click(getByRole('button', { name: /Что можно сделать/ }))
    expect(container.querySelector('.st-timing.is-short')).not.toBeNull()
  })

  it('повторный заход — сразу строка, но баннер не пропадает', () => {
    wrap(<TimingBanner timing={SHORT} />)
    cleanup()
    const { container } = wrap(<TimingBanner timing={SHORT} />)
    expect(container.querySelector('.st-timing.is-line')).not.toBeNull()
    expect(container.querySelector('.st-timing.is-short')).toBeNull()
  })

  it('мало запаса — мягкая плашка и «Подробнее» в план', () => {
    const onPlan = vi.fn()
    const { container, getByRole } = wrap(<TimingBanner onPlan={onPlan} timing={{ status: 'tight', weeksLeft: 11, weeksNeeded: 10, lessonsCut: 0 }} />)
    expect(container.textContent).toContain('До экзамена 11 недель, программе нужно 10')
    expect(container.textContent).toContain('без права на пропуски')
    fireEvent.click(getByRole('button', { name: 'Подробнее' }))
    expect(onPlan).toHaveBeenCalled()
  })

  it('времени хватает или даты нет — баннера нет', () => {
    expect(wrap(<TimingBanner timing={{ status: 'ok' }} />).container.textContent).toBe('')
    cleanup()
    expect(wrap(<TimingBanner timing={{ status: 'none' }} />).container.textContent).toBe('')
  })

  it('ближайшая официальная дата, к которой программа успевает', () => {
    expect(nearestFitDate('2027-01-01', DATES)).toBe('2027-03-13')
    expect(nearestFitDate('2027-06-01', DATES)).toBeNull()
  })
})
