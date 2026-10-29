// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, fireEvent, screen, within } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import OfferCatalog from './OfferCatalog.jsx'

const offers = [
  { code: 'self-months-1', category: 'SELF', kind: 'SELF_STUDY', months: 1, price: 16500 },
  { code: 'ind-60-24', category: 'GENERAL', kind: 'INDIVIDUAL', lessons: 24, durationMinutes: 60, months: 2, price: 168000, previousPrice: 180000 },
  { code: 'ind-30-36', category: 'GENERAL', kind: 'INDIVIDUAL', lessons: 36, durationMinutes: 30, months: 3, price: 144000, previousPrice: 162000 },
  { code: 'business-60-8', category: 'BUSINESS', kind: 'INDIVIDUAL', lessons: 8, durationMinutes: 60, price: 80000 },
  { code: 'group-12', category: 'GENERAL_GROUP', kind: 'GROUP', title: 'Групповой курс · 12 уроков', lessons: 12, maxStudents: 6, price: 29990 },
  { code: 'guaranteed-beginner-individual', category: 'GUARANTEED', kind: 'INDIVIDUAL', target: 'Beginner', durationMinutes: 60, price: 168000 },
  { code: 'guaranteed-beginner-group', category: 'GUARANTEED', kind: 'GROUP', target: 'Beginner', durationMinutes: 60, price: 55000 },
  { code: 'ielts-60-8', category: 'IELTS_MONTHLY', kind: 'INDIVIDUAL', lessons: 8, durationMinutes: 60, months: 1, price: 88000 },
  { code: 'ielts-band-5.5', category: 'IELTS_BAND', kind: 'INDIVIDUAL', target: '5.5', lessons: 28, durationMinutes: 60, price: 277200, previousPrice: 308000 },
  { code: 'sat-individual-90-8', category: 'SAT_MONTHLY', kind: 'INDIVIDUAL', lessons: 8, durationMinutes: 90, months: 1, price: 120000 },
  { code: 'sat-group-90-8', category: 'SAT_MONTHLY', kind: 'GROUP', lessons: 8, durationMinutes: 90, months: 1, maxStudents: 3, price: 60000 },
  { code: 'sat-individual-90-24', category: 'SAT_PACKAGE', kind: 'INDIVIDUAL', lessons: 24, durationMinutes: 90, price: 324000 },
  { code: 'sat-group-90-24', category: 'SAT_PACKAGE', kind: 'GROUP', lessons: 24, durationMinutes: 90, maxStudents: 3, price: 162000 },
]
const renderCatalog = (props = {}) => render(<I18nProvider><OfferCatalog offers={offers} onSelect={() => {}} {...props} /></I18nProvider>)
const section = (name) => screen.getByRole('heading', { name, level: 2 }).closest('section')

it('separates all product categories and shows periods/old prices without fabricated quantities', () => {
  renderCatalog()
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(9)
  expect(section('SELF · самостоятельное обучение').textContent).toContain('1 мес.')
  const general = section('Английский с преподавателем')
  expect(general.textContent).toContain('24 урока')
  expect(general.textContent).toContain('180 000')
  expect(general.textContent).toContain('168 000')
  expect(general.textContent).toContain('2 мес.')
  expect(general.querySelector('[data-offer-code="business-60-8"]')).toBeNull()
  expect(section('Гарантированные тарифы по уровням').textContent).not.toContain('уроков')
  expect(section('Групповой курс').textContent).toContain('До 6 человек')
  expect(general.querySelector('.pr-sec__title svg')).toBeTruthy()
  expect(general.querySelector('.pr-bonus__art img[src="/assets/demo/logo-duolingo.png"]')).toBeTruthy()
  expect(general.querySelector('.pr-bonus__gift')?.getAttribute('src')).toBe('/assets/demo/gift.png')
  expect(section('Групповой курс').querySelector('.pr-bonus__art img[src="/assets/demo/logo-netflix.png"]')).toBeTruthy()
  expect(section('Business Premium').querySelector('.pr-bonus')).toBeNull()

})
it('duration and format controls select the correct server offer independently', () => {
  const choose = vi.fn()
  renderCatalog({ onSelect: choose, quantity: () => 0, onBump: () => {} })
  const general = section('Английский с преподавателем')
  fireEvent.click(within(general).getByRole('button', { name: '30 минут' }))
  expect(general.textContent).toContain('144 000')
  fireEvent.click(within(general).getByRole('button', { name: 'Добавить в заказ' }))
  expect(choose.mock.calls[0][0].code).toBe('ind-30-36')
  const sat = section('SAT · пакеты на месяц')
  fireEvent.click(within(sat).getByRole('button', { name: 'В группе' }))
  expect(sat.textContent).toContain('60 000')
  expect(sat.textContent).toContain('До 3 человек')
  fireEvent.click(within(sat).getByRole('button', { name: 'Добавить в заказ' }))
  expect(choose.mock.calls[1][0].code).toBe('sat-group-90-8')
  expect(section('SAT · пакет на 24 урока').textContent).toContain('324 000')
})
it.each(['sat', 'ielts'])('exam %s uses only its own server offers', (product) => {
  renderCatalog({ product })
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2)
  expect(screen.queryByRole('heading', { name: 'Английский с преподавателем' })).toBeNull()
  expect(screen.getAllByRole('heading', { level: 2 }).every((h) => h.textContent.startsWith(product.toUpperCase()))).toBe(true)
})
