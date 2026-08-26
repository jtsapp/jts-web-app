// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { hoistStepLead, leadTextFromInfoHtml } from './hoistStepLead.js'

describe('hoistStepLead', () => {
  it('lifts a bare one-line info <p> into step.subtitle', () => {
    const step = hoistStepLead({
      id: 's3',
      order: 3,
      title: 'Usual, now, or from the past until now',
      blocks: [
        { type: 'info', html: '<p>Three present forms, one decision.</p>' },
        {
          type: 'practice',
          title: 'Usual, now, or from the past until now',
          questions: [{ id: 'q1', type: 'choice', prompt: 'Which?', options: ['a'], answer: 'a' }],
        },
      ],
    })
    expect(step.subtitle).toBe('Three present forms, one decision.')
    expect(step.blocks).toHaveLength(1)
    expect(step.blocks[0].type).toBe('practice')
  })

  it('does not hoist a lead that repeats the stage title', () => {
    const step = hoistStepLead({
      id: 's1',
      title: 'Talking, and talking badly',
      subtitle: 'Talking, and talking badly',
      blocks: [{ type: 'practice', title: 'Q', questions: [] }],
    })
    expect(step.subtitle).toBeUndefined()
  })

  it('does not hoist long reading paragraphs', () => {
    const html =
      '<p>I get on well with a lot of people at work. We are not speaking at the moment. I have fallen out with a friend and I have known her since school, which is a long story.</p>'
    expect(leadTextFromInfoHtml(html)).toBeUndefined()
  })
})
