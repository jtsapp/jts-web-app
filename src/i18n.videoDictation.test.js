// Словари Видеодиктанта — три языка, один набор ключей. `t()` молча откатывается на русский, если ключа в языке нет,
// поэтому пропуск в en/kk выглядел бы как «раздел наполовину по-русски», а не как ошибка.

import { i18nText } from './i18n/i18nText.testutil.js'
import { describe, expect, it } from 'vitest'

const text = i18nText()

function block(lang) {
  const start = new RegExp(`^  ${lang}: \\{$`, 'm').exec(text)
  const next = /^ {2}(?:ru|en|kk): \{$/gm
  next.lastIndex = start.index + 1
  const end = next.exec(text)
  return text.slice(start.index, end ? end.index : text.length)
}

const KEY = /^ {4}'((?:videoDictation\.|practice\.card\.videoDictation\.)[^']*|nav\.back\.videoDictation)': (.*),$/gm
const keysOf = (lang) => Object.fromEntries([...block(lang).matchAll(KEY)].map((m) => [m[1], m[2]]))
const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

// Казахское «фраза» не склоняется после числа — формы совпадают с русской «{n} фраза».
const SAME_IN_KK = ['videoDictation.phrases.one']

describe('словари Видеодиктанта', () => {
  const ru = keysOf('ru')
  const en = keysOf('en')
  const kk = keysOf('kk')

  it('ключи совпадают во всех языках', () => {
    const keys = Object.keys(ru).sort()
    expect(keys).toHaveLength(52)
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
    for (const k of Object.keys(kk).filter((x) => !SAME_IN_KK.includes(x))) expect(kk[k], `kk ${k}`).not.toEqual(ru[k])
  })
})
