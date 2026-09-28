// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { openMultiSpeakerAudio } from './openMultiSpeakerAudio.js'

describe('openMultiSpeakerAudio', () => {
  it('A2 The things in our homes — верхний плеер доигрывает всех троих', () => {
    const steps = openMultiSpeakerAudio([
      {
        id: 's-homes',
        title: 'Listening',
        blocks: [
          {
            type: 'practice',
            title: 'The things in our homes',
            instruction: 'Listen to the three speakers. What does each one miss from home?',
            audio: { src: '../audio/Track_2.6.mp3#t=3.5,28.2', title: 'Navigate B1 · Audio 2.6' },
            questions: [
              { id: 'q1', type: 'choice', prompt: 'Speaker 1', options: ['family', 'food'], answer: 'family' },
            ],
          },
        ],
      },
    ])

    expect(steps[0].blocks[0].audio.src).toBe('../audio/Track_2.6.mp3#t=3.5')
  })

  it('обычный отрывок одной фразы не трогает', () => {
    const src = '../audio/Track_2.4.mp3#t=3.77,19.74'
    const steps = openMultiSpeakerAudio([
      {
        id: 's1',
        title: 'Practice',
        blocks: [
          {
            type: 'practice',
            instruction: 'Listen to the sentence. Which linker do you hear?',
            audio: { src },
            questions: [],
          },
        ],
      },
    ])

    expect(steps[0].blocks[0].audio.src).toBe(src)
  })

  it('html не меняет — адрес карточки остаётся', () => {
    const html = '<p class="track"><audio src="x.mp3#t=3,20"></audio></p>'
    const steps = openMultiSpeakerAudio([
      {
        id: 's1',
        title: 'Listening',
        blocks: [
          {
            type: 'practice',
            instruction: 'Listen to three speakers.',
            html,
            audio: { src: 'x.mp3#t=3,20' },
            questions: [],
          },
        ],
      },
    ])

    expect(steps[0].blocks[0].html).toBe(html)
  })
})
