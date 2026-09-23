import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { fallbackLines, dialogsOf } = require('./voice-course-dialogs.js')

describe('voice-course-dialogs', () => {
  // fallback курса — реплики через « — », собеседники по очереди.
  it('fallback с тире — диалог двумя голосами по очереди', () => {
    expect(fallbackLines("Hello. Are you here on business? — No, I'm not. — Nice.")).toEqual([
      ['Noah', 'Hello. Are you here on business?'],
      ['Grace', "No, I'm not."],
      ['Noah', 'Nice.'],
    ])
  })

  it('fallback без тире — монолог одним голосом', () => {
    expect(fallbackLines("Look outside. It's raining right now.")).toEqual([['Grace', "Look outside. It's raining right now."]])
  })

  // Озвучивается только fallback задания, чей клип в банке курса отсутствует:
  // при живом клипе fallback движок курса не читает, и нам он не нужен.
  it('берёт fallback только у заданий без клипа в банке', () => {
    const course = {
      perItem: { listen: 'listen' },
      audio: { '1:real': 'QUJD' },
      lessons: [
        {
          key: '1',
          groups: [
            {
              t: 'listen',
              items: [
                { clip: 'real', fallback: 'Not needed.' },
                { clip: 'gone', fallback: 'Hi. — Hello.' },
              ],
            },
          ],
        },
      ],
      tests: [],
    }
    const got = dialogsOf('zz', course)
    expect(got).toEqual([{ text: 'Hi. — Hello.', lines: [['Noah', 'Hi.'], ['Grace', 'Hello.']] }])
  })
})
