// Словари «Словаря» и рабочей тетради урока — три языка, один набор ключей.
// Ревью 08.10.2026: у kk не хватало семи строк («Пример», «Топ 3 хуже
// запомненных», заголовок разминки, «Введите перевод»…), и `t()` молча
// откатывался на русский — казахский ученик видел экран наполовину по-русски.
// Словарь читается текстом — тот же приём, что у i18n.arcade.test.js.

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

const keysOf = (lang, prefix) =>
  [...block(lang).matchAll(/^ {4}'([^']*)':/gm)]
    .map((m) => m[1])
    .filter((k) => k.startsWith(prefix))
    .sort()

describe('словари «Словаря»', () => {
  for (const prefix of ['vocab.', 'lesson.ws.']) {
    it(`${prefix}* — у ru, en и kk одинаковые ключи`, () => {
      const ru = keysOf('ru', prefix)
      expect(ru.length).toBeGreaterThan(50)
      expect(keysOf('en', prefix)).toEqual(ru)
      expect(keysOf('kk', prefix)).toEqual(ru)
    })
  }
})
