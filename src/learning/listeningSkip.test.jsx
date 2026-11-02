// @vitest-environment jsdom
// Отзыв АруЖан (03.11.2026): у шага с записью нет выхода, если послушать сейчас нельзя. «Не могу слушать сейчас» (как
// в Duolingo) закрывает шаг без монет и не считает его ни верным, ни ошибкой; показывает ответ и текст записи.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer, { stopStageAudio } from './CourseStepPlayer.jsx'
import { resetTranscriptCache, transcriptFor } from './courseTranscripts.js'

const LISTEN = {
  stage: 'Listening',
  type: 'choice',
  title: 'Послушайте. О чём спорят собеседники?',
  prompt: 'They argue about…',
  options: ['friends', 'money', 'work'],
  answer: 'friends',
  src: '/course/b1/audio/7eaad0e587b5.mp3',
}
const NEXT = { stage: 'Listening', type: 'note', title: 'Дальше', html: '<p>next</p>' }

function play(steps, props = {}) {
  return render(
    <I18nProvider>
      <CourseStepPlayer steps={steps} title="Friends" level="B1" onExit={() => {}} onDone={() => {}} {...props} />
    </I18nProvider>,
  )
}

function stubTranscripts(map) {
  vi.stubGlobal('fetch', vi.fn(async (url) => (String(url).endsWith('/course/b1/transcripts.json') && map
    ? { ok: true, json: async () => map }
    : { ok: false, json: async () => ({}) })))
}

afterEach(() => {
  cleanup()
  stopStageAudio()
  resetTranscriptCache()
  vi.unstubAllGlobals()
})

describe('«Не могу слушать сейчас»', () => {
  it('у шага с записью кнопка есть; нажали — ответ, текст записи, «Продолжить», без монеты и без «Неверно»', async () => {
    stubTranscripts({ '7eaad0e587b5.mp3': 'A: You have too many friends. B: No, I don\'t.' })
    play([LISTEN, NEXT])
    fireEvent.click(screen.getByRole('button', { name: 'Не могу слушать сейчас' }))

    expect(screen.getByText(/Пропущено\. Вот ответ и текст записи\./)).toBeTruthy()
    expect(screen.getByText('Ответ: friends')).toBeTruthy()
    expect(screen.queryByText(/неверный ответ/i)).toBeNull()
    expect(document.querySelector('.cp-fb').className).toContain('is-skip')
    expect(document.querySelector('.cp-fb__coin')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Не могу слушать сейчас' })).toBeNull()
    expect(screen.getByRole('button', { name: /продолжить/i })).toBeTruthy()

    await waitFor(() => expect(document.querySelector('.cp-transcript')).toBeTruthy())
    expect(document.querySelector('.cp-transcript').open).toBe(true)
    expect(document.querySelector('.cp-transcript__body').textContent).toContain('You have too many friends')
  })

  it('на тесте юнита кнопки нет', () => {
    play([LISTEN, NEXT], { passRatio: 0.7 })
    expect(screen.queryByRole('button', { name: 'Не могу слушать сейчас' })).toBeNull()
  })

  it('у шага без записи кнопки нет', () => {
    const { src, ...noAudio } = LISTEN
    void src
    play([noAudio, NEXT])
    expect(screen.queryByRole('button', { name: 'Не могу слушать сейчас' })).toBeNull()
  })

  it('после обычной проверки текст записи есть, но свёрнут', async () => {
    stubTranscripts({ '7eaad0e587b5.mp3': 'A: hello' })
    play([LISTEN, NEXT])
    fireEvent.click(screen.getByRole('button', { name: 'friends' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    await waitFor(() => expect(document.querySelector('.cp-transcript')).toBeTruthy())
    expect(document.querySelector('.cp-transcript').open).toBe(false)
  })

  it('пропуск не портит точность урока: в итогах нет ошибки', async () => {
    stubTranscripts(null)
    const onDone = vi.fn()
    play([LISTEN, { stage: 'Listening', type: 'choice', title: 'Q', prompt: 'p', options: ['yes', 'no'], answer: 'yes' }], { onDone })
    fireEvent.click(screen.getByRole('button', { name: 'Не могу слушать сейчас' }))
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }))
    fireEvent.click(screen.getByRole('button', { name: 'yes' }))
    fireEvent.click(screen.getByRole('button', { name: /проверить/i }))
    fireEvent.click(screen.getByRole('button', { name: /продолжить/i }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(onDone.mock.calls[0][0]).toMatchObject({ correct: 1, wrong: 0, outcome: 'success' })
  })
})

describe('transcriptFor', () => {
  it('текст по имени файла; нет файла текстов — null без падения', async () => {
    stubTranscripts({ 'x.mp3': 'Hello.' })
    expect(await transcriptFor('B1', '/course/b1/audio/x.mp3')).toBe('Hello.')
    expect(await transcriptFor('B1', '/course/b1/audio/y.mp3')).toBeNull()
    resetTranscriptCache()
    stubTranscripts(null)
    expect(await transcriptFor('B1', '/course/b1/audio/x.mp3')).toBeNull()
  })
})
