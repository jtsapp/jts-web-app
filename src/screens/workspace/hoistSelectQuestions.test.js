// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { hoistSelectQuestions } from './hoistSelectQuestions.js'

describe('hoistSelectQuestions', () => {
  it('достаёт leftover <select> из info и делает choice, как у остальных вопросов', () => {
    const lesson = {
      steps: [
        {
          id: 'talk',
          blocks: [
            {
              type: 'info',
              html: `
                <p class="instruction">Choose the sentence closest in meaning.</p>
                <div class="row"><span class="num">1</span> She rather dominated the conversation.
                  <select data-answer="She talked more than everyone else.">
                    <option value="">—</option>
                    <option>She was rude to the other guests.</option>
                    <option>She talked more than everyone else.</option>
                  </select>
                </div>`,
            },
          ],
        },
      ],
    }

    const out = hoistSelectQuestions(lesson)
    const blocks = out.steps[0].blocks
    expect(blocks.map((b) => b.type)).toEqual(['info', 'practice'])
    expect(blocks[0].html).toContain('Choose the sentence')
    expect(blocks[0].html).not.toContain('<select')
    const question = blocks[1].questions[0]
    expect(question.type).toBe('choice')
    expect(question.prompt).toContain('dominated')
    expect(question.options).toContain('She talked more than everyone else.')
    expect(question.answer).toBe('She talked more than everyone else.')
    expect(question.open).toBeUndefined()
  })

  it('без data-answer оставляет вопрос открытым — ответ всё равно уходит в live-sync', () => {
    const lesson = {
      steps: [
        {
          id: 'odd',
          blocks: [
            {
              type: 'info',
              html: `<div class="row"><select>
                <option value="">—</option>
                <option>entertaining</option>
                <option>cut in</option>
                <option>argue</option>
              </select></div>`,
            },
          ],
        },
      ],
    }
    const question = hoistSelectQuestions(lesson).steps[0].blocks[0].questions[0]
    expect(question.open).toBe(true)
    expect(question.options).toEqual(['entertaining', 'cut in', 'argue'])
  })

  it('не поднимает <select> скорости из плеера в задание', () => {
    const lesson = {
      steps: [
        {
          id: 'listen',
          blocks: [
            {
              type: 'info',
              html: `<div class="player" data-track="a11">
                <div class="meta"><b>The rules of conversation</b>Navigate B2</div>
                <label class="rate">Speed
                  <select><option value="1">1×</option><option value="0.85">0.85×</option><option value="0.75">0.75×</option></select>
                </label>
              </div>`,
            },
          ],
        },
      ],
    }
    const out = hoistSelectQuestions(lesson)
    expect(out.steps[0].blocks).toHaveLength(1)
    expect(out.steps[0].blocks[0].type).toBe('info')
    expect(out.steps[0].blocks[0].html).toContain('select')
  })

  it('выкидывает уже сохранённый вопрос со скоростью воспроизведения', () => {
    const lesson = {
      steps: [
        {
          id: 'listen',
          blocks: [
            {
              type: 'practice',
              questions: [
                { id: 'spd', type: 'choice', prompt: 'Speed', options: ['1×', '0.85×', '0.75×'], open: true },
                { id: 'q1', type: 'choice', prompt: 'Who speaks first?', options: ['Anna', 'Ben'], answer: 'Anna' },
              ],
            },
          ],
        },
      ],
    }
    const questions = hoistSelectQuestions(lesson).steps[0].blocks[0].questions
    expect(questions).toHaveLength(1)
    expect(questions[0].prompt).toContain('Who speaks first')
  })

  it('убирает карточку, если в ней была только скорость плеера', () => {
    const lesson = {
      steps: [
        {
          id: 'listen',
          blocks: [
            {
              type: 'practice',
              questions: [{ id: 'spd', type: 'choice', prompt: 'Speed', options: ['1x', '0.85x', '0.75x'] }],
            },
          ],
        },
      ],
    }
    expect(hoistSelectQuestions(lesson).steps[0].blocks).toEqual([])
  })
})
