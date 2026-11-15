// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { getIeltsTest, submitIeltsAttempt } from '../api.js'
import { I18nProvider } from '../i18n.jsx'
import { flatDoc } from '../ielts/listening/listening.js'
import { createRun } from '../ielts/reading/run.js'
import IeltsListeningRunPage from './IeltsListeningRunPage.jsx'

vi.mock('../api.js', () => ({
  checkIeltsAnswer: vi.fn(),
  getIeltsTest: vi.fn(),
  getIeltsTranscript: vi.fn(),
  submitIeltsAttempt: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('показывает варианты Matching, восстанавливает букву из черновика и сдаёт выбранные ответы', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  const doc = {
    id: 'LS-MOCK-01',
    parts: [{
      number: 1,
      groups: [{
        id: 'matching',
        type: 'matching',
        range: [1, 2],
        options: [{ key: 'A', text: 'At reception' }, { key: 'B', text: 'In the library' }],
        items: [{ id: 'q1', prompt: 'Collect your card' }, { id: 'q2', prompt: 'Return the books' }],
      }],
    }],
  }
  getIeltsTest.mockResolvedValue({ document: doc })
  submitIeltsAttempt.mockResolvedValue({ attempt: { id: 42 } })
  const mock = {
    draft: { run: { ...createRun(flatDoc(doc), 'exam'), answers: { q1: ' a ' } }, partIdx: 0 },
    onSave: vi.fn(),
    onSubmitted: vi.fn(),
  }
  render(<I18nProvider><IeltsListeningRunPage token="test" target={{ testId: doc.id }} mock={mock} /></I18nProvider>)
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Начать' }))

  expect(screen.getByText('At reception')).toBeTruthy()
  expect(screen.getByText('In the library')).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'Ответ 1' }).value).toBe('A')
  const secondAnswer = screen.getByRole('combobox', { name: 'Ответ 2' })
  expect(within(secondAnswer).getByRole('option', { name: 'B' }).value).toBe('B')
  fireEvent.change(secondAnswer, { target: { value: 'B' } })
  expect(secondAnswer.value).toBe('B')

  fireEvent(window, new Event('pagehide'))
  const answers = { q1: ' a ', q2: 'B' }
  expect(mock.onSave).toHaveBeenCalledWith(expect.objectContaining({ run: expect.objectContaining({ answers }) }), { keepalive: true })

  fireEvent.click(screen.getByRole('button', { name: 'Сдать секцию' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Сдать секцию' }))
  await waitFor(() => expect(mock.onSubmitted).toHaveBeenCalledWith([42]))
  expect(submitIeltsAttempt).toHaveBeenCalledWith('test', doc.id, expect.objectContaining({ mode: 'exam', answers }))
})
