// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({ getFeedbackReports: vi.fn(async () => []) }))

import { getFeedbackReports } from '../api.js'
import NewReportCard from './NewReportCard.jsx'
import { SAMPLE_LIST } from './sample.js'

function tokenWithRole(role) {
  const payload = Buffer.from(JSON.stringify({ role, userId: 1 })).toString('base64url')
  return `header.${payload}.signature`
}
const renderCard = (token, onNav = () => {}) => render(<I18nProvider><NewReportCard token={token} onNav={onNav} /></I18nProvider>)

beforeEach(() => getFeedbackReports.mockClear())

describe('NewReportCard', () => {
  it('есть непросмотренный отчёт — карточка ведёт прямо в него', async () => {
    getFeedbackReports.mockResolvedValueOnce(SAMPLE_LIST)
    const onNav = vi.fn()
    renderCard(tokenWithRole('STUDENT'), onNav)
    fireEvent.click(await screen.findByText('Новый отчёт о прогрессе'))
    expect(onNav).toHaveBeenCalledWith('lessons', { tab: 'reports', reportId: 2 })
  })

  it('все просмотрены — карточки нет', async () => {
    getFeedbackReports.mockResolvedValueOnce(SAMPLE_LIST.map((x) => ({ ...x, seenAt: '2026-10-03T10:00:00+05:00' })))
    const { container } = renderCard(tokenWithRole('STUDENT'))
    await waitFor(() => expect(getFeedbackReports).toHaveBeenCalled())
    expect(container.querySelector('.hm-report')).toBeNull()
  })

  it('ручки нет (404) — карточки нет, ошибки тоже', async () => {
    getFeedbackReports.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 404 }))
    const { container } = renderCard(tokenWithRole('STUDENT'))
    await waitFor(() => expect(getFeedbackReports).toHaveBeenCalled())
    expect(container.querySelector('.hm-report')).toBeNull()
  })

  it('преподавателя и гостя не спрашивает', async () => {
    renderCard(tokenWithRole('TEACHER'))
    renderCard(null)
    await new Promise((r) => setTimeout(r, 0))
    expect(getFeedbackReports).not.toHaveBeenCalled()
  })
})
