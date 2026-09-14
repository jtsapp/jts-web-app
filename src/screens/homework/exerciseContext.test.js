import { describe, it, expect } from 'vitest'
import { exerciseContext, groupByContext } from './exerciseContext.js'
import КОНТРАКТ from './__fixtures__/homework-exercise-context.json'

// Снимок вопроса ровно в той форме, в какой его кладёт админка.
// Спека: docs/superpowers/specs/2026-09-14-homework-exercise-context.md
const задание = (id, context) => ({
  id,
  question: {
    id: `q${id}`,
    type: 'choice',
    prompt: `Утверждение ${id}`,
    options: ['True', 'False'],
    answer: 'True',
    ...(context ? { context } : {}),
  },
})

const ЗАПИСЬ = { key: 's5#4', audioUrl: 'https://cdn/track.mp3' }
const СТАТЬЯ = { key: 's5#6', articleHtml: '<article class="reading"><p>Arthur Aron</p></article>' }

describe('exerciseContext — что приехало вместе с вопросом', () => {
  it('читает запись и текст из снимка', () => {
    expect(exerciseContext(задание(1, ЗАПИСЬ)).audioUrl).toBe('https://cdn/track.mp3')
    expect(exerciseContext(задание(2, СТАТЬЯ)).articleHtml).toContain('Arthur Aron')
  })

  // Старые выдачи приехали без контекста, и это не повод ломать экран.
  it('без контекста — null', () => {
    expect(exerciseContext(задание(1))).toBeNull()
    expect(exerciseContext(null)).toBeNull()
  })

  it('пустые и чужие значения за контекст не считаются', () => {
    expect(exerciseContext(задание(1, { key: 's1#0' }))).toBeNull()
    expect(exerciseContext(задание(1, { key: 's1#0', audioUrl: '   ' }))).toBeNull()
    expect(exerciseContext(задание(1, 'строка вместо объекта'))).toBeNull()
    expect(exerciseContext(задание(1, { key: 's1#0', audioUrl: 42 }))).toBeNull()
  })
})

describe('groupByContext — контекст показывается один раз', () => {
  it('задания одной карточки складываются в одну группу', () => {
    const группы = groupByContext([задание(1, ЗАПИСЬ), задание(2, ЗАПИСЬ), задание(3, ЗАПИСЬ)])
    expect(группы).toHaveLength(1)
    expect(группы[0].exercises).toHaveLength(3)
    expect(группы[0].context.audioUrl).toBe('https://cdn/track.mp3')
  })

  it('разные карточки — разные группы', () => {
    const группы = groupByContext([задание(1, ЗАПИСЬ), задание(2, СТАТЬЯ)])
    expect(группы).toHaveLength(2)
    expect(группы[0].context.audioUrl).toBe('https://cdn/track.mp3')
    expect(группы[1].context.articleHtml).toContain('Arthur Aron')
  })

  // Порядок заданий свой у каждого ученика: вклинившееся чужое упражнение
  // разрывает группу честно, иначе экран собрал бы вместе разведённое.
  it('чужое задание между своими разрывает группу', () => {
    const группы = groupByContext([задание(1, ЗАПИСЬ), задание(2), задание(3, ЗАПИСЬ)])
    expect(группы.map((g) => g.exercises.length)).toEqual([1, 1, 1])
  })

  it('задания без контекста остаются каждое само по себе', () => {
    const группы = groupByContext([задание(1), задание(2)])
    expect(группы).toHaveLength(2)
    expect(группы[0].context).toBeNull()
  })

  it('пустой список — пустой результат', () => {
    expect(groupByContext([])).toEqual([])
    expect(groupByContext(undefined)).toEqual([])
  })
})

/* Фикстура — пример снимка из спеки; такой же файл лежит в web-admin. Форма
   между репозиториями расходится молча, и обе стороны остаются зелёными: этот
   тест держит её с нашего конца. */
describe('форма снимка из спеки', () => {
  it('читается ровно теми же полями, что кладёт админка', () => {
    const context = exerciseContext({ id: 1, question: КОНТРАКТ.question })
    expect(context).toEqual({
      key: 's5#4',
      audioUrl: 'https://files.example/a0/audio/a0_dfc2ed551f.mp3',
      articleHtml: КОНТРАКТ.question.context.articleHtml,
    })
  })
})
