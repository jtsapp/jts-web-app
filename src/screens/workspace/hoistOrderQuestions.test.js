// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  hoistOrderQuestions,
  orderFromCourseOrder,
  orderFromOrderQ,
} from './hoistOrderQuestions.js'

describe('orderFromCourseOrder', () => {
  it('reads data-order + data-val into words and answer', () => {
    document.body.innerHTML = `
      <div class="order" data-order="w3,w5,w1,w4,w2">
        <button class="ochip" data-val="w1"><span class="txt">you</span></button>
        <button class="ochip" data-val="w2"><span class="txt">each other?</span></button>
        <button class="ochip" data-val="w3"><span class="txt">how long</span></button>
        <button class="ochip" data-val="w4"><span class="txt">known</span></button>
        <button class="ochip" data-val="w5"><span class="txt">have</span></button>
      </div>`
    const q = orderFromCourseOrder(document.querySelector('.order'), 's1-o0')
    expect(q).toMatchObject({
      id: 's1-o0',
      type: 'order',
      words: ['you', 'each other?', 'how long', 'known', 'have'],
      answer: ['how long', 'have', 'you', 'known', 'each other?'],
    })
  })
})

describe('orderFromOrderQ', () => {
  it('reads converted data-rank chips', () => {
    document.body.innerHTML = `
      <div class="order-q">
        <button class="ochip" data-rank="3">you</button>
        <button class="ochip" data-rank="1">how long</button>
        <button class="ochip" data-rank="2">have</button>
      </div>`
    const q = orderFromOrderQ(document.querySelector('.order-q'), 's1-o1')
    expect(q.answer).toEqual(['how long', 'have', 'you'])
    expect(q.words).toEqual(['you', 'how long', 'have'])
  })
})

describe('hoistOrderQuestions', () => {
  it('lifts dead .order chips out of info into a practice card', () => {
    const lesson = hoistOrderQuestions({
      title: 'L1',
      steps: [
        {
          id: 's4',
          title: 'Practice',
          blocks: [
            {
              type: 'info',
              html: `
                <div class="instruction">7 · Build the questions.</div>
                <div class="row"><span class="num">1</span><span class="body">
                  <div class="order" data-order="w3,w5,w1,w4,w2">
                    <button class="ochip" data-val="w1"><span class="txt">you</span></button>
                    <button class="ochip" data-val="w2"><span class="txt">each other?</span></button>
                    <button class="ochip" data-val="w3"><span class="txt">how long</span></button>
                    <button class="ochip" data-val="w4"><span class="txt">known</span></button>
                    <button class="ochip" data-val="w5"><span class="txt">have</span></button>
                  </div>
                </span></div>
                <div class="row"><span class="num">2</span><span class="body">
                  <div class="order" data-order="b4,b2,b5,b1,b3">
                    <button class="ochip" data-val="b1"><span class="txt">up</span></button>
                    <button class="ochip" data-val="b2"><span class="txt">often</span></button>
                    <button class="ochip" data-val="b3"><span class="txt">with them?</span></button>
                    <button class="ochip" data-val="b4"><span class="txt">how</span></button>
                    <button class="ochip" data-val="b5"><span class="txt">do you meet</span></button>
                  </div>
                </span></div>`,
            },
          ],
        },
      ],
    })

    const blocks = lesson.steps[0].blocks
    const practice = blocks.find((b) => b.type === 'practice')
    expect(practice?.questions).toHaveLength(2)
    expect(practice.questions.every((q) => q.type === 'order')).toBe(true)
    expect(practice.questions[0].answer).toEqual([
      'how long',
      'have',
      'you',
      'known',
      'each other?',
    ])
    expect(practice.questions[1].answer[0]).toBe('how')
    // Instruction may remain as info; chips must be gone.
    const leftover = JSON.stringify(blocks)
    expect(leftover).not.toMatch(/class="order"/)
    expect(leftover).not.toMatch(/ochip/)
  })
})
