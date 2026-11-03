// @vitest-environment jsdom
//
// Говорение без уровня пересдаётся прямо с «Главной» (решение владельца 03.11.2026): плитка «Говорение — не
// оценивалось» — кнопка, окно говорения поверх, оценка дописывается в сохранённый конверт.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'

const api = vi.hoisted(() => ({ saveAttempt: vi.fn(async () => true) }))
vi.mock('../../placement/api.js', () => ({ fetchLatestAttempt: vi.fn(async () => null), saveAttempt: api.saveAttempt }))
// Окно говорения подменено: здесь проверяется карточка, а не запись (её — SpeakingTask.mic.test.jsx).
vi.mock('../../placement/SpeakingTask.jsx', () => ({
  default: ({ args, onDone }) => (
    <button type="button" data-testid="fake-speaking" data-args={JSON.stringify(args)} onClick={() => onDone({ status: 'completed', speaking_level: 'A2' })}>
      done
    </button>
  ),
}))

import { PlacementResults } from './PlacementReport.jsx'
import { reportView } from '../../placement/reportModel.js'

const ENV = {
  schemaVersion: 1,
  source: 'jts_general_english_placement',
  assessment: {
    attemptId: 'a1',
    overallCEFR: 'B1',
    overallStatus: 'partial',
    flags: ['speaking_connection_error'],
    skillResults: { LU: { level: 'B1' }, R: { level: 'A2' }, L: { level: 'B1' }, S: { status: 'error' } },
  },
}

function draw(env, token = 'tok') {
  const reload = vi.fn()
  render(
    <I18nProvider>
      <PlacementResults report={{ loaded: true, view: reportView(env, 'ru'), env, reload }} onRetake={() => {}} collapseKey="k" token={token} />
    </I18nProvider>,
  )
  return reload
}

describe('PlacementResults — пересдать говорение', () => {
  beforeEach(() => {
    cleanup()
    localStorage.clear()
    api.saveAttempt.mockClear()
  })

  it('говорение не оценено — на плитке кнопка; окно получает уровни трёх навыков', () => {
    draw(ENV)
    fireEvent.click(screen.getByTestId('speaking-retake'))
    expect(JSON.parse(screen.getByTestId('fake-speaking').dataset.args)).toEqual({ grammarLevel: 'B1', readingLevel: 'A2', listeningLevel: 'B1' })
  })

  it('оценка сохраняется в тот же конверт и отчёт перечитывается', async () => {
    const reload = draw(ENV)
    fireEvent.click(screen.getByTestId('speaking-retake'))
    fireEvent.click(screen.getByTestId('fake-speaking'))
    await waitFor(() => expect(reload).toHaveBeenCalled())
    const [token, saved] = api.saveAttempt.mock.calls[0]
    expect(token).toBe('tok')
    expect(saved.assessment.attemptId).toBe('a1')
    expect(saved.assessment.skillResults.S).toMatchObject({ status: 'completed', level: 'A2' })
  })

  it('сохранить не вышло — сообщение, отчёт не перечитываем', async () => {
    api.saveAttempt.mockResolvedValueOnce(false)
    const reload = draw(ENV)
    fireEvent.click(screen.getByTestId('speaking-retake'))
    fireEvent.click(screen.getByTestId('fake-speaking'))
    await screen.findByText('Не удалось сохранить результат говорения. Попробуйте ещё раз.')
    expect(reload).not.toHaveBeenCalled()
  })

  it('говорение оценено или нет входа — кнопки нет', () => {
    const done = { ...ENV, assessment: { ...ENV.assessment, skillResults: { ...ENV.assessment.skillResults, S: { status: 'completed', level: 'B1' } } } }
    draw(done)
    expect(screen.queryByTestId('speaking-retake')).toBeNull()
    cleanup()
    draw(ENV, null)
    expect(screen.queryByTestId('speaking-retake')).toBeNull()
  })
})
