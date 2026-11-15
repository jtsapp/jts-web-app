import { describe, it, expect } from 'vitest'
import { RULES, rulesFor, splitBold } from './rulesContent.js'

// Скелет языка: всё, что обязано совпасть у перевода с русским, — без самих слов.
// Перевод, потерявший пункт, строку таблицы или поменявший тон плашки, здесь краснеет.
function skeleton(r) {
  return {
    stats: r.stats.length,
    sections: r.sections.map((s) => ({
      id: s.id,
      blocks: s.blocks.map((b) => {
        if (b.type === 'list') return { type: 'list', items: b.items.length }
        if (b.type === 'note') return { type: 'note', tone: b.tone }
        if (b.type === 'table') return { type: 'table', rows: b.rows.map((row) => row.tone) }
        return { type: b.type, italic: !!b.italic }
      }),
    })),
    closing: r.closing.items.length,
  }
}

// Цифры правил — то, ради чего ученик открывает вкладку; перевод не смеет их менять.
const digits = (text) => (String(text).match(/\d+/g) || []).join(',')
function allTexts(r) {
  const out = []
  for (const s of r.sections) {
    for (const b of s.blocks) {
      if (b.type === 'list') out.push(...b.items)
      else if (b.type === 'table') out.push(...b.rows.map((row) => row.text))
      else out.push(b.text)
    }
  }
  return out
}

describe('правила обучения', () => {
  it('три языка', () => {
    expect(Object.keys(RULES).sort()).toEqual(['en', 'kk', 'ru'])
  })

  it.each(['kk', 'en'])('у %s та же структура, что у русского', (lang) => {
    expect(skeleton(RULES[lang])).toEqual(skeleton(RULES.ru))
  })

  it.each(['kk', 'en'])('у %s те же цифры в каждом пункте', (lang) => {
    expect(allTexts(RULES[lang]).map(digits)).toEqual(allTexts(RULES.ru).map(digits))
    expect(RULES[lang].stats.map((s) => digits(s.num))).toEqual(RULES.ru.stats.map((s) => digits(s.num)))
  })

  it('выделение закрыто в каждой строке', () => {
    for (const lang of Object.keys(RULES)) {
      for (const text of allTexts(RULES[lang])) {
        expect((text.match(/\*\*/g) || []).length % 2, `${lang}: ${text}`).toBe(0)
      }
    }
  })

  it('id разделов уникальны', () => {
    const ids = RULES.ru.sections.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('неизвестный язык — русский', () => {
    expect(rulesFor('de')).toBe(RULES.ru)
    expect(rulesFor('kk')).toBe(RULES.kk)
  })

  it('splitBold режет на обычный и жирный текст', () => {
    expect(splitBold('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ])
    expect(splitBold('**всё**')).toEqual([{ text: 'всё', bold: true }])
  })
})
