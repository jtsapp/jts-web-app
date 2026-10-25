// Словари Prepositions World — три языка, один набор ключей. `t()` молча
// откатывается на русский, если ключа в языке нет, поэтому пропуск в en/kk
// выглядел бы как «раздел наполовину по-русски», а не как ошибка.

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

const KEY = /^ {4}'((?:prepositions\.|practice\.prepositions\.)[^']*|nav\.back\.prepositions)': (.*),$/gm
const keysOf = (lang) => Object.fromEntries([...block(lang).matchAll(KEY)].map((m) => [m[1], m[2]]))

const EXPECTED = [
  'nav.back.prepositions',
  'practice.prepositions.cta',
  'practice.prepositions.desc',
  'practice.prepositions.heading',
  'prepositions.guest',
  'prepositions.loadFailed',
  'prepositions.loading',
  'prepositions.notUploaded',
  'prepositions.retry',
  'prepositions.toPractice',
]

describe('словари Prepositions World', () => {
  const ru = keysOf('ru')
  const en = keysOf('en')
  const kk = keysOf('kk')

  it('ключи совпадают во всех языках и это ровно ключи оболочки', () => {
    expect(Object.keys(ru).sort()).toEqual(EXPECTED)
    expect(Object.keys(en).sort()).toEqual(EXPECTED)
    expect(Object.keys(kk).sort()).toEqual(EXPECTED)
  })

  it('en и kk переведены, а не скопированы с русского', () => {
    const cyr = /[а-яё]/i
    for (const k of Object.keys(en)) expect(cyr.test(en[k]), `en ${k}`).toBe(false)
    // Название раздела — имя собственное и одинаково везде; остальное обязано отличаться.
    for (const k of EXPECTED.filter((k) => k !== 'practice.prepositions.heading')) {
      expect(kk[k], `kk ${k}`).not.toEqual(ru[k])
      expect(en[k], `en ${k}`).not.toEqual(ru[k])
    }
  })
})
