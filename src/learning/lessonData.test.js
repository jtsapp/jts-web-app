import { describe, it, expect } from 'vitest'
import { decodeUnicodeEscapes, deepDecodeUnicodeEscapes } from './lessonData.js'

describe('decodeUnicodeEscapes', () => {
  it('превращает литеральный \\u00e9 в é', () => {
    expect(decodeUnicodeEscapes('caf\\u00e9')).toBe('café')
  })

  it('превращает литеральный \\u2192 в стрелку', () => {
    expect(decodeUnicodeEscapes('say \\u2192 said')).toBe('say → said')
  })

  it('не трогает обычный текст без эскейпов', () => {
    expect(decodeUnicodeEscapes('They meet at the cafe.')).toBe('They meet at the cafe.')
  })

  it('обходит дерево задания — и prompt, и answers', () => {
    const task = {
      type: 'gap',
      gapBefore: 'Rewrite in the past: They meet at the caf\\u00e9. ',
      answers: ['They met at the caf\\u00e9.'],
      html: '<p>say \\u2192 said</p>',
    }
    expect(deepDecodeUnicodeEscapes(task)).toEqual({
      type: 'gap',
      gapBefore: 'Rewrite in the past: They meet at the café. ',
      answers: ['They met at the café.'],
      html: '<p>say → said</p>',
    })
  })
})
