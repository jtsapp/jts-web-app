import { describe, it, expect } from 'vitest'
import { ru, kz, mergeText, pickContent } from './content.js'
import { kzText } from './content-kz.js'

// Все строковые листья словаря с путями: ['hero.title.0', 'Индивидуальные'].
function leaves(node, path = [], out = []) {
  if (typeof node === 'string') out.push([path.join('.'), node])
  else if (Array.isArray(node)) node.forEach((v, i) => leaves(v, [...path, i], out))
  else if (node && typeof node === 'object') for (const k of Object.keys(node)) leaves(node[k], [...path, k], out)
  return out
}

function at(node, path) {
  return path.split('.').reduce((n, k) => (n == null ? undefined : n[k]), node)
}

describe('казахский словарь лендинга', () => {
  it('перевод есть у каждой русской строки', () => {
    // Кириллица в русской строке = это текст для читателя, а не путь к
    // картинке или ссылка. Пропуск здесь значит русский текст на ҚАЗ.
    const missing = leaves(ru)
      .filter(([, text]) => /[а-яё]/i.test(text))
      .filter(([path]) => typeof at(kzText, path) !== 'string')
      .map(([path]) => path)
    expect(missing).toEqual([])
  })

  it('лишних строк, которых нет в русской структуре, нет', () => {
    // Строка по пути, которого нет у ru, молча потеряется при слиянии —
    // значит, порядок или ключи в переводе разъехались с русским.
    const orphans = leaves(kzText).filter(([path]) => at(ru, path) === undefined).map(([p]) => p)
    expect(orphans).toEqual([])
  })

  it('картинки, ссылки и флаги берутся из русской структуры', () => {
    expect(kz.perks[0].img).toBe(ru.perks[0].img)
    expect(kz.library.sections[3].img).toBe(ru.library.sections[3].img)
    expect(kz.hero.plan.items[0].done).toBe(true)
    expect(kz.footer.nav[1][1].href).toBe('#trial')
    expect(kz.teachers.items[0].photo).toBe(ru.teachers.items[0].photo)
  })

  it('неизвестный язык — русский', () => {
    expect(pickContent('en')).toBe(ru)
    expect(pickContent('kz').nav.login).toBe('Кіру')
  })
})

describe('mergeText', () => {
  it('массивы — по индексу, недостающее — из базы', () => {
    expect(mergeText([{ a: 1, t: 'x' }, { a: 2, t: 'y' }], [{ t: 'X' }])).toEqual([{ a: 1, t: 'X' }, { a: 2, t: 'y' }])
  })
})
