// @vitest-environment jsdom
//
// «Результаты теста уровня» сворачиваются и разворачиваются (жалоба 02.11.2026: ученица без теста просила убрать
// блок с «Пройти тест уровня»). Выбор помнится на устройстве по аккаунту.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

vi.mock('../../placement/api.js', () => ({ fetchLatestAttempt: vi.fn(async () => null) }))

import { PlacementResults } from './PlacementReport.jsx'
import { placementCollapseKey } from './placementCollapse.js'

const MISSING = { loaded: true, view: null }

function draw(collapseKey = placementCollapseKey('jts_tour_home:user-7:ge')) {
  return render(
    <I18nProvider>
      <PlacementResults report={MISSING} onRetake={() => {}} collapseKey={collapseKey} />
    </I18nProvider>,
  )
}

describe('PlacementResults — скрыть и показать', () => {
  beforeEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('по умолчанию раскрыта: уровень и кнопка теста на месте', () => {
    draw()
    expect(screen.getByText('Уровень не определён')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Скрыть' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('«Скрыть» оставляет только шапку, «Показать» возвращает всё', () => {
    draw()
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть' }))
    expect(screen.queryByText('Уровень не определён')).toBeNull()
    expect(screen.queryByText('Пройти тест уровня')).toBeNull()
    expect(screen.getByText('Результаты теста уровня')).toBeTruthy()
    const show = screen.getByRole('button', { name: 'Показать' })
    expect(show.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(show)
    expect(screen.getByText('Уровень не определён')).toBeTruthy()
  })

  it('свёрнутая остаётся свёрнутой после перезагрузки — у того же аккаунта, не у другого', () => {
    draw()
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть' }))
    cleanup()

    draw()
    expect(screen.queryByText('Уровень не определён')).toBeNull()
    cleanup()

    draw(placementCollapseKey('jts_tour_home:user-8:ge'))
    expect(screen.getByText('Уровень не определён')).toBeTruthy()
  })

  it('без ключа тура — общий ключ устройства, а не падение', () => {
    draw(placementCollapseKey(null))
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть' }))
    expect(localStorage.getItem('jts_home_placement_collapsed')).toBe('1')
  })
})
