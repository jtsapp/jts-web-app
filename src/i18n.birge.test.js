// Словари Birge — три языка, один набор ключей. t() молча откатывается на русский, если ключа в языке нет, поэтому
// пропуск в en/kk выглядел бы как «раздел наполовину по-русски», а не как ошибка. Словари читаются текстом — тот же
// приём, что у i18n.arcade.test.js. Последний тест держит код и словарь вместе: ключ, который назвали в src/birge
// или в экране, обязан быть в словаре, иначе ученик увидит голый «birge.…».
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { i18nText } from './i18n/i18nText.testutil.js'
import { EMOJI_CATEGORY_IDS, REASON_CODES, TOPICS } from './birge/labels.js'

const here = dirname(fileURLToPath(import.meta.url))
const text = i18nText()

function block(lang) {
  const start = new RegExp(`^  ${lang}: \\{$`, 'm').exec(text)
  const next = /^ {2}(?:ru|en|kk): \{$/gm
  next.lastIndex = start.index + 1
  const end = next.exec(text)
  return text.slice(start.index, end ? end.index : text.length)
}

// Ключ и значение — одной строкой: строки Birge в словарях не переносятся.
const ENTRY = /^ {4}'((?:birge\.|nav\.birge|tour\.sections\.birge)[^']*)': (['"])((?:\\.|(?!\2).)*)\2,$/gm
const entries = (lang) => Object.fromEntries([...block(lang).matchAll(ENTRY)].map((m) => [m[1], m[3]]))
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

/** Ключи, которые код раздела называет строкой: 'birge.…' в src/birge/*.js(x) и в экране. */
function keysInCode() {
  const dir = join(here, 'birge')
  const files = [
    ...(existsSync(dir) ? readdirSync(dir).filter((f) => /\.jsx?$/.test(f) && !f.includes('.test.')).map((f) => join(dir, f)) : []),
    join(here, 'screens', 'BirgePage.jsx'),
  ].filter((f) => existsSync(f))
  const found = files.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/'(birge\.[A-Za-z0-9_.]*[A-Za-z0-9_])'/g)].map((m) => m[1]))
  return [...new Set(found)]
}

describe('словари Birge', () => {
  it('у ru, en и kk одинаковые ключи и подстановки', () => {
    const ru = entries('ru')
    expect(Object.keys(ru).length).toBeGreaterThan(80)
    for (const lang of ['en', 'kk']) {
      const other = entries(lang)
      expect(Object.keys(other).sort()).toEqual(Object.keys(ru).sort())
      for (const [key, value] of Object.entries(ru)) expect(vars(other[key]), `${lang}: ${key}`).toEqual(vars(value))
    }
  })

  it('темы, причины и вкладки смайликов подписаны', () => {
    const ru = entries('ru')
    for (const topic of TOPICS) expect(ru[`birge.topic.${topic}`], topic).toBeTruthy()
    for (const code of [...REASON_CODES, 'OTHER']) expect(ru[`birge.reason.${code}`], code).toBeTruthy()
    for (const id of EMOJI_CATEGORY_IDS) expect(ru[`birge.emoji.cat.${id}`], id).toBeTruthy()
  })

  it('«Birge» и «Just to Study Birge» не переводятся', () => {
    for (const lang of ['ru', 'en', 'kk']) {
      expect(entries(lang)['nav.birge']).toBe('Birge')
      expect(entries(lang)['birge.title']).toBe('Just to Study Birge')
    }
  })

  it('каждый ключ, который называет код раздела, есть в словаре', () => {
    const ru = entries('ru')
    expect(keysInCode().filter((key) => !(key in ru))).toEqual([])
  })
})
