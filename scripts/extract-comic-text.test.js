import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { parseBlocks } = require('./extract-comic-text.js')

// Ответ модели идёт в читалку как есть, поэтому разбор должен переживать и
// markdown-ограду, и лишние поля, и мусорные блоки — иначе одна кривая
// страница валит весь прогон на 214 страниц.
describe('extract-comic-text — разбор ответа', () => {
  it('снимает markdown-ограду вокруг JSON', () => {
    const out = parseBlocks('```json\n{"blocks":[{"kind":"balloon","en":"Hi","ru":"Привет","kk":"Сәлем"}]}\n```')
    expect(out).toEqual([{ kind: 'balloon', en: 'Hi', ru: 'Привет', kk: 'Сәлем' }])
  })

  it('неизвестный kind сводится к реплике, а не теряется', () => {
    expect(parseBlocks('{"blocks":[{"kind":"thought","en":"Hm"}]}')[0].kind).toBe('balloon')
  })

  it('блоки без английского текста выбрасываются', () => {
    const out = parseBlocks('{"blocks":[{"en":"  "},{"en":"Go"},{"ru":"Только перевод"},null]}')
    expect(out.map((b) => b.en)).toEqual(['Go'])
  })

  it('отсутствующий перевод не роняет разбор — становится пустой строкой', () => {
    expect(parseBlocks('{"blocks":[{"en":"Go"}]}')[0]).toMatchObject({ ru: '', kk: '' })
  })

  it('ответ без blocks — ошибка, страницу нужно перезапросить', () => {
    expect(() => parseBlocks('{"pages":[]}')).toThrow(/blocks/)
    expect(() => parseBlocks('извини, не могу')).toThrow()
  })

  it('пустая страница разбирается в пустой список', () => {
    expect(parseBlocks('{"blocks":[]}')).toEqual([])
  })
})
