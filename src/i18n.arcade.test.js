// Словари «Аркады» — три языка, один набор ключей. `t()` молча откатывается
// на русский, если ключа в языке нет, поэтому пропуск в en/kk выглядел бы как
// «игра наполовину по-русски», а не как ошибка. Словарь читается текстом —
// тот же приём, что у i18n.listenchoose.test.jsx.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const text = readFileSync(join(here, 'i18n.jsx'), 'utf8').replace(/\r\n/g, '\n')

function block(lang) {
  const start = new RegExp(`^  ${lang}: \\{$`, 'm').exec(text)
  const next = /^ {2}(?:ru|en|kk): \{$/gm
  next.lastIndex = start.index + 1
  const end = next.exec(text)
  return text.slice(start.index, end ? end.index : text.length)
}

const KEY = /^ {4}'((?:arcade\.|practice\.arcade\.|practice\.chip\.arcade)[^']*)':/gm
const keysOf = (lang) => [...block(lang).matchAll(KEY)].map((m) => m[1]).sort()

describe('словари «Аркады»', () => {
  it('у ru, en и kk одинаковые ключи', () => {
    const ru = keysOf('ru')
    expect(ru.length).toBeGreaterThan(60)
    expect(keysOf('en')).toEqual(ru)
    expect(keysOf('kk')).toEqual(ru)
  })

  it('ключи игры, которые собираются из данных, есть в словаре', () => {
    const ru = new Set(keysOf('ru'))
    for (const level of ['easy', 'medium', 'hard', 'veryHard']) expect(ru.has(`arcade.difficulty.${level}`)).toBe(true)
    for (const stat of ['speaking', 'silence', 'stops', 'ratio']) {
      expect(ru.has(`arcade.results.${stat}`)).toBe(true)
      expect(ru.has(`arcade.results.${stat}Hint`)).toBe(true)
    }
    for (const stat of ['score', 'best', 'streak', 'coins', 'hits']) expect(ru.has(`arcade.run.results.${stat}`)).toBe(true)
    for (const key of ['rule.moves', 'rule.hits', 'mult', 'hit']) expect(ru.has(`arcade.run.${key}`)).toBe(true)
  })
})
