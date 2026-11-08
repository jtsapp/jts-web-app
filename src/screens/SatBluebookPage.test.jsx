// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const api = vi.hoisted(() => ({ bluebook: null, submit: null }))
vi.mock('../api.js', () => ({
  getSatBluebook: vi.fn(() => Promise.resolve(api.bluebook)),
  submitSatBluebook: (...a) => api.submit(...a),
}))

const { default: SatBluebookPage } = await import('./SatBluebookPage.jsx')

afterEach(cleanup)

function open(test = 8) {
  window.history.replaceState(null, '', `/?screen=sat-bluebook&satTab=plan&satPhase=3&satBluebook=${test}`)
  const onNav = vi.fn()
  const r = render(<I18nProvider><SatBluebookPage token="x" onNav={onNav} /></I18nProvider>)
  return { ...r, onNav }
}

const inputs = (c) => [...c.querySelectorAll('.st-bbform__form input')]

describe('баллы Bluebook (Figma «NEW 2», 17:8284 / 17:8367)', () => {
  beforeEach(() => {
    api.bluebook = { tests: [{ test: 6, entered: true }, { test: 8, entered: false }] }
    api.submit = vi.fn(() => Promise.resolve({}))
  })

  it('сохранить — только когда Total = Math + R&W; без даты; после — назад в хаб', async () => {
    const { container, findByText, getByRole, onNav } = open(8)
    await findByText('Результат Bluebook Test 8')
    expect(container.querySelector('input[type="date"]')).toBeNull()
    const [total, math, rw] = inputs(container)
    fireEvent.change(math, { target: { value: '620' } })
    fireEvent.change(rw, { target: { value: '560' } })
    fireEvent.change(total, { target: { value: '1200' } })
    const save = getByRole('button', { name: /Сохранить результат/ })
    expect(save.disabled).toBe(true)
    expect(container.textContent).toContain('Не сходится: Math 620 + Reading & Writing 560 = 1180, а введено 1200')
    fireEvent.click(getByRole('button', { name: /Посчитать автоматически/ }))
    expect(container.textContent).toContain('Сходится: 560 + 620 = 1180')
    expect(save.disabled).toBe(false)
    fireEvent.click(save)
    await waitFor(() => expect(onNav).toHaveBeenCalledWith('sat'))
    expect(api.submit).toHaveBeenCalledWith('x', 8, { rw: 560, math: 620 })
    const url = new URL(window.location.href)
    expect(url.searchParams.has('satBluebook')).toBe(false)
    expect(url.searchParams.get('satPhase')).toBe('3')
  })

  it('введённый тест — состояние проверки вместо формы', async () => {
    api.bluebook.tests[1] = { test: 8, entered: true, reviewStatus: 'PENDING', total: 1180, rw: 560, math: 620 }
    const { container, findByText } = open(8)
    await findByText('На подтверждении')
    expect(inputs(container)).toHaveLength(0)
  })

  it('отклонённый — комментарий и форма по «Ввести баллы снова»', async () => {
    api.bluebook.tests[1] = { test: 8, entered: false, reviewStatus: 'REJECTED', reviewComment: 'В отчёте Math 600' }
    const { container, findByRole } = open(8)
    fireEvent.click(await findByRole('button', { name: 'Ввести баллы снова' }))
    expect(inputs(container)).toHaveLength(3)
  })
})
