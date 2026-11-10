import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const postcss = require('postcss')
const { SECTIONS, renderDark, darkFile, darkName } = require('./shadow-dark.js')
const { HOST_DARK } = require('../lib/dark-css.js')

const LIGHT = {
  pronunciation: () => import('../../src/practice/pronunciation/styles.js'),
  prepositions: () => import('../../src/practice/prepositions/styles.js'),
  numbers: () => import('../../src/practice/numbers/styles.js'),
  speakspin: () => import('../../src/practice/speakspin/styles.js'),
  'speed-reading': () => import('../../src/practice/speed-reading/styles.js'),
  wordhunt: () => import('../../src/practice/wordhunt/styles.js'),
  'grammar-games': () => import('../../src/practice/grammar-games/styles.js'),
}

// Тёмный слой разделов в тени (10.11.2026): генерируется из светлых стилей раздела тем же правилом брендбука, что и
// весь сайт. Правка styles.js без перезапуска генератора оставила бы тёмную тему старой — это и ловит первый тест.
describe('styles.dark.js разделов в тени', () => {
  it('у каждого раздела генератора есть загрузчик светлых стилей', () => {
    expect(Object.keys(LIGHT).sort()).toEqual(Object.keys(SECTIONS).sort())
  })

  for (const name of Object.keys(SECTIONS)) {
    describe(name, () => {
      it('свежий: совпадает с перегенерацией из styles.js (node scripts/practice/shadow-dark.js)', async () => {
        const light = (await LIGHT[name]())[SECTIONS[name].css]
        const onDisk = fs.readFileSync(darkFile(name), 'utf8').replace(/\r\n/g, '\n')
        expect(onDisk).toBe(renderDark(name, light))
      })

      it('каждое правило — только под атрибутом темы хоста: светлая тема его не видит', async () => {
        const css = (await import(`../../src/practice/${name}/styles.dark.js`))[darkName(name)]
        let rules = 0
        postcss.parse(css).walkRules((r) => {
          if (r.parent.type === 'atrule' && /keyframes/i.test(r.parent.name)) return
          rules++
          for (const sel of r.selectors) expect(sel.startsWith(HOST_DARK), sel).toBe(true)
        })
        expect(rules).toBeGreaterThan(20)
      })
    })
  }

  it('светлые зоны: внутри зоны копия правила не срабатывает, переменные прототипа возвращаются', async () => {
    const { NUMBERS_DARK_CSS } = await import('../../src/practice/numbers/styles.dark.js')
    expect(NUMBERS_DARK_CSS).toMatch(/:host\(\[data-theme="dark"\]\) \.card:not\(:is\(\.hero, [^)]*\.scene \*/)
    expect(NUMBERS_DARK_CSS).toMatch(/:host\(\[data-theme="dark"\]\) :is\(\.hero, \.world, [^)]*\) \{\s+color-scheme: light;\s+--brand: #874BF8;/)
  })
})
