// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '../i18n.jsx'
import SpeakingTask from './SpeakingTask.jsx'

// Жалоба 03.11.2026: после «Я готов — записать» ученик видел «Не получилось оценить запись», а запроса на сервер не было
// — микрофон не открылся. Окно обязано назвать причину, показать, как её исправить, и честно пометить пропуск.
const err = (name) => Object.assign(new Error(name), { name })
let prevMd
function micFails(name) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockRejectedValue(err(name)), enumerateDevices: async () => [{ kind: 'audioinput' }] },
  })
}

describe('Говорение теста уровня: микрофон не открылся', () => {
  beforeEach(() => {
    prevMd = navigator.mediaDevices
    window.MediaRecorder = function MediaRecorder() {}
    window.AudioContext = function AudioContext() {}
    window.OfflineAudioContext = function OfflineAudioContext() {}
  })
  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: prevMd })
    delete window.MediaRecorder
    delete window.AudioContext
    delete window.OfflineAudioContext
  })

  async function pressRecord(onSkip = () => {}) {
    render(
      <I18nProvider>
        <SpeakingTask token="t" args={{ grammarLevel: 'B1' }} onDone={() => {}} onSkip={onSkip} />
      </I18nProvider>,
    )
    fireEvent.click(screen.getByText('Начать подготовку'))
    fireEvent.click(screen.getByText('Я готов — записать'))
    return screen.findByText(/микрофон/i, { selector: '.pl-speak__error' })
  }

  it('доступ запрещён — причина и шаги «как разрешить», а не «не получилось оценить»', async () => {
    micFails('NotAllowedError')
    const alert = await pressRecord()
    expect(alert.textContent).toContain('Нет доступа к микрофону')
    expect(alert.textContent).not.toContain('оценить')
    expect(screen.getByTestId('mic-help').dataset.kind).toBe('denied')
    expect(screen.getByTestId('mic-help').textContent).toContain('«Микрофон» → «Разрешить»')
  })

  it('микрофона нет — «не найден» и совет подключить или пройти с телефона', async () => {
    micFails('NotFoundError')
    const alert = await pressRecord()
    expect(alert.textContent).toContain('Микрофон не найден')
    expect(screen.getByTestId('mic-help').textContent).toContain('телефоне')
  })

  it('микрофон занят — подсказка закрыть Zoom и Teams', async () => {
    micFails('NotReadableError')
    const alert = await pressRecord()
    expect(alert.textContent).toContain('другая программа')
    expect(screen.getByTestId('mic-help').textContent).toContain('Zoom')
  })

  it('пропуск после сбоя микрофона уходит тесту с причиной', async () => {
    micFails('NotAllowedError')
    const onSkip = vi.fn()
    await pressRecord(onSkip)
    fireEvent.click(screen.getByText('Пропустить говорение'))
    expect(onSkip).toHaveBeenCalledWith('speaking_mic_denied')
  })

  it('просто пропуск — speaking_skipped', () => {
    const onSkip = vi.fn()
    render(
      <I18nProvider>
        <SpeakingTask token="t" args={{}} onDone={() => {}} onSkip={onSkip} />
      </I18nProvider>,
    )
    fireEvent.click(screen.getByText('Пропустить говорение'))
    expect(onSkip).toHaveBeenCalledWith('speaking_skipped')
  })

  it('на первом шаге есть проверка микрофона', () => {
    render(
      <I18nProvider>
        <SpeakingTask token="t" args={{}} onDone={() => {}} onSkip={() => {}} />
      </I18nProvider>,
    )
    expect(screen.getByTestId('mic-check')).toBeTruthy()
    expect(screen.getByTestId('mic-test').textContent).toBe('Проверить микрофон')
  })
})
