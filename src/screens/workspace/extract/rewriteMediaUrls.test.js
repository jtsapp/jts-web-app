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

  it('turns a B2 custom player into a real <audio> and does not leave the speed <select>', () => {
    const html = `
      <div class="player" data-track="a11">
        <div class="meta"><b>The rules of conversation</b>Navigate B2 · Audio 1.1</div>
        <button class="btn btn-audio pp" type="button">Play</button>
        <div class="bar"><i></i></div>
        <span class="time">0:00 / --:--</span>
        <label class="rate">Speed
          <select><option value="1">1×</option><option value="0.85">0.85×</option></select>
        </label>
      </div>`
    const out = rewriteHtml(html, BASE)
    expect(out).toContain('<audio')
    expect(out).toContain('/a1/audio/a11.mp3')
    expect(out).not.toContain('<select')
    expect(out).not.toContain('0:00 / --:--')
    expect(out).toContain('The rules of conversation')
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
    expect(rewriteMediaUrls(lesson, '')).toEqual(lesson)
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

/**
 * Иллюстрация к тексту чтения ссылается на картинку по ключу, а сама картинка
 * лежит на словарной карточке того же урока. Подставлять её должен скрипт
 * курса, которого в приложении нет, — и у ученика оставался alt вместо
 * картинки (репорт «Упр картинки нет A2», урок L07).
 */
describe('картинки по ключу', () => {
  const PIC = 'data:image/webp;base64,AAAA'

  it('подставляет источник картинке без src по её data-img', () => {
    const lesson = {
      steps: [
        { blocks: [{ type: 'vocab', cards: [{ word: 'balloon', imageUrl: PIC }] }] },
        { blocks: [{ html: '<img data-img="balloon" alt="A giant helium balloon">' }] },
      ],
    }

    const out = rewriteMediaUrls(lesson, BASE)

    expect(out.steps[1].blocks[0].html).toContain(`src="${PIC}"`)
  })

  it('берёт картинку и из разметки другого блока, не только из колоды', () => {
    // В файле курса тот же снимок лежит на словарной карточке внутри html:
    // <img class="vc-img" alt="balloon" src="data:…">.
    const lesson = {
      steps: [
        { blocks: [{ html: `<img class="vc-img" alt="balloon" src="${PIC}">` }] },
        { blocks: [{ html: '<img data-img="balloon" alt="подпись">' }] },
      ],
    }

    const out = rewriteMediaUrls(lesson, BASE)

    expect(out.steps[1].blocks[0].html).toContain(`src="${PIC}"`)
  })

  it('ключ сверяется без учёта регистра и пробелов', () => {
    const lesson = {
      steps: [
        { blocks: [{ type: 'vocab', cards: [{ word: 'Take Off', imageUrl: PIC }] }] },
        { blocks: [{ html: '<img data-img=" take off ">' }] },
      ],
    }

    expect(rewriteMediaUrls(lesson, BASE).steps[1].blocks[0].html).toContain(`src="${PIC}"`)
  })

  it('свой src не перебивает', () => {
    // Ключ есть, но картинка уже своя: подменять её чужой — потерять ту, что
    // автор поставил намеренно.
    const lesson = {
      steps: [
        { blocks: [{ type: 'vocab', cards: [{ word: 'balloon', imageUrl: PIC }] }] },
        { blocks: [{ html: '<img data-img="balloon" src="https://example.com/own.jpg">' }] },
      ],
    }

    expect(rewriteMediaUrls(lesson, BASE).steps[1].blocks[0].html).toContain('own.jpg')
  })

  it('ключа нет в уроке — разметку оставляет как есть', () => {
    const lesson = { steps: [{ blocks: [{ html: '<img data-img="ghost" alt="нет такой">' }] }] }

    expect(rewriteMediaUrls(lesson, BASE).steps[0].blocks[0].html).not.toContain('src=')
  })
})
