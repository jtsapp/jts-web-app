// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { stripAnswerKeySpoilers, isAnswerKeySpoilerHtml } from './stripAnswerKeySpoilers.js'

describe('stripAnswerKeySpoilers', () => {
  it('вырезает Why these answers', () => {
    const html =
      '<p>Do the task.</p><details class="gref"><summary>Why these answers</summary>' +
      '<p>Правильный ответ: in</p></details>'
    const out = stripAnswerKeySpoilers(html)
    expect(out).toContain('Do the task.')
    expect(out).not.toContain('Why these answers')
    expect(out).not.toContain('Правильный ответ')
  })

  it('не трогает аудиоскрипт', () => {
    const html =
      '<details class="gref"><summary>What you heard</summary><p>hello</p></details>'
    expect(stripAnswerKeySpoilers(html)).toContain('What you heard')
    expect(stripAnswerKeySpoilers(html)).toContain('hello')
  })

  it('не трогает Full grammar reference', () => {
    const html =
      '<details class="gref"><summary>Full grammar reference</summary><p>I am</p></details>'
    expect(stripAnswerKeySpoilers(html)).toContain('Full grammar reference')
  })

  it('isAnswerKeySpoilerHtml — true, когда в блоке только ключ', () => {
    expect(
      isAnswerKeySpoilerHtml(
        '<details class="gref"><summary>Why these answers</summary><p>in</p></details>',
      ),
    ).toBe(true)
    expect(isAnswerKeySpoilerHtml('<p>Listen carefully.</p>')).toBe(false)
  })
})
