// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import { AddScoreDialog, ScoreTrajectory, ScoresTable, TrajectoryLegend } from './ScoresPanel.jsx'

afterEach(cleanup)

const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>)

// строки как у /mobile/sat/scores (Figma «NEW 2», 17:2430): симуляция с диапазоном, Bluebook на проверке, отклонённый
const entries = [
  { id: '1', source: 'OFFICIAL', takenOn: '2026-06-08', rw: 540, math: 580, total: 1120, delta: null },
  { id: 'p', source: 'PAPER', label: 'Test 4', takenOn: '2026-07-15', rw: 550, math: 600, total: 1150, delta: 30, mockId: 'p' },
  { id: '2', source: 'BLUEBOOK', takenOn: '2026-08-24', rw: 560, math: 620, total: 1180, delta: 30, bluebookTest: 8, reviewStatus: 'PENDING' },
  { id: '3', source: 'BLUEBOOK', takenOn: '2026-08-30', rw: 600, math: 620, total: 1220, delta: null, bluebookTest: 10, reviewStatus: 'REJECTED' },
  {
    id: 's', source: 'SIMULATION', label: 'Full simulation', takenOn: '2026-09-12', rw: 570, math: 600, total: 1190, delta: 10, mockId: 's',
    range: { rw: { low: 530, high: 610 }, math: { low: 560, high: 640 }, total: { low: 1150, high: 1230 } },
  },
]

describe('«Результаты» и траектория (17:2430)', () => {
  it('симуляция — диапазоны и «оценка», Bluebook — «Test 8» и статус, у отклонённого Δ нет и нет «Сравнения»', () => {
    const onCompare = vi.fn()
    const { container, getAllByRole } = wrap(<ScoresTable entries={entries} onAdd={vi.fn()} onDelete={vi.fn()} onReview={vi.fn()} onCompare={onCompare} />)
    const rows = [...container.querySelectorAll('.st-mocks__tr:not(.is-head)')].map((r) => r.textContent)
    expect(rows[0]).toContain('530–610')
    expect(rows[0]).toContain('1150–1230')
    expect(rows[0]).toContain('оценка')
    expect(rows[0]).not.toContain('Full simulation')
    expect(rows[1]).toContain('Bluebook · Test 10')
    expect(rows[1]).toContain('отклонено')
    expect(rows[2]).toContain('на подтверждении')
    expect(rows[3]).toContain('Past paper · Test 4')
    expect(container.querySelector('.st-mocks__tr.is-rejected')).not.toBeNull()
    const compare = getAllByRole('button', { name: 'Сравнение' })
    expect(compare).toHaveLength(1)
    fireEvent.click(compare[0])
    expect(onCompare).toHaveBeenCalledWith(8)
    expect(container.textContent).toContain('Диапазон симуляции — внутренняя оценка JTS')
  })

  it('график: синяя линия без отклонённого, диапазон симуляции, легенда только своих источников', () => {
    const { container } = wrap(<><ScoreTrajectory entries={entries} target={1350} /><TrajectoryLegend entries={entries} /></>)
    expect(container.querySelectorAll('.st-traj__dot.is-real')).toHaveLength(2)
    expect(container.querySelectorAll('.st-traj__range')).toHaveLength(1)
    expect(container.querySelectorAll('.st-traj__dot.is-paper')).toHaveLength(1)
    expect(container.textContent).toContain('Цель 1350')
    expect([...container.querySelectorAll('.st-legend')].map((x) => x.textContent)).toEqual(['Официальные и Bluebook', 'Симуляции JTS · диапазон', 'Past papers'])
  })

  it('«Добавить результат»: «Другое», округление до 10 и итог из округлённых секций', () => {
    const onSave = vi.fn()
    const { container, getByRole } = wrap(<AddScoreDialog onSave={onSave} onClose={vi.fn()} />)
    expect([...container.querySelectorAll('[role="radio"]')].map((b) => b.textContent)).toEqual(['Официальный SAT', 'Bluebook', 'Другое'])
    const [rw, math] = container.querySelectorAll('.st-scoreform__input input')
    fireEvent.change(rw, { target: { value: '560' } })
    fireEvent.change(math, { target: { value: '625' } })
    expect(container.querySelector('.st-scoreform__total b').textContent).toBe('1190')
    fireEvent.click(getByRole('button', { name: /Кратно 10 — округлим до 630\?/ }))
    expect(math.value).toBe('630')
    fireEvent.click(getByRole('button', { name: 'Сохранить результат' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ source: 'BLUEBOOK', rw: 560, math: 630 }))
  })
})
