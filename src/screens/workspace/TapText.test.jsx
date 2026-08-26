// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import TapText from './TapText.jsx'

/**
 * Тап-перевод в формулировках вопросов и пропусках.
 *
 * Регрессия: у ученика работал только перевод одного слова, хотя выделение до
 * 100 символов умеет и остальной урок. Причина — клик по слову. Он приходит
 * СЛЕДОМ за mouseup, которым родитель (LessonContent / CourseStepPlayer /
 * LessonPlayer) уже перевёл выделенную фразу, и перебивал её одним словом.
 * `InfoBlock` и `PracticeBlock` от этого защищались, `TapText` — нет.
 */
function withSelection(text) {
  vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => text })
}

afterEach(() => vi.restoreAllMocks())

describe('TapText — слово и фраза', () => {
  it('без выделения клик переводит слово', () => {
    withSelection('')
    const onWord = vi.fn()
    const { container } = render(<TapText text="Stand too close" onWord={onWord} />)

    fireEvent.click(container.querySelectorAll('.lw-tap-w')[0])

    expect(onWord).toHaveBeenCalledTimes(1)
    expect(onWord.mock.calls[0][0]).toBe('Stand')
  })

  it('выделена фраза — клик по слову её не перебивает', () => {
    withSelection('Stand too close and you may make somebody feel awkward')
    const onWord = vi.fn()
    const { container } = render(<TapText text="Stand too close" onWord={onWord} />)

    fireEvent.click(container.querySelectorAll('.lw-tap-w')[0])

    expect(onWord).not.toHaveBeenCalled()
  })

  /* Выделили больше сотни символов — родитель показывает «не более 100
     символов». Клик по слову не должен подменять это сообщение переводом. */
  it('выделение длиннее лимита — клик по слову тоже молчит', () => {
    withSelection('a'.repeat(60) + ' ' + 'b'.repeat(60))
    const onWord = vi.fn()
    const { container } = render(<TapText text="Stand too close" onWord={onWord} />)

    fireEvent.click(container.querySelectorAll('.lw-tap-w')[0])

    expect(onWord).not.toHaveBeenCalled()
  })

  /* Выделение внутри одного слова — это не фраза: перевести его всё ещё надо. */
  it('выделено одно слово — перевод слова работает', () => {
    withSelection('Stand')
    const onWord = vi.fn()
    const { container } = render(<TapText text="Stand too close" onWord={onWord} />)

    fireEvent.click(container.querySelectorAll('.lw-tap-w')[0])

    expect(onWord).toHaveBeenCalledTimes(1)
  })

  it('без onWord текст остаётся обычным, без span-ов', () => {
    const { container } = render(<TapText text="Stand too close" />)

    expect(container.querySelectorAll('.lw-tap-w').length).toBe(0)
    expect(container.textContent).toBe('Stand too close')
  })
})
