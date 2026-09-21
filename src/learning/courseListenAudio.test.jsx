// @vitest-environment jsdom
// Шаг «послушай и выбери» — два провала, которые ученик видел как «сломалось»:
// запись отсутствует в данных (кнопка молчит, вопрос идёт в зачёт наугад) и
// запись не заиграла по сети (кнопка молчит, ошибки не видно).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import CourseStepPlayer, { stopStageAudio } from './CourseStepPlayer.jsx'

function playSteps(steps, onDone = () => {}) {
  return render(
    <I18nProvider>
      <CourseStepPlayer steps={steps} title="Weather" level="A0" onExit={() => {}} onDone={onDone} />
    </I18nProvider>,
  )
}

const QUESTION = {
  stage: 'Аудирование',
  type: 'listen',
  title: 'Послушайте. Выберите правильный ответ.',
  prompt: 'Что происходит прямо сейчас?',
  options: ["It's raining.", "It's snowing."],
  answer: "It's raining.",
}

afterEach(() => {
  stopStageAudio()
  vi.restoreAllMocks()
})

describe('CourseStepPlayer — вопрос на слух без записи', () => {
  // Так выгружены A0 steps-21 #26 и steps-24 #28: src: null.
  it('не рисует мёртвый плеер и варианты, а пропускает дальше без оценки', () => {
    const onDone = vi.fn()
    playSteps([{ ...QUESTION, src: null }], onDone)

    expect(document.querySelector('.cp-audio__play')).toBeNull()
    expect(screen.queryByText("It's raining.")).toBeNull()
    // Вместо пустоты под «Послушайте…» — объяснение, что шаг можно пропустить.
    expect(screen.getByText(/записи к этому заданию пока нет/i)).toBeTruthy()

    const go = screen.getByRole('button', { name: /продолжить/i })
    expect(go.disabled).toBe(false)
    fireEvent.click(go)
    // Шаг не оценивался — в итогах ни верного, ни неверного за него.
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: 0, wrong: 0 }))
  })
})

describe('CourseStepPlayer — запись не заиграла', () => {
  it('показывает ошибку вместо молчащей кнопки', async () => {
    const err = Object.assign(new Error('404'), { name: 'NotSupportedError' })
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.reject(err))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    playSteps([{ ...QUESTION, src: '/learning/audio/a0/missing.mp3' }])

    fireEvent.click(document.querySelector('.cp-audio__play'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/запись не загрузилась/i)
  })

  it('прерванный паузой play() ошибкой не считается', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.reject(abort))
    playSteps([{ ...QUESTION, src: '/learning/audio/a0/ok.mp3' }])

    fireEvent.click(document.querySelector('.cp-audio__play'))
    await waitFor(() => expect(play).toHaveBeenCalled())
    await Promise.resolve()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
