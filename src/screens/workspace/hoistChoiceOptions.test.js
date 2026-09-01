// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { hoistChoiceOptions } from './hoistChoiceOptions.js'

const lesson = (html, type = 'info') => ({
  steps: [{ id: 's2', blocks: [{ type, html }] }],
})

const blocksOf = (result) => result.steps[0].blocks

describe('hoistChoiceOptions', () => {
  it('проверяемый выбор с data-correct становится вопросом choice', () => {
    const out = hoistChoiceOptions(lesson(
      '<div class="mcq"><div class="q">Where is she from?</div>' +
      '<button class="opt">Spain</button>' +
      '<button class="opt" data-correct>Italy</button></div>',
    ))
    const practice = blocksOf(out).find((b) => b.type === 'practice')
    expect(practice.questions).toHaveLength(1)
    expect(practice.questions[0]).toMatchObject({
      type: 'choice', prompt: 'Where is she from?', options: ['Spain', 'Italy'], answer: 'Italy',
    })
  })

  it('несколько верных вариантов — вопрос multi', () => {
    const out = hoistChoiceOptions(lesson(
      '<div class="mcq"><div class="q">Tick what you hear.</div>' +
      '<button class="opt" data-correct>car</button>' +
      '<button class="opt">bus</button>' +
      '<button class="opt" data-correct>train</button></div>',
    ))
    const q = blocksOf(out).find((b) => b.type === 'practice').questions[0]
    expect(q.type).toBe('multi')
    expect(q.answers).toEqual(['car', 'train'])
  })

  // Ключа проверки в разметке нет — придумывать его нельзя: на вопросе «что тебе
  // нравится» ученик получал бы ошибки за собственный вкус.
  it('без data-correct — опрос pick, без верного ответа', () => {
    const out = hoistChoiceOptions(lesson(
      '<div class="row"><p>How often do you read?</p>' +
      '<div class="opts"><button class="opt">often</button><button class="opt">never</button></div></div>',
    ))
    const q = blocksOf(out).find((b) => b.type === 'practice').questions[0]
    expect(q.type).toBe('pick')
    expect(q.options).toEqual(['often', 'never'])
    expect(q.answer).toBeUndefined()
    expect(q.prompt).toBe('How often do you read?')
  })

  it('data-multiple — «отметь сколько хочешь»', () => {
    const out = hoistChoiceOptions(lesson(
      '<div class="pick-q" data-multiple><div class="q">Pick all you like.</div>' +
      '<button class="opt">tea</button><button class="opt">coffee</button></div>',
    ))
    expect(blocksOf(out).find((b) => b.type === 'practice').questions[0]).toMatchObject({
      type: 'pick', multiple: true,
    })
  })

  it('варианты уходят из разметки, а условие задания остаётся на экране', () => {
    const out = hoistChoiceOptions(lesson(
      '<div class="row"><p>Choose the right word.</p>' +
      '<div class="opts"><button class="opt">a</button><button class="opt">an</button></div></div>',
    ))
    const info = blocksOf(out).find((b) => b.type === 'info')
    expect(info.html).toContain('Choose the right word')
    expect(info.html).not.toContain('class="opt"')
  })

  it('вложенные .opts не разбираются дважды', () => {
    const out = hoistChoiceOptions(lesson(
      '<div class="pick-q"><div class="q">Q</div>' +
      '<div class="opts"><button class="opt">yes</button><button class="opt">no</button></div></div>',
    ))
    expect(blocksOf(out).find((b) => b.type === 'practice').questions).toHaveLength(1)
  })

  it('один вариант — не вопрос, разметку не трогаем', () => {
    const html = '<div class="opts"><button class="opt">ok</button></div>'
    const out = hoistChoiceOptions(lesson(html))
    expect(blocksOf(out)).toEqual([{ type: 'info', html }])
  })

  it('в блоке practice варианты добавляются к уже разобранным вопросам', () => {
    const out = hoistChoiceOptions({
      steps: [{
        id: 's3',
        blocks: [{
          type: 'practice',
          questions: [{ id: 'q1', type: 'gap', prompt: 'Fill in' }],
          html: '<div class="mcq"><div class="q">Q2</div>' +
            '<button class="opt" data-correct>yes</button><button class="opt">no</button></div>',
        }],
      }],
    })
    const questions = blocksOf(out)[0].questions
    expect(questions.map((q) => q.type)).toEqual(['gap', 'choice'])
  })

  it('урок без вариантов возвращается как есть', () => {
    const input = lesson('<p>Just text</p>')
    expect(hoistChoiceOptions(input)).toEqual(input)
  })
})
