// @vitest-environment jsdom
//
// Закрытая карточка задания объясняет, почему она закрыта.
//
// Регрессия с видео от ученика: урок на перерыве, ученик пятнадцать секунд жмёт
// True/False, и ничего не происходит. Кнопки действительно были disabled
// (contentReadOnly в LiveLessonPage), но на экране об этом не говорило ничего:
// «Проверить» просто исчезала, а единственное объяснение — баннер перерыва —
// висит наверху страницы, за пределами экрана телефона.
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../../../i18n.jsx'
import PracticeBlock from './PracticeBlock.jsx'

const БЛОК = {
  type: 'practice',
  title: 'Listen. Tick what she likes.',
  questions: [
    { id: 'q1', type: 'choice', prompt: 'Paul is here on business.', options: ['True', 'False'], answer: 'True' },
    { id: 'q2', type: 'choice', prompt: 'Havva is here on business.', options: ['True', 'False'], answer: 'False' },
  ],
}

const ПРИЧИНА = 'Перерыв — ответы пока не принимаются'

function renderBlock(props = {}) {
  return render(
    <I18nProvider>
      <PracticeBlock block={БЛОК} answers={{}} checked={false} onAnswer={() => {}} number={1} {...props} />
    </I18nProvider>,
  )
}

describe('PracticeBlock — почему карточка не принимает ответы', () => {
  it('на живом уроке есть «Проверить» и нет строки о блокировке', () => {
    const { container } = renderBlock()
    expect(container.querySelector('.lw-practice__check')).not.toBeNull()
    expect(container.querySelector('.lw-practice__locked')).toBeNull()
  })

  it('на закрытом уроке вместо «Проверить» написана причина', () => {
    const { container } = renderBlock({ readOnly: true, lockNote: ПРИЧИНА })
    expect(container.querySelector('.lw-practice__check')).toBeNull()
    expect(container.querySelector('.lw-practice__locked')?.textContent).toBe(ПРИЧИНА)
  })

  // Причина стоит ДО списка вопросов: в задании на восемь пунктов строка под
  // ними оказалась бы там же, где и баннер урока, — за краем экрана.
  it('причина написана выше вопросов, а не под ними', () => {
    const { container } = renderBlock({ readOnly: true, lockNote: ПРИЧИНА })
    const note = container.querySelector('.lw-practice__locked')
    const list = container.querySelector('.lw-practice__list')
    expect(note.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // Преподавателю причину не пишут (у него урок закрыт всё занятие), и карточка
  // не должна показывать пустую полосу вместо текста.
  it('без причины строки нет вовсе', () => {
    const { container } = renderBlock({ readOnly: true })
    expect(container.querySelector('.lw-practice__locked')).toBeNull()
  })

  // Карточке без вопросов закрывать нечего — строка там была бы шумом.
  it('в карточке без заданий строки нет', () => {
    const { container } = renderBlock({
      block: { type: 'practice', title: 'Просто текст', html: '<p>Read this.</p>' },
      readOnly: true,
      lockNote: ПРИЧИНА,
    })
    expect(container.querySelector('.lw-practice__locked')).toBeNull()
  })
})
