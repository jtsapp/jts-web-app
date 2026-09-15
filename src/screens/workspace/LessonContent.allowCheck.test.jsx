// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import LessonContent from './LessonContent.jsx'

/**
 * Режим теста: отвечать можно, проверять по одному — нельзя.
 *
 * Рычаг отдельный от readOnly намеренно: тот запрещает и ввод, а в юнит-тесте
 * ученик отвечает свободно — у него нет только покарточной «Проверить», потому
 * что кнопка сдачи одна и стоит внизу урока.
 */
const ШАГ = {
  id: 's1',
  title: 'Grammar',
  blocks: [{
    type: 'practice', title: 'Choose',
    questions: [{ id: 'q1', type: 'choice', prompt: 'He ___ ready.', options: ['is', 'are'], answer: 'is' }],
  }],
}

function show(props = {}) {
  return render(
    <I18nProvider>
      <LessonContent
        step={ШАГ}
        answers={{ q1: 'are' }}
        checkedKeys={new Set()}
        onAnswer={() => {}}
        onCheck={() => {}}
        readOnly={false}
        {...props}
      />
    </I18nProvider>,
  )
}

beforeEach(() => {
  // jsdom не умеет ни прокрутку, ни CSS.escape — в браузерах есть оба.
  Element.prototype.scrollIntoView = vi.fn()
  globalThis.CSS = globalThis.CSS || { escape: (v) => v }
})

describe('покарточная проверка', () => {
  it('по умолчанию кнопка «Проверить» на месте', () => {
    const { container } = show()
    expect(container.querySelectorAll('.lw-practice__check')).toHaveLength(1)
  })

  it('allowCheck=false убирает кнопку, но отвечать не мешает', () => {
    const onAnswer = vi.fn()
    const { container, getByText } = show({ allowCheck: false, onAnswer })

    expect(container.querySelectorAll('.lw-practice__check')).toHaveLength(0)
    // Варианты живые: заперты они только readOnly, которого тут нет.
    fireEvent.click(getByText('is'))
    expect(onAnswer).toHaveBeenCalledWith('q1', 'is')
  })

  it('readOnly по-прежнему запирает и ввод, и проверку', () => {
    const onAnswer = vi.fn()
    const { container, getByText } = show({ readOnly: true, onAnswer })

    expect(container.querySelectorAll('.lw-practice__check')).toHaveLength(0)
    fireEvent.click(getByText('is'))
    expect(onAnswer).not.toHaveBeenCalled()
  })
})
