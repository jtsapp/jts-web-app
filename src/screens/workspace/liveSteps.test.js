import { describe, it, expect, vi } from 'vitest'
import { liveLessonSteps, topicIdAtStep } from './liveSteps.js'

function lesson(overrides = {}) {
  return {
    topics: [
      { id: 't1', title: 'Warm-up' },
      { id: 't2', title: 'Grammar' },
    ],
    steps: [
      {
        id: 's1',
        topicId: 't1',
        title: 'Разминка',
        blocks: [
          { type: 'banner', title: 'Место для\nбаннера' },
          {
            type: 'practice',
            title: 'Выбери верную форму',
            questions: [
              { id: 'q1', type: 'choice', prompt: 'She ____ tea.', options: ['drink', 'drinks'], answer: 'drinks' },
              { id: 'q2', type: 'chips', gapBefore: 'We ', gapAfter: ' chores on Sundays.', bank: ['do', "don't do"], answer: "don't do" },
            ],
          },
        ],
      },
      {
        id: 's2',
        topicId: 't2',
        title: 'Правило',
        blocks: [
          { type: 'theory', title: 'Present Simple', text: 'Привычки и расписание.' },
          {
            type: 'practice',
            title: 'Впиши форму',
            questions: [
              { id: 'q3', type: 'gap', gapBefore: 'Alina ', gapAfter: ' up at 6:30.', answers: ['wakes'] },
              { id: 'q4', type: 'match', prompt: 'Сопоставь', pairs: [{ left: 'rush', right: 'спешить' }] },
            ],
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('liveLessonSteps', () => {
  it('разворачивает вопросы практики в отдельные экраны', () => {
    const steps = liveLessonSteps(lesson())
    // 2 вопроса + правило + 2 вопроса; баннер выброшен.
    expect(steps.map((s) => s.type)).toEqual(['choice', 'choice', 'note', 'gap', 'match'])
  })

  it('выбрасывает декоративный баннер', () => {
    expect(liveLessonSteps(lesson()).some((s) => s.type === 'banner')).toBe(false)
  })

  it('ставит на экран название топика, а не заголовок шага', () => {
    const steps = liveLessonSteps(lesson())
    expect(steps[0].stage).toBe('Warm-up')
    expect(steps[2].stage).toBe('Grammar')
  })

  it('падает на заголовок шага, когда топик не найден', () => {
    const steps = liveLessonSteps(lesson({ topics: [] }))
    expect(steps[0].stage).toBe('Разминка')
  })

  it('переносит картинку вопроса в шаг плеера', () => {
    const withPic = lesson({
      steps: [{ id: 's1', topicId: 't1', blocks: [{ type: 'practice', questions: [
        { id: 'q', type: 'choice', prompt: 'Which word is it?', options: ['busy', 'chat'], answer: 'busy', imageUrl: 'data:image/webp;base64,AAAA' },
      ] }] }],
    })
    expect(liveLessonSteps(withPic)[0].imageUrl).toBe('data:image/webp;base64,AAAA')
  })

  it('без картинки поле не появляется', () => {
    expect('imageUrl' in liveLessonSteps(lesson())[0]).toBe(false)
  })

  it('переносит choice как есть', () => {
    const [choice] = liveLessonSteps(lesson())
    expect(choice).toMatchObject({ type: 'choice', prompt: 'She ____ tea.', options: ['drink', 'drinks'], answer: 'drinks' })
  })

  it('превращает chips в choice с пропуском в вопросе', () => {
    const chips = liveLessonSteps(lesson())[1]
    expect(chips.type).toBe('choice')
    expect(chips.prompt).toBe("We ___ chores on Sundays.")
    expect(chips.options).toEqual(['do', "don't do"])
    expect(chips.answer).toBe("don't do")
  })

  it('переносит gap в поля before/after, которые ждёт плеер', () => {
    const gap = liveLessonSteps(lesson())[3]
    expect(gap).toMatchObject({ type: 'gap', before: 'Alina ', after: ' up at 6:30.', answers: ['wakes'] })
  })

  it('берёт заголовок match из вопроса, а не из блока', () => {
    const match = liveLessonSteps(lesson())[4]
    expect(match.title).toBe('Сопоставь')
    expect(match.pairs).toEqual([{ left: 'rush', right: 'спешить' }])
  })

  it('собирает правило в html карточки', () => {
    const note = liveLessonSteps(lesson())[2]
    expect(note.type).toBe('note')
    expect(note.title).toBe('Present Simple')
    expect(note.html).toContain('Привычки и расписание.')
  })

  it('кладёт формы и таблицу правила в ту же карточку', () => {
    const withTable = lesson({
      steps: [
        {
          id: 's1',
          topicId: 't2',
          blocks: [
            {
              type: 'theory',
              title: 'Правило',
              forms: [{ label: 'he / she / it', example: 'works', accent: true }],
              table: [{ kind: 'Утверждение', example: 'She gets up at seven.' }],
              mistake: 'Does she gets up? → Does she get up?',
            },
          ],
        },
      ],
    })
    const [note] = liveLessonSteps(withTable)
    expect(note.html).toContain('works')
    expect(note.html).toContain('She gets up at seven.')
    expect(note.html).toContain('Does she get up?')
  })

  it('переносит диалог с репликами и вариантами ответа', () => {
    const talk = lesson({
      steps: [
        {
          id: 's1',
          topicId: 't1',
          blocks: [
            {
              type: 'practice',
              questions: [
                {
                  id: 'q',
                  type: 'dialog',
                  prompt: 'Real-life example',
                  bubbles: ["Hi! I'm Sam 👋", 'Do you like coffee? ☕'],
                  options: ['Yes, I like coffee', "No, I don't like coffee"],
                },
              ],
            },
          ],
        },
      ],
    })
    const [dialog] = liveLessonSteps(talk)
    expect(dialog.type).toBe('dialog')
    expect(dialog.title).toBe('Real-life example')
    expect(dialog.bubbles).toEqual(["Hi! I'm Sam 👋", 'Do you like coffee? ☕'])
    expect(dialog.options).toEqual(['Yes, I like coffee', "No, I don't like coffee"])
  })

  // Молчаливая потеря вопроса выглядит как «задание не работает»: на экране
  // просто нет задания, в консоли пусто, и причину ищут сверкой с макетом.
  it('громко жалуется в консоль на неподдержанный тип вопроса', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    liveLessonSteps(
      lesson({ steps: [{ id: 's1', topicId: 't1', blocks: [{ type: 'practice', questions: [{ id: 'q7', type: 'hologram' }] }] }] }),
    )
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toContain('hologram')
    expect(warn.mock.calls[0][1]).toMatchObject({ questionId: 'q7' })
    warn.mockRestore()
  })

  it('пропускает вопрос неизвестного типа, а не отдаёт пустой экран', () => {
    const odd = lesson({
      steps: [{ id: 's1', topicId: 't1', blocks: [{ type: 'practice', questions: [{ id: 'q', type: 'hologram' }] }] }],
    })
    expect(liveLessonSteps(odd)).toEqual([])
  })

  // Регрессия: экстрактор каталога режет упражнение по прямым детям .ex-body,
  // и в реальном уроке (A2, L01) выходит 88 info-блоков на семь шагов сериями
  // до семнадцати подряд. Экран на блок превращал урок в 88 экранов, где
  // инструкция упражнения жила отдельным экраном с кнопкой «Продолжить».
  describe('склейка подряд идущих info', () => {
    const info = (html, title) => ({ type: 'info', html, ...(title ? { title } : {}) })

    it('серия info становится одним экраном', () => {
      const data = lesson({
        steps: [{ id: 's1', topicId: 't1', blocks: [info('<p>1</p>'), info('<p>2</p>'), info('<p>3</p>')] }],
      })
      const out = liveLessonSteps(data)
      expect(out).toHaveLength(1)
      expect(out[0].html).toBe('<p>1</p><p>2</p><p>3</p>')
    })

    it('практика разрывает серию', () => {
      const data = lesson({
        steps: [
          {
            id: 's1',
            topicId: 't1',
            blocks: [
              info('<p>до</p>'),
              { type: 'practice', questions: [{ id: 'q', type: 'choice', prompt: 'p', options: ['a'], answer: 'a' }] },
              info('<p>после</p>'),
            ],
          },
        ],
      })
      expect(liveLessonSteps(data).map((s) => s.type)).toEqual(['note', 'choice', 'note'])
    })

    it('серия в конце шага не теряется', () => {
      const data = lesson({
        steps: [
          {
            id: 's1',
            topicId: 't1',
            blocks: [
              { type: 'practice', questions: [{ id: 'q', type: 'choice', prompt: 'p', options: ['a'], answer: 'a' }] },
              info('<p>хвост</p>'),
            ],
          },
        ],
      })
      const out = liveLessonSteps(data)
      expect(out.map((s) => s.type)).toEqual(['choice', 'note'])
      expect(out[1].html).toBe('<p>хвост</p>')
    })

    it('серии не склеиваются через границу шага', () => {
      const data = lesson({
        steps: [
          { id: 's1', topicId: 't1', blocks: [info('<p>шаг1</p>')] },
          { id: 's2', topicId: 't2', blocks: [info('<p>шаг2</p>')] },
        ],
      })
      const out = liveLessonSteps(data)
      expect(out).toHaveLength(2)
      expect(out[0].stage).toBe('Warm-up')
      expect(out[1].stage).toBe('Grammar')
    })

    it('заголовок серии берётся у первого блока, где он есть', () => {
      const data = lesson({
        steps: [{ id: 's1', topicId: 't1', blocks: [info('<p>1</p>'), info('<p>2</p>', 'Упражнение 3')] }],
      })
      expect(liveLessonSteps(data)[0].title).toBe('Упражнение 3')
    })

    it('урок каталога не разваливается на десятки экранов', () => {
      // Форма реального урока из LessonContent.jsx: 88 info на семь шагов.
      const runs = [17, 14, 12, 11, 9, 8, 17]
      const steps = runs.map((n, i) => ({
        id: `s${i}`,
        title: `Шаг ${i + 1}`,
        blocks: [
          ...Array.from({ length: n }, (_, j) => info(`<p>${j}</p>`)),
          { type: 'practice', questions: [{ id: `q${i}`, type: 'choice', prompt: 'p', options: ['a'], answer: 'a' }] },
        ],
      }))
      const out = liveLessonSteps({ topics: [], steps })
      // Семь экранов правила (по одному на шаг) + семь вопросов, а не 88 + 7.
      expect(out.filter((s) => s.type === 'note')).toHaveLength(7)
      expect(out).toHaveLength(14)
    })
  })

  // Без ссылки на исходный шаг живой урок не свяжет экран плеера ни с маршрутом
  // слева, ни с трансляцией step-progress учителю.
  it('каждый экран помнит id шага урока, из которого собран', () => {
    const out = liveLessonSteps(lesson())
    expect(out.map((s) => s.stepId)).toEqual(['s1', 's1', 's2', 's2', 's2'])
  })

  it('не падает на пустом уроке', () => {
    expect(liveLessonSteps(null)).toEqual([])
    expect(liveLessonSteps({})).toEqual([])
  })
})

describe('topicIdAtStep', () => {
  it('находит топик текущего экрана', () => {
    const data = lesson()
    const steps = liveLessonSteps(data)
    expect(topicIdAtStep(data, steps, 0)).toBe('t1')
    expect(topicIdAtStep(data, steps, 3)).toBe('t2')
  })

  it('отдаёт null, когда топика нет', () => {
    const data = lesson({ topics: [] })
    const steps = liveLessonSteps(data)
    expect(topicIdAtStep(data, steps, 0)).toBe(null)
    expect(topicIdAtStep(data, steps, 99)).toBe(null)
  })
})
