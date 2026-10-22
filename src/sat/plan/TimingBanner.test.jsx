// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import TimingBanner, { nearestFitDate } from './TimingBanner.jsx'
import { I18nProvider } from '../../i18n.jsx'

afterEach(cleanup)
const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>)

const DATES = [{ testDate: '2026-12-05' }, { testDate: '2027-03-13' }, { testDate: '2027-05-01' }]

/** Баннер о сроках (ТЗ 21.10, задача 4): пример ТЗ — 5 недель до экзамена, нужно 8, не успеют 9 занятий. */
describe('баннер сроков SAT', () => {
  it('нехватка времени — цифры, три решения и связь с менеджером', () => {
    const onManager = vi.fn()
    const { container, getByRole } = wrap(<TimingBanner onManager={onManager} timing={{
      status: 'short', weeksLeft: 5, weeksNeeded: 8, lessonsCut: 9, earliestExam: '2027-01-01',
    }} />)
    const text = container.textContent
    expect(text).toContain('До экзамена 5 нед.')
    expect(text).toContain('нужно 8')
    expect(text).toContain('9 занятий останутся непройденными')
    expect(container.querySelectorAll('li')).toHaveLength(3)
    fireEvent.click(getByRole('button', { name: 'Связаться с менеджером' }))
    expect(onManager).toHaveBeenCalled()
  })

  it('мало запаса — мягкое предупреждение без решений', () => {
    const { container } = wrap(<TimingBanner timing={{ status: 'tight', weeksLeft: 9, weeksNeeded: 8, lessonsCut: 0 }} />)
    expect(container.textContent).toContain('без права на пропуски')
    expect(container.querySelector('button')).toBeNull()
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
