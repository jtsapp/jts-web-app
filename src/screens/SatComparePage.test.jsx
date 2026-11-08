// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import live from '../sat/plan/__fixtures__/roadmap-live.json'

const api = vi.hoisted(() => ({ bluebook: null }))
vi.mock('../api.js', () => ({
  getSatBluebook: vi.fn(() => Promise.resolve(api.bluebook)),
  getSatProfile: vi.fn(() => Promise.resolve({ targetTotal: 1350 })),
  getSatRoadmap: vi.fn(() => Promise.resolve(live.roadmap)),
}))

const { default: SatComparePage } = await import('./SatComparePage.jsx')

afterEach(cleanup)

const t6 = { test: 6, entered: true, rw: 520, math: 580, total: 1100, reviewStatus: 'APPROVED' }
const t8 = { test: 8, entered: true, rw: 560, math: 620, total: 1180, reviewStatus: 'APPROVED', deltaRw: 40, deltaMath: 40, deltaTotal: 80 }
const domains = [
  { id: 'm.alg', section: 'math', band: 'strong', accuracy: 0.68 },
  { id: 'm.geo', section: 'math', band: 'weak', accuracy: 0.12 },
]
const snap6 = { test: 6, focus: [], domains: [{ id: 'm.alg', band: 'shaky', accuracy: 0 }, { id: 'm.geo', band: 'none', accuracy: null }] }

function open(test, tab = 'plan') {
  window.history.replaceState(null, '', `/?screen=sat-compare&satTab=${tab}&satCompare=${test}`)
  const onNav = vi.fn()
  const r = render(<I18nProvider><SatComparePage token="x" onNav={onNav} /></I18nProvider>)
  return { ...r, onNav }
}

describe('сравнение после Bluebook-теста (Figma «NEW 2», 17:8528)', () => {
  beforeEach(() => {
    api.bluebook = { tests: [t6, t8, { test: 10, entered: false }], snapshots: [snap6], currentDomains: domains, currentFocus: ['m.geo'] }
  })

  it('рост: заголовок, цепочка до цели, баллы и домены раздельно, без «Что делаем дальше»', async () => {
    const { container, findByText } = open(8)
    await findByText('Балл вырос на 80 пунктов')
    const text = container.textContent
    expect(text).toContain('Test 6 → Test 8: 1100 → 1180. До цели 1350 осталось 170.')
    expect(text).toContain('подтверждено куратором')
    expect(text).toContain('Закрыто')
    expect(text).toContain('Новый приоритет')
    expect(text).not.toContain('Что делаем дальше')
    expect(container.querySelector('.st-cmp__delta.is-up').textContent).toBe('+80')
  })

  it('без роста — «почти не изменился», «Что делаем дальше» и нейтральные чипы', async () => {
    api.bluebook.tests = [t6, { ...t8, math: 570, total: 1090, deltaMath: -10, deltaTotal: -10, deltaRw: 0 }]
    const { container, findByText } = open(8)
    await findByText('Балл почти не изменился: −10')
    await waitFor(() => expect(container.textContent).toContain('Следующая проверка: Test 10'))
    expect(container.textContent).toContain('Что делаем дальше')
    expect(container.querySelector('.st-cmp__delta.is-up')).toBeNull()
    expect(container.querySelector('.st-cmp__chart.is-flat')).not.toBeNull()
  })

  it('«К плану следующей фазы» — в «План» на фазу 4; выход — на карточку теста', async () => {
    const { findByRole, onNav } = open(8)
    fireEvent.click(await findByRole('button', { name: /К плану следующей фазы/ }))
    expect(onNav).toHaveBeenCalledWith('sat')
    let url = new URL(window.location.href)
    expect(url.searchParams.get('satTab')).toBe('plan')
    expect(url.searchParams.get('satPhase')).toBe('4')
    expect(url.searchParams.has('satCompare')).toBe(false)
    cleanup()
    const again = open(8, 'plan')
    fireEvent.click(await again.findByRole('button', { name: /Выйти/ }))
    url = new URL(window.location.href)
    expect(url.searchParams.get('satPhase')).toBe('3')
  })

  it('нет Test 8 — честное «сравнение появится»', async () => {
    api.bluebook.tests = [t6, { test: 8, entered: false }]
    const { findByText } = open(8)
    await findByText(/Сравнение появится/)
  })
})
