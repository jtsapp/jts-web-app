// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import LessonVideoMini from './LessonVideoMini.jsx'

afterEach(cleanup)

function renderMini(overrides = {}) {
  const video = {
    phase: 'connected', micOn: true, camOn: false,
    tiles: [{ userId: '1' }, { userId: '2' }, { userId: '3' }],
    toggleMic: vi.fn(), toggleCamera: vi.fn(), leave: vi.fn(),
    ...overrides,
  }
  const onBack = vi.fn()
  render(<I18nProvider><LessonVideoMini video={video} onBack={onBack} /></I18nProvider>)
  return { video, onBack }
}

describe('LessonVideoMini — плашка звонка на доске', () => {
  it('показывает число участников и не рисует видео', () => {
    renderMini()
    expect(screen.getByText('Участников в звонке: 3')).toBeTruthy()
    expect(document.querySelector('video, .lw-video__media')).toBeNull()
  })

  it('кнопки микрофона, камеры и выхода зовут действия хука', () => {
    const { video } = renderMini()
    const mic = screen.getByRole('button', { name: 'Выключить микрофон' })
    expect(mic.hasAttribute('aria-pressed')).toBe(false)
    fireEvent.click(mic)
    fireEvent.click(screen.getByRole('button', { name: 'Включить камеру' }))
    fireEvent.click(screen.getByRole('button', { name: 'Выйти из звонка' }))
    expect(video.toggleMic).toHaveBeenCalled()
    expect(video.toggleCamera).toHaveBeenCalled()
    expect(video.leave).toHaveBeenCalled()
  })

  it('«К звонку» возвращает на вкладку урока', () => {
    const { onBack } = renderMini()
    fireEvent.click(screen.getByRole('button', { name: 'К звонку' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('вне звонка (idle, failed) плашки нет', () => {
    renderMini({ phase: 'idle' })
    expect(screen.queryByRole('toolbar')).toBeNull()
    cleanup()
    renderMini({ phase: 'failed' })
    expect(screen.queryByRole('toolbar')).toBeNull()
  })

  it('при переподключении плашка остаётся', () => {
    renderMini({ phase: 'reconnecting' })
    expect(screen.getByRole('toolbar')).toBeTruthy()
  })
})
