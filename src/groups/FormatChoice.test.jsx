// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({ getGroupState: vi.fn() }))

import { getGroupState } from '../api.js'
import FormatChoice from './FormatChoice.jsx'

function draw(handlers = {}) {
  return render(
    <I18nProvider>
      <FormatChoice token="TOK" onIndividual={handlers.onIndividual || (() => {})} onGroup={handlers.onGroup || (() => {})} />
    </I18nProvider>
  )
}

describe('Выбор формата в «Мой учитель»', () => {
  beforeEach(() => vi.clearAllMocks())

  it('два варианта: индивидуально ведёт в подбор учителя, в группе — в «Выбрать группу»', async () => {
    getGroupState.mockResolvedValue({ enrollment: null, waiting: [] })
    const onIndividual = vi.fn()
    const onGroup = vi.fn()
    draw({ onIndividual, onGroup })

    fireEvent.click(await screen.findByTestId('format-individual'))
    fireEvent.click(screen.getByTestId('format-group'))

    expect(onIndividual).toHaveBeenCalledTimes(1)
    expect(onGroup).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Индивидуально с учителем')).toBeTruthy()
    expect(screen.getByText('В группе до 6 человек')).toBeTruthy()
  })

  it('записавшемуся ученику вместо выбора показывается его группа и ссылка на статус', async () => {
    getGroupState.mockResolvedValue({ enrollment: { group: { name: 'Elementary 212' } }, waiting: [] })
    const onGroup = vi.fn()
    draw({ onGroup })

    const banner = await screen.findByTestId('format-in-group')
    expect(banner.textContent).toContain('Elementary 212')
    expect(screen.queryByTestId('format-choice')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Открыть группу →' }))
    expect(onGroup).toHaveBeenCalledTimes(1)
  })

  it('без ручек групп на стенде блок молчит и «Мой учитель» остаётся прежним', async () => {
    getGroupState.mockResolvedValue(null)
    const { container } = draw()

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(container.textContent).toBe('')
  })
})
