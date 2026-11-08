// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import DiagnosticIntro from './DiagnosticIntro.jsx'
import DiagnosticReport from './DiagnosticReport.jsx'

afterEach(cleanup)
beforeEach(() => window.localStorage.clear())
const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>)

const RESULT = {
  total: 24,
  correct: 10,
  elapsedSec: 1500,
  sections: { rw: { correct: 5, total: 12 }, math: { correct: 5, total: 12 } },
  domains: [],
  focus: [],
}

// Решение владельца 08.11.2026: диагностику ученик сам не пересдаёт — только после сброса куратором.
describe('диагностика SAT без «Пройти заново»', () => {
  it('в отчёте нет кнопки пересдачи — только план и следующий тест', () => {
    const { getAllByRole } = wrap(
      <DiagnosticReport result={RESULT} finishedAt="2026-11-01T10:00:00" startKey="foundations1"
        onRoadmap={() => {}} onNext={() => {}} onManager={() => {}} />,
    )
    const labels = getAllByRole('button').map((b) => b.textContent)
    expect(labels.some((l) => /заново/i.test(l))).toBe(false)
    expect(labels).toHaveLength(2)
  })

  it('старт без прошлой сдачи — «Начать диагностику», идущая — «Продолжить»', () => {
    const { getByRole, rerender } = wrap(<DiagnosticIntro onStart={() => {}} />)
    expect(getByRole('button').textContent).toContain('Начать диагностику')
    rerender(<I18nProvider><DiagnosticIntro resuming onStart={() => {}} /></I18nProvider>)
    expect(getByRole('button').textContent).toContain('Продолжить диагностику')
  })
})
