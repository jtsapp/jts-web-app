import { describe, it, expect } from 'vitest'
import { highlightParts } from './highlight.js'

describe('подсветка hits в копии текста (спека §3.3, §7)', () => {
  it('все вхождения без учёта регистра, текст ученика как есть', () => {
    expect(highlightParts('х@й и Х@Й', ['х@й'])).toEqual([
      { text: 'х@й', mark: true },
      { text: ' и ', mark: false },
      { text: 'Х@Й', mark: true },
    ])
  })

  it('спецсимволы в hits ищутся буквально, а не как регулярное выражение', () => {
    expect(highlightParts('б*я и бля', ['б*я'])).toEqual([
      { text: 'б*я', mark: true },
      { text: ' и бля', mark: false },
    ])
    expect(highlightParts('$ука (х)', ['$ука', '(х)'])).toEqual([
      { text: '$ука', mark: true },
      { text: ' ', mark: false },
      { text: '(х)', mark: true },
    ])
  })

  it('разметка в тексте остаётся текстом: куски рисует React, innerHTML нет', () => {
    expect(highlightParts('<b>бля</b>', ['бля'])).toEqual([
      { text: '<b>', mark: false },
      { text: 'бля', mark: true },
      { text: '</b>', mark: false },
    ])
  })

  it('пересекающиеся находки — берётся длинная', () => {
    expect(highlightParts('блядь', ['бля', 'блядь'])).toEqual([{ text: 'блядь', mark: true }])
  })

  it('без находок — один кусок; пустой текст — ничего; мусор в hits игнорируется', () => {
    expect(highlightParts('Привет', [])).toEqual([{ text: 'Привет', mark: false }])
    expect(highlightParts('Привет', ['', '  ', null, 5])).toEqual([{ text: 'Привет', mark: false }])
    expect(highlightParts('', ['бля'])).toEqual([])
  })
})
