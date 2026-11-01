// @vitest-environment jsdom
//
// Mock Writing по типу (замечание владельца 10): тот же редактор, но в условиях экзамена — часы, без «Подсказок», в
// шапке тип, а не название задания; черновик свой (не путается с тренировкой того же задания), сдача — обычная работа
// Writing в режиме exam (её затем оценивает ИИ, как любую).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

vi.mock('../api.js', () => ({
  getIeltsTest: vi.fn(async () => ({
    test: { id: 'W2-001', title: 'Remote work', kind: 'task2' },
    document: { id: 'W2-001', kind: 'task2', taskKind: 'task2', essayType: 'opinion', question: 'Some people think remote work is better.', minWords: 250, timeLimitSec: 2400 },
  })),
  submitIeltsWriting: vi.fn(async () => ({ attempt: { id: 55 } })),
}))

import IeltsWritingRunPage from './IeltsWritingRunPage.jsx'
import { submitIeltsWriting } from '../api.js'

const renderRun = (target, props = {}) =>
  render(<I18nProvider><IeltsWritingRunPage token="TOK" target={target} onExit={() => {}} onDone={() => {}} {...props} /></I18nProvider>)

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/?screen=ielts-writing-run')
  submitIeltsWriting.mockClear()
})

describe('IeltsWritingRunPage — mock по типу', () => {
  it('вне mock: подсказки и название задания на месте', async () => {
    renderRun({ testId: 'W2-001', mode: 'exam' })
    expect(await screen.findByText('Подсказки')).toBeTruthy()
    expect(screen.getByText(/Remote work/)).toBeTruthy()
  })

  it('скопированное из задания видно сразу и не засчитывается: подтверждение по засчитанным словам', async () => {
    renderRun({ testId: 'W2-001', mode: 'exam' })
    const box = await screen.findByRole('textbox')
    fireEvent.change(box, { target: { value: 'Remote work suits me.' } })
    expect(screen.queryByText(/скопировано/)).toBeNull()
    fireEvent.change(box, { target: { value: 'Some people think remote work is better. I agree.' } })
    expect(screen.getByText('· из задания скопировано ~7 слов — они не засчитываются')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Отправить на ИИ-проверку' }))
    expect(await screen.findByText(/Засчитанных слов: 2 — меньше минимума 250.*Всё равно отправить\?/)).toBeTruthy()
  })

  it('mock по типу: без подсказок, тип в шапке, свой черновик, сдача в режиме exam', async () => {
    // черновик тренировки того же задания — mock его не подхватывает
    localStorage.setItem('jts_ielts_wr_draft_W2-001', JSON.stringify({ text: 'practice draft', mode: 'practice' }))
    const onDone = vi.fn()
    renderRun({ testId: 'W2-001', mode: 'practice', mockType: 'task2:opinion' }, { onDone })
    expect(await screen.findByText('Mock · Task 2 · Opinion essay')).toBeTruthy()
    expect(screen.queryByText('Подсказки')).toBeNull()
    expect(screen.queryByText(/Remote work/)).toBeNull()
    expect(new URLSearchParams(window.location.search).get('ieltsMockType')).toBe('task2:opinion')
    const box = screen.getByRole('textbox')
    expect(box.value).toBe('')
    fireEvent.change(box, { target: { value: 'Remote work has clear benefits.' } })
    // черновик пишется через секунду тишины
    await waitFor(() => expect(localStorage.getItem('jts_ielts_wr_mock_W2-001')).toBeTruthy(), { timeout: 3000 })
    expect(JSON.parse(localStorage.getItem('jts_ielts_wr_draft_W2-001')).text).toBe('practice draft')
    fireEvent.click(screen.getByRole('button', { name: 'Отправить на ИИ-проверку' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Сдать работу' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(55, 'W2-001'))
    expect(submitIeltsWriting.mock.calls[0][2]).toMatchObject({ mode: 'exam', text: 'Remote work has clear benefits.' })
    expect(localStorage.getItem('jts_ielts_wr_mock_W2-001')).toBeNull()
  })
})
