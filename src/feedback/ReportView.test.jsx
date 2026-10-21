// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReportView from './ReportView.jsx'
import { normalizeReport } from './reportShape.js'
import { SAMPLE_REPORT, SAMPLE_REPORTS } from './sample.js'

const view = (raw) => render(<ReportView report={normalizeReport(raw)} />)

describe('ReportView', () => {
  it('шапка, цифры, бейджи и подпись — как в превью прототипа', () => {
    view(SAMPLE_REPORT)
    expect(screen.getByText('Отчёт о прогрессе · 2-й месяц (дни 31–60)')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Айша Тестова' })).toBeTruthy()
    expect(screen.getByText('1 to 1 · Пройдено: Unit 2 — Lessons 1–6')).toBeTruthy()
    expect(screen.getByText('8/9')).toBeTruthy()
    expect(screen.getByText('Посещаемость · 89%')).toBeTruthy()
    expect(screen.getByText('85%')).toBeTruthy()
    expect(screen.getByText('Рост в 4 навыках')).toBeTruthy()
    expect(screen.getByText('2 мес. с JTS')).toBeTruthy()
    expect(screen.getByText('Преподаватель: Test Teacher')).toBeTruthy()
  })

  it('динамика навыков — стрелкой к прошлому отчёту', () => {
    view(SAMPLE_REPORT)
    expect(screen.getAllByText('↑1')).toHaveLength(4)
    expect(screen.queryByText(/↓/)).toBeNull()
  })

  it('первый отчёт — без прошлых целей и без стрелок', () => {
    view(SAMPLE_REPORTS[1])
    expect(screen.queryByText('Цели прошлого отчёта')).toBeNull()
    expect(screen.queryByText(/↑|↓/)).toBeNull()
    expect(screen.getByText('🎯 Цели на следующие 30 дней')).toBeTruthy()
  })

  it('подписи — на языке отчёта, а не интерфейса', () => {
    view({ ...SAMPLE_REPORT, lang: 'kk' })
    expect(screen.getByText('Прогресс есебі · 2-ай (31–60 күн)')).toBeTruthy()
    expect(screen.getByText('Сөйлеу')).toBeTruthy()
    expect(screen.getByText('JTS-пен 2 ай')).toBeTruthy()
  })

  it('без фразы и без бейджей плашки мотивации нет', () => {
    const { container } = view({ ...SAMPLE_REPORT, motivation: null, badges: [{ type: 'mystery' }] })
    expect(container.querySelector('.fbr__mot')).toBeNull()
  })
})
