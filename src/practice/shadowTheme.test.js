import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Сторож разделов в Shadow DOM (10.11.2026, «тёмная тема там не включается»): тень не видит атрибута темы на <html>,
// а глобальный тёмный слой в неё не проходит. Поэтому экран с attachShadow обязан и следить за темой приложения
// (watchAppTheme → атрибут хоста), и класть в тень тёмный слой (styles.dark.js — scripts/practice/shadow-dark.js, или
// правила :host([data-theme="dark"]) в самих стилях раздела). Новый раздел в тени без этого — красный тест.
const SCREENS = path.join(__dirname, '..', 'screens')

function screensWithShadow(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...screensWithShadow(p))
    else if (/\.jsx$/.test(e.name) && !/\.test\.jsx$/.test(e.name) && fs.readFileSync(p, 'utf8').includes('attachShadow(')) out.push(p)
  }
  return out
}

const found = screensWithShadow(SCREENS)

describe('разделы в Shadow DOM и тема приложения', () => {
  it('экраны найдены (Tenses, Punctuation, Pronunciation, Prepositions, «Числа», SpeakSpin, Скорочтение, Word Hunt, «Грамматика · игры», Cartoons)', () => {
    expect(found.length).toBeGreaterThanOrEqual(10)
  })

  for (const file of found) {
    const name = path.relative(SCREENS, file)
    it(`${name}: следит за темой и кладёт тёмный слой`, () => {
      const src = fs.readFileSync(file, 'utf8')
      expect(src).toMatch(/watchAppTheme\(/)
      const dark = /_DARK_CSS\}/.test(src)
      const styles = [...src.matchAll(/from '([^']+\/styles\.js)'/g)].map((m) => path.resolve(path.dirname(file), m[1]))
      const inLight = styles.some((p) => fs.readFileSync(p, 'utf8').includes(':host([data-theme="dark"])'))
      expect(dark || inLight, 'нет тёмного слоя: node scripts/practice/shadow-dark.js или :host([data-theme="dark"]) в стилях').toBe(true)
    })
  }
})
