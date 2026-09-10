import { describe, it, expect } from 'vitest'
import { cardTarget } from './lessonCardTarget.js'
import { lessonCardIds } from './lessonCardId.js'

/**
 * Перевод адреса карточки в место на экране.
 *
 * Главное здесь — склейка: идущие подряд info-блоки лента показывает одной
 * карточкой, и якорь у неё — индекс ПЕРВОГО блока серии. Возьми мы сырой индекс,
 * для второго info-блока якоря не существовало бы, экран открылся бы на шаге и
 * не подъехал никуда.
 */
const info = (html) => ({ type: 'info', html })

function урок() {
  return {
    steps: [
      {
        id: 's1',
        blocks: [
          info('<p>Первый</p>'),
          info('<p>Второй, склеен с первым</p>'),
          { type: 'practice', title: 'Задание', questions: [] },
        ],
      },
      { id: 's2', blocks: [{ type: 'checklist', items: ['I can'] }] },
    ],
  }
}

const адресОт = (lesson, stepIndex, blockIndex) => {
  const ids = lessonCardIds(lesson)
  return ids.get(lesson.steps[stepIndex].blocks[blockIndex])
}

describe('Адрес карточки → место на экране', () => {
  it('первый блок склеенной серии ведёт на свой якорь', () => {
    const l = урок()
    expect(cardTarget(l, адресОт(l, 0, 0))).toEqual({ stepId: 's1', anchorId: 'block-0' })
  })

  /**
   * ВТОРОЙ блок серии: сырой индекс у него 1, а показывается он внутри карточки,
   * начавшейся с нулевого. Якорь обязан быть block-0 — иначе подъезжать некуда.
   */
  it('второй блок склеенной серии ведёт на якорь ПЕРВОГО', () => {
    const l = урок()
    expect(cardTarget(l, адресОт(l, 0, 1))).toEqual({ stepId: 's1', anchorId: 'block-0' })
  })

  it('несклеиваемый блок ведёт на свой собственный якорь', () => {
    const l = урок()
    expect(cardTarget(l, адресОт(l, 0, 2))).toEqual({ stepId: 's1', anchorId: 'block-2' })
  })

  it('карточка из другого шага ведёт в свой шаг', () => {
    const l = урок()
    expect(cardTarget(l, адресОт(l, 1, 0))).toEqual({ stepId: 's2', anchorId: 'block-0' })
  })

  /**
   * Карточку переписали или удалили. Ведём в никуда, а не «примерно туда»:
   * открыть ученику не то, что задали, хуже, чем честно сказать, что задания
   * больше нет.
   */
  it('пропавшая карточка не подменяется соседней', () => {
    expect(cardTarget(урок(), 'cdeadbeef')).toBeNull()
    expect(cardTarget(урок(), null)).toBeNull()
    expect(cardTarget(null, 'cdeadbeef')).toBeNull()
  })
})
