// @vitest-environment jsdom
//
// Словари раздела «Слушай и выбирай» — три языка, один набор ключей. `t()`
// молча откатывается на русский, если ключа в языке нет, поэтому пропуск в
// en/kk выглядел бы как «раздел наполовину по-русски», а не как ошибка.
// Тест читает словарь текстом (тот же приём, что cefrNames.test.js): предмет
// проверки — сами ключи и значения.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { I18nProvider, useI18n } from './i18n.jsx'

const here = dirname(fileURLToPath(import.meta.url))
const text = readFileSync(join(here, 'i18n.jsx'), 'utf8').replace(/\r\n/g, '\n')
const source = JSON.parse(readFileSync(join(here, '..', 'scripts', 'listenchoose-i18n-source.json'), 'utf8'))

// Ключи прототипа, которые порт не переносит: строки браузерного синтеза
// (`device`, `approx`), подпись «осталось» (`remaining`, в прототипе нигде не
// используется) и фирменный футер (`footer`, в приложении футера нет).
const DROPPED = ['approx', 'device', 'footer', 'remaining']

function block(lang) {
  const start = new RegExp(`^  ${lang}: \\{$`, 'm').exec(text)
  const next = /^ {2}(?:ru|en|kk): \{$/gm
  next.lastIndex = start.index + 1
  const end = next.exec(text)
  return text.slice(start.index, end ? end.index : text.length)
}

const KEY = /^ {4}'((?:listenchoose\.|practice\.listenchoose\.|practice\.chip\.listenchoose|tour\.practice\.listenchoose\.)[^']*)': (.*),$/gm
function keysOf(lang) {
  return Object.fromEntries([...block(lang).matchAll(KEY)].map((m) => [m[1], m[2]]))
}

describe('словари: один набор ключей на три языка', () => {
  const ru = keysOf('ru')
  const en = keysOf('en')
  const kk = keysOf('kk')

  it('ключи совпадают во всех языках, и их не пусто', () => {
    const keys = Object.keys(en).sort()
    expect(keys.length).toBeGreaterThan(60)
    expect(Object.keys(ru).sort()).toEqual(keys)
    expect(Object.keys(kk).sort()).toEqual(keys)
  })

  it('каждый нужный ключ прототипа перенесён, а выброшенные — ровно перечисленные', () => {
    for (const lang of ['ru', 'en', 'kk']) {
      const have = keysOf(lang)
      const wanted = Object.keys(source[lang]).filter((k) => !DROPPED.includes(k))
      for (const k of wanted) expect(have, `${lang}: listenchoose.${k}`).toHaveProperty(`listenchoose.${k}`)
      for (const k of DROPPED) expect(have, `${lang}: listenchoose.${k}`).not.toHaveProperty(`listenchoose.${k}`)
    }
  })

  it('английские хвосты прототипа в ru и kk переведены', () => {
    for (const k of ['wrong', 'show', 'hide', 'next']) {
      expect(ru[`listenchoose.${k}`], `ru ${k}`).not.toBe(en[`listenchoose.${k}`])
      expect(kk[`listenchoose.${k}`], `kk ${k}`).not.toBe(en[`listenchoose.${k}`])
    }
  })

  it('заголовок баннера двустрочный (перенос \\n), как у соседних разделов', () => {
    for (const d of [ru, en, kk]) expect(d['practice.listenchoose.heading']).toContain('\\n')
  })
})

function Probe() {
  const { t } = useI18n()
  return <div data-testid="t">{t('listenchoose.title')}</div>
}

describe('t() отдаёт название раздела на каждом языке', () => {
  afterEach(() => localStorage.clear())
  const cases = [
    ['ru', 'Слушай и выбирай'],
    ['en', 'Listen & Choose'],
    ['kk', 'Тыңда да таңда'],
  ]
  for (const [lang, title] of cases) {
    it(lang, () => {
      localStorage.setItem('lang', lang)
      render(
        <I18nProvider>
          <Probe />
        </I18nProvider>,
      )
      expect(screen.getByTestId('t').textContent).toBe(title)
    })
  }
})
