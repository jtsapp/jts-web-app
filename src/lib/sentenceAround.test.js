// @vitest-environment jsdom
// Пример для «Моего словаря» — предложение, где ученик нажал на слово (отзыв АруЖан, 03.11.2026).
import { describe, it, expect } from 'vitest'
import { sentenceAround } from './sentenceAround.js'

function wordIn(html, word) {
  const box = document.createElement('div')
  box.innerHTML = html
  return [...box.querySelectorAll('span')].find((s) => s.textContent === word)
}

describe('sentenceAround', () => {
  it('отдаёт предложение со словом, а не весь абзац', () => {
    const el = wordIn('<p>I have <span>worked</span> here for three months. It was hard.</p>', 'worked')
    expect(sentenceAround(el, 'worked')).toBe('I have worked here for three months.')
  })
  it('слово во втором предложении', () => {
    const el = wordIn('<p>I came late. It was <span>hard</span>!</p>', 'hard')
    expect(sentenceAround(el, 'hard')).toBe('It was hard!')
  })
  it('слова в тексте нет — null', () => {
    const el = wordIn('<p>Nothing to see <span>here</span>.</p>', 'here')
    expect(sentenceAround(el, 'elephant')).toBeNull()
  })
  it('предложение длиннее 200 знаков — null', () => {
    const long = `${'very '.repeat(50)}<span>long</span> sentence.`
    expect(sentenceAround(wordIn(`<p>${long}</p>`, 'long'), 'long')).toBeNull()
  })
  it('нет элемента или слова — null без падения', () => {
    expect(sentenceAround(null, 'x')).toBeNull()
    expect(sentenceAround(document.createElement('p'), '')).toBeNull()
  })
})
