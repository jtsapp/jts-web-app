import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { listenScreens, strip } = require('./build-course-steps.js')

// Дорожка в уроке одна на всю стадию, а вопросов к ней несколько. По одному
// вопросу на экран студент слушал запись заново на каждом — в B1 это пять
// экранов подряд на один и тот же трек.
describe('build-course-steps — вопросы к записи', () => {
  const q = (title, prompt, answer, options) => ({ stage: 'Listening', type: 'choice', title, prompt, options, answer })

  it('вопросы под одной инструкцией собираются в экран-список с дорожкой', () => {
    const out = listenScreens(
      [
        q('Listen once. Who says what?', 'The person with 150 friends is', 'S, the woman', ['J, the man', 'S, the woman']),
        q('Listen once. Who says what?', 'The two speakers', 'disagree', ['agree', 'disagree']),
      ],
      'Track_1.1.mp3',
    )

    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ type: 'rows', stage: 'Listening', title: 'Listen once. Who says what?', track: 'Track_1.1.mp3' })
    expect(out[0].items).toEqual([
      { q: 'The person with 150 friends is', options: ['J, the man', 'S, the woman'], answer: 'S, the woman' },
      { q: 'The two speakers', options: ['agree', 'disagree'], answer: 'disagree' },
    ])
  })

  // У одной записи бывает несколько разных заданий, и склеивать их под общим
  // заголовком нельзя: инструкция врёт про то, что надо сделать.
  it('смена инструкции рвёт серию', () => {
    const out = listenScreens(
      [
        q('Listen once.', 'a', '1', ['1', '2']),
        q('Listen once.', 'b', '2', ['1', '2']),
        q('Listen again. True or false?', 'c', 'True', ['True', 'False']),
        q('Listen again. True or false?', 'd', 'False', ['True', 'False']),
      ],
      'T.mp3',
    )

    expect(out.map((s) => s.title)).toEqual(['Listen once.', 'Listen again. True or false?'])
    expect(out.map((s) => s.items.length)).toEqual([2, 2])
  })

  it('одинокий вопрос остаётся обычным экраном слушания', () => {
    const out = listenScreens([q('Listen.', 'a', '1', ['1', '2'])], 'T.mp3')
    expect(out).toEqual([{ stage: 'Listening', type: 'listen', title: 'Listen.', prompt: 'a', options: ['1', '2'], answer: '1', track: 'T.mp3' }])
  })

  it('длинная серия режется по шесть, дорожка остаётся на каждом экране', () => {
    const many = Array.from({ length: 9 }, (_, i) => q('Listen.', `q${i}`, '1', ['1', '2']))
    const out = listenScreens(many, 'T.mp3')
    expect(out.map((s) => s.items.length)).toEqual([6, 3])
    out.forEach((s) => expect(s.track).toBe('T.mp3'))
  })
})

// Сущности раскрывались цепочкой replace, и список отставал от контента: в
// шагах осталось 248 неразобранных «&ldquo;» — студент читал их в вопросе.
describe('build-course-steps — html-сущности', () => {
  it('именованные и числовые сущности раскрываются', () => {
    expect(strip('&ldquo;We meet up&rdquo; &rarr; caf&eacute; &#9654;')).toBe('“We meet up” → café ▶')
  })

  it('неизвестная сущность остаётся как есть, а не пропадает', () => {
    expect(strip('a &zzz; b')).toBe('a &zzz; b')
  })
})
