// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import LessonContent, { groupBlocks } from './LessonContent.jsx'

// Регрессия на расхождение экранов ученика и преподавателя.
//
// Урок каталога приезжает ученику разобранным на блоки, и экстрактор режет тело
// упражнения по прямым детям `.ex-body`: инструкция, подсказка под ней и сама
// разметка — три отдельных info-блока. В реальном уроке (A2, L01) их 88 на семь
// шагов, сериями до семнадцати подряд. Карточка на блок давала стопку из двух
// десятков белых плашек там, где у преподавателя один поток.

const INFO = (html) => ({ type: 'info', html })
const PRACTICE = {
  type: 'practice',
  title: 'Практика',
  questions: [{ id: 'q1', type: 'choice', prompt: 'A?', options: ['a', 'b'], answer: 'a' }],
}

function renderContent(blocks) {
  return render(
    <I18nProvider>
      <LessonContent step={{ blocks }} answers={{}} checked={false} onAnswer={() => {}} onCheck={() => {}} />
    </I18nProvider>
  )
}

describe('groupBlocks — поток вместо стопки карточек', () => {
  it('соседние info-блоки складываются в одну группу', () => {
    const groups = groupBlocks([INFO('<p>1</p>'), INFO('<p>2</p>'), INFO('<p>3</p>')])
    expect(groups).toHaveLength(1)
    expect(groups[0].type).toBe('info')
    expect(groups[0].blocks).toHaveLength(3)
  })

  it('практика между ними разрывает группу, а не поглощается ею', () => {
    const groups = groupBlocks([INFO('<p>1</p>'), PRACTICE, INFO('<p>2</p>')])
    expect(groups.map((g) => g.type)).toEqual(['info', 'single', 'info'])
    expect(groups[0].blocks).toHaveLength(1)
    expect(groups[2].blocks).toHaveLength(1)
  })

  it('порядок блоков сохраняется — шаг mcq → match → mcq не перегруппировывается', () => {
    const groups = groupBlocks([PRACTICE, INFO('<p>между</p>'), PRACTICE])
    expect(groups.map((g) => g.type)).toEqual(['single', 'info', 'single'])
  })

  it('пустой шаг не роняет рендер', () => {
    expect(groupBlocks(undefined)).toEqual([])
    expect(groupBlocks([])).toEqual([])
  })
})

describe('LessonContent — карточки шага', () => {
  it('серия из семнадцати info-блоков — одна карточка, а не семнадцать', () => {
    const blocks = Array.from({ length: 17 }, (_, i) => INFO(`<p>${i}</p>`))
    const { container } = renderContent(blocks)

    expect(container.querySelectorAll('.lw-info')).toHaveLength(1)
    expect(container.querySelectorAll('.lw-info__item')).toHaveLength(17)
  })

  it('содержимое всех блоков серии доезжает до экрана', () => {
    const { container } = renderContent([INFO('<p>первый</p>'), INFO('<p>второй</p>')])
    expect(container.querySelector('.lw-info').textContent).toContain('первый')
    expect(container.querySelector('.lw-info').textContent).toContain('второй')
  })

  it('заголовок блока остаётся заголовком внутри общей карточки', () => {
    const { container } = renderContent([{ type: 'info', title: 'Цель', html: '<p>текст</p>' }])
    expect(container.querySelector('.lw-info__title').textContent).toBe('Цель')
  })

  it('practice-блок сохраняет свою карточку и вопросы', () => {
    const { container } = renderContent([INFO('<p>инструкция</p>'), PRACTICE])
    expect(container.querySelectorAll('.lw-practice')).toHaveLength(1)
    expect(container.querySelectorAll('.lw-info')).toHaveLength(1)
  })

  it('theory и banner не сливаются с info', () => {
    const { container } = renderContent([
      INFO('<p>раз</p>'),
      { type: 'theory', title: 'Правило', text: 'Текст' },
      INFO('<p>два</p>'),
    ])
    expect(container.querySelectorAll('.lw-theory')).toHaveLength(1)
    expect(container.querySelectorAll('.lw-info')).toHaveLength(2)
  })
})
