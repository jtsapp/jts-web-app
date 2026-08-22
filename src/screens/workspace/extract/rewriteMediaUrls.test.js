// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { rewriteMediaUrls, rewriteHtml } from './rewriteMediaUrls.js'

const BASE = 'https://files-dev.justtostudy.kz/development/speakout/a1/lessons/L01.html'

describe('rewriteHtml', () => {
  it('resolves relative src/href against the base URL', () => {
    const out = rewriteHtml('<audio src="audio/x.mp3"></audio><img src="images/a.png"><a href="notes.pdf">n</a>', BASE)
    expect(out).toContain('https://files-dev.justtostudy.kz/development/speakout/a1/lessons/audio/x.mp3')
    expect(out).toContain('https://files-dev.justtostudy.kz/development/speakout/a1/lessons/images/a.png')
    expect(out).toContain('https://files-dev.justtostudy.kz/development/speakout/a1/lessons/notes.pdf')
  })

  it('leaves absolute, protocol-relative, data and anchor URLs untouched', () => {
    const html = '<img src="https://cdn/x.png"><img src="//cdn/y.png"><img src="data:image/png;base64,AAA"><a href="#top">t</a>'
    const out = rewriteHtml(html, BASE)
    expect(out).toContain('src="https://cdn/x.png"')
    expect(out).toContain('src="//cdn/y.png"')
    expect(out).toContain('src="data:image/png;base64,AAA"')
    expect(out).toContain('href="#top"')
  })
})

describe('rewriteMediaUrls', () => {
  it('rewrites media only inside info-block html across steps', () => {
    const lesson = {
      title: 'L',
      steps: [
        { id: 's1', blocks: [
          { type: 'info', html: '<audio src="audio/x.mp3"></audio>' },
          { type: 'practice', questions: [{ id: 'q', type: 'choice', options: ['a'], answer: 'a' }] },
        ] },
      ],
    }
    const out = rewriteMediaUrls(lesson, BASE)
    expect(out.steps[0].blocks[0].html).toContain('/a1/lessons/audio/x.mp3')
    expect(out.steps[0].blocks[1]).toEqual(lesson.steps[0].blocks[1])
  })

  it('rewrites relative audio.src and html on a practice compound block', () => {
    const lesson = {
      title: 'L',
      steps: [{
        id: 's1',
        blocks: [{
          type: 'practice',
          html: '<div class="gconcept"><img src="images/a.png"></div>',
          audio: { src: 'audio/x.mp3' },
          questions: [{ id: 'q', type: 'choice', options: ['a'], answer: 'a' }],
        }],
      }],
    }
    const out = rewriteMediaUrls(lesson, BASE)
    expect(out.steps[0].blocks[0].audio.src).toContain('/a1/lessons/audio/x.mp3')
    expect(out.steps[0].blocks[0].html).toContain('/a1/lessons/images/a.png')
  })

  it('returns the lesson unchanged when base URL is missing', () => {
    const lesson = { steps: [] }
    expect(rewriteMediaUrls(lesson, '')).toBe(lesson)
  })

  it('rewrites relative pictures on vocab cards', () => {
    const lesson = {
      title: 'L',
      steps: [{
        id: 's1',
        blocks: [{
          type: 'vocab',
          cards: [
            { word: 'friend', imageUrl: 'images/friend.webp' },
            { word: 'busy', imageUrl: 'data:image/png;base64,AAA' },
          ],
        }],
      }],
    }
    const out = rewriteMediaUrls(lesson, BASE)
    expect(out.steps[0].blocks[0].cards[0].imageUrl).toBe(
      'https://files-dev.justtostudy.kz/development/speakout/a1/lessons/images/friend.webp',
    )
    expect(out.steps[0].blocks[0].cards[1].imageUrl).toBe('data:image/png;base64,AAA')
  })
})
