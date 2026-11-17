// Словари Literature World — три языка, один набор ключей. `t()` молча
// откатывается на русский, если ключа в языке нет, поэтому пропуск в en/kk
// выглядел бы как «раздел наполовину по-русски», а не как ошибка. Интерфейс
// самого раздела — свой (en / kz / ru, переключатель в шапке раздела) — здесь только оболочка и
// карточка «Практики».

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

const KEY = /^ {4}'((?:literature\.|practice\.card\.literature\.)[^']*|nav\.back\.literature)': (.*),$/gm
const keysOf = (lang) => Object.fromEntries([...block(lang).matchAll(KEY)].map((m) => [m[1], m[2]]))

const EXPECTED = [
  'literature.guest',
  'literature.loadFailed',
  'literature.loading',
  'literature.notUploaded',
  'literature.retry',
  'literature.toPractice',
  'nav.back.literature',
  'practice.card.literature.desc',
  'practice.card.literature.title',
]

describe('словари Literature World', () => {
  const ru = keysOf('ru')
  const en = keysOf('en')
  const kk = keysOf('kk')

  it('ключи совпадают во всех языках и это ровно ключи оболочки и карточки', () => {
    expect(Object.keys(ru).sort()).toEqual(EXPECTED)
    expect(Object.keys(en).sort()).toEqual(EXPECTED)
    expect(Object.keys(kk).sort()).toEqual(EXPECTED)
  })

  it('en и kk переведены, а не скопированы с русского', () => {
    const cyr = /[а-яё]/i
    for (const k of Object.keys(en)) expect(cyr.test(en[k]), `en ${k}`).toBe(false)
    // Название раздела — имя собственное и одинаково везде; остальное обязано отличаться.
    for (const k of EXPECTED.filter((k) => k !== 'practice.card.literature.title')) {
      expect(kk[k], `kk ${k}`).not.toEqual(ru[k])
      expect(en[k], `en ${k}`).not.toEqual(ru[k])
    }
  })
})
