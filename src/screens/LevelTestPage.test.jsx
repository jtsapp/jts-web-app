// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'

const startAdaptiveSession = vi.fn(async () => ({
  sessionToken: 'sess-1',
  questionNumber: 1,
  minQuestions: 10,
  maxQuestions: 14,
  question: {
    id: 'g-a1',
    skill: 'grammar',
    level: 'A1',
    prompt: 'Choose the correct sentence.',
    question: 'Where _____ your cousins from?',
    options: [
      { id: 'a', text: 'do' },
      { id: 'b', text: 'is' },
      { id: 'c', text: 'are' },
    ],
  },
}))

const submitAdaptiveAnswer = vi.fn(async () => ({
  correct: false,
  // Ключ приезжает только сейчас, на конкретный ответ.
  correctOptionId: 'c',
  answered: 1,
  theta: -1.2,
  finished: true,
  result: {
    detectedLevel: 'A2',
    assignedLevel: 'A2',
    answered: 1,
    correct: 0,
    levelSaved: false,
  },
}))

vi.mock('../api.js', () => ({
  startAdaptiveSession: (...args) => startAdaptiveSession(...args),
  submitAdaptiveAnswer: (...args) => submitAdaptiveAnswer(...args),
}))

import LevelTestPage from './LevelTestPage.jsx'

describe('LevelTestPage', () => {
  it('ведёт прогон через сервер: ключа в вопросе нет, вердикт приходит на ответ', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(
      <I18nProvider>
        <LevelTestPage token="TOK" onClose={() => {}} onDone={() => {}} />
      </I18nProvider>
    )

    await waitFor(() => expect(screen.getByText('Where _____ your cousins from?')).toBeTruthy())
    expect(startAdaptiveSession).toHaveBeenCalledWith('TOK')

    fireEvent.click(screen.getByText('is'))
    fireEvent.click(screen.getByText('Проверить'))

    await waitFor(() =>
      expect(submitAdaptiveAnswer).toHaveBeenCalledWith({
        sessionToken: 'sess-1',
        questionId: 'g-a1',
        optionId: 'b',
        token: 'TOK',
      })
    )
    // Подсветка берётся из ответа сервера, а не из данных вопроса.
    await waitFor(() => expect(screen.getByText('is').className).toContain('option--wrong'))
    expect(screen.getByText('are').className).not.toContain('option--correct')

    vi.advanceTimersByTime(1000)
    await waitFor(() => expect(screen.getByText('A2')).toBeTruthy())
    vi.useRealTimers()
  })

  it('не теряет вопрос, если ответ не ушёл', async () => {
    submitAdaptiveAnswer.mockRejectedValueOnce(new Error('Нет связи с сервером.'))
    render(
      <I18nProvider>
        <LevelTestPage onClose={() => {}} onDone={() => {}} />
      </I18nProvider>
    )

    await waitFor(() => expect(screen.getByText('Where _____ your cousins from?')).toBeTruthy())
    fireEvent.click(screen.getByText('are'))
    fireEvent.click(screen.getByText('Проверить'))

    await waitFor(() => expect(screen.getByText('Нет связи с сервером.')).toBeTruthy())
    expect(screen.getByText('Where _____ your cousins from?')).toBeTruthy()
  })
})
