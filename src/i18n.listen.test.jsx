// Словари Just Listen It — три языка, один набор ключей. `t()` молча
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

const KEY = /^ {4}'((?:listen\.|practice\.listen\.)[^']*|nav\.back\.listen)': (.*),$/gm
const keysOf = (lang) => Object.fromEntries([...block(lang).matchAll(KEY)].map((m) => [m[1], m[2]]))
const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('словари Just Listen It', () => {
  const ru = keysOf('ru')
  const en = keysOf('en')
  const kk = keysOf('kk')

  it('ключи совпадают во всех языках', () => {
    const keys = Object.keys(ru).sort()
    expect(keys.length).toBeGreaterThan(100)
    expect(Object.keys(en).sort()).toEqual(keys)
    expect(Object.keys(kk).sort()).toEqual(keys)
  })

  it('подстановки одинаковы во всех языках', () => {
    for (const k of Object.keys(ru)) {
      expect(vars(en[k]), `en ${k}`).toEqual(vars(ru[k]))
      expect(vars(kk[k]), `kk ${k}`).toEqual(vars(ru[k]))
    }
  })

  it('en и kk переведены, а не скопированы с русского', () => {
    const cyr = /[а-яё]/i
    for (const k of Object.keys(en)) expect(cyr.test(en[k]), `en ${k}`).toBe(false)
    expect(kk['listen.hero.title']).not.toEqual(ru['listen.hero.title'])
  })
})
