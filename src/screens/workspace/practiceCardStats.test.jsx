// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { I18nProvider } from '../../i18n.jsx'
import LessonContent, { practiceCardStats } from './LessonContent.jsx'

// Шаг реального урока: задания идут не подряд — между ними теория и серия
// info-блоков, которые LessonContent склеивает в одну карточку.
const STEP = {
  id: 's1',
  blocks: [
    { type: 'theory', title: 'Правило', text: 'Present Perfect' },
    { type: 'practice', title: 'Раскройте скобки', questions: [{ id: 'q1', type: 'gap', answers: ['have been'] }] },
    { type: 'info', html: '<p>1</p>' },
    { type: 'info', html: '<p>2</p>' },
    { type: 'practice', title: 'Составьте предложения', questions: [{ id: 'q2', type: 'gap', answers: ['just'] }] },
    { type: 'practice', title: 'Выберите вариант', questions: [{ id: 'q3', type: 'choice', options: ['have', 'has'], answer: 'have' }] },
  ],
}

// Ключи карточек — позиция в потоке groupBlocks: theory(0), practice(1),
// склеенные info(2), practice(3), practice(4).
const K1 = 's1:1'
const K2 = 's1:3'
const K3 = 's1:4'

describe('practiceCardStats — нумерация заданий шага', () => {
  it('считает только практики, а не все блоки подряд', () => {
    const stats = practiceCardStats(STEP, new Set())
    expect(stats.total).toBe(3)
    expect(stats.numberByKey).toEqual({ [K1]: 1, [K2]: 2, [K3]: 3 })
  })

  it('текущее задание — первое непроверенное', () => {
    const stats = practiceCardStats(STEP, new Set([K1]))
    expect(stats.current).toBe(2)
    expect(stats.currentKey).toBe(K2)
  })

  // «Задание 4 из 3» читалось бы опечаткой, а не «тема пройдена».
  it('все задания проверены — счётчик стоит на последнем, а не за списком', () => {
    const stats = practiceCardStats(STEP, new Set([K1, K2, K3]))
    expect(stats.current).toBe(3)
    expect(stats.total).toBe(3)
    expect(stats.currentKey).toBe(K3)
  })

  it('в теме без заданий считать нечего', () => {
    const stats = practiceCardStats({ id: 's2', blocks: [{ type: 'theory', title: 'Правило' }] }, new Set())
    expect(stats).toMatchObject({ total: 0, current: 0, currentKey: null })
  })
})

function renderContent(props = {}) {
  return render(
    <I18nProvider>
      <LessonContent
        step={STEP}
        answers={{}}
        checkedKeys={new Set()}
        onAnswer={() => {}}
        onCheck={() => {}}
        readOnly={false}
        {...props}
      />
    </I18nProvider>
  )
}

describe('LessonContent — номер и состояние карточки задания', () => {
  it('карточки пронумерованы по порядку заданий', () => {
    const { container } = renderContent()
    const nums = [...container.querySelectorAll('.lw-practice__num')].map((n) => n.textContent)
    expect(nums).toEqual(['1', '2', '3'])
  })

  it('текущее задание одно — первое непроверенное', () => {
    const { container } = renderContent({ checkedKeys: new Set([K1]) })
    const current = container.querySelectorAll('.lw-practice.is-current')
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toContain('Составьте предложения')
  })

  it('у проверенного задания вместо цифры галочка', () => {
    const { container } = renderContent({ checkedKeys: new Set([K1]) })
    const done = container.querySelector('.lw-practice.is-done .lw-practice__num')
    expect(done.querySelector('svg')).toBeTruthy()
    expect(done.textContent).toBe('')
  })

  // Указка преподавателя: бейдж встаёт на ту карточку, куда он навёл, —
  // и когда указано на блок целиком, и когда на вопрос внутри него.
  it('бейдж «Подсвечено у учителя» — на карточке с указкой', () => {
    const { container } = renderContent({ liveQuestionId: 'q3' })
    const flagged = container.querySelectorAll('.lw-practice.is-highlighted')
    expect(flagged).toHaveLength(1)
    expect(flagged[0].textContent).toContain('Выберите вариант')
    expect(container.querySelectorAll('.lw-practice__flag')).toHaveLength(1)
  })

  it('без указки бейджей нет', () => {
    const { container } = renderContent()
    expect(container.querySelectorAll('.lw-practice__flag')).toHaveLength(0)
  })

  it('в заголовке карточки нет второго номера, если курс прислал «3 · …»', () => {
    const numbered = {
      id: 's9',
      blocks: [
        {
          type: 'practice',
          title: '3 · Choose the sentence closest in meaning.',
          questions: [{ id: 'q1', type: 'choice', options: ['a', 'b'], answer: 'a' }],
        },
      ],
    }
    const { container } = render(
      <I18nProvider>
        <LessonContent
          step={numbered}
          answers={{}}
          checkedKeys={new Set()}
          onAnswer={() => {}}
          onCheck={() => {}}
        />
      </I18nProvider>,
    )
    expect(container.querySelector('.lw-practice__num')?.textContent).toBe('1')
    expect(container.querySelector('.lw-practice__title')?.textContent).toBe(
      'Choose the sentence closest in meaning.',
    )
  })
})
