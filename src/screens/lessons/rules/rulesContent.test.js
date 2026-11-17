import { describe, it, expect } from 'vitest'
import { RULES, blockTexts, rulesFor, splitBold } from './rulesContent.js'

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
        if (b.type === 'facts') return { type: 'facts', items: b.items.map((f) => ['k', 'v', 'sub', 'd'].filter((key) => f[key]).join()) }
        if (b.type === 'tariffs') return { type: 'tariffs', items: b.items.map((t) => `${t.id}${t.none ? ':none' : ''}`) }
        if (b.type === 'split') return { type: 'split', cols: b.cols.map((col) => col.items.length) }
        return { type: b.type }
      }),
    })),
    closing: r.closing.items.length,
  }
}

// Цифры правил — то, ради чего ученик открывает вкладку; перевод не смеет их менять.
const digits = (text) => (String(text).match(/\d+/g) || []).join(',')
function allTexts(r) {
  return r.sections.flatMap((s) => s.blocks.flatMap(blockTexts))
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

  it('порядок разделов — как в PDF школы, свои три — в конце', () => {
    expect(RULES.ru.sections.map((s) => s.id)).toEqual([
      'general', 'teacher', 'bonus', 'refund', 'manager', 'reschedule', 'late', 'freeze', 'burn',
      'school', 'tech', 'table',
    ])
  })

  // Прежняя редакция обещала всем «4 раза в месяц»; теперь лимит по тарифу (ТЗ, приёмка).
  // «4 раза» законно только на карточке индивидуального тарифа — её не проверяем.
  it('нет общего лимита «4 раза в месяц»', () => {
    for (const lang of Object.keys(RULES)) {
      const general = RULES[lang].sections.flatMap((s) => s.blocks).filter((b) => b.type !== 'tariffs').flatMap(blockTexts)
      const texts = [...general, ...RULES[lang].stats.map((s) => `${s.num} ${s.label}`)]
      for (const text of texts) expect(text, `${lang}: ${text}`).not.toMatch(/(^|[^–\d])4 (раз|рет|times)/)
    }
  })

  it('ссылка на оферту есть у каждого языка', () => {
    for (const lang of Object.keys(RULES)) {
      const subs = RULES[lang].sections.flatMap((s) => s.blocks).filter((b) => b.type === 'facts').flatMap((b) => b.items.map((f) => f.sub || ''))
      expect(subs.filter((sub) => sub.includes('{offer}')), lang).toHaveLength(1)
      expect(RULES[lang].offer, lang).toBeTruthy()
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
