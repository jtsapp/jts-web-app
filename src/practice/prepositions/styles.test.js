import { describe, expect, it } from 'vitest'
import { PREPOSITIONS_CSS } from './styles.js'

// Раздел на шрифте сайта: --sans приходит от экрана (--pw-font). Своя гарнитура
// прототипа (Golos Text, PT Root UI в стеке) вернула бы раздел на чужой шрифт.
describe('PREPOSITIONS_CSS', () => {
  it('без :root и body — тень их не видит', () => {
    expect(PREPOSITIONS_CSS).not.toMatch(/:root\s*\{/)
    expect(PREPOSITIONS_CSS).not.toMatch(/(^|[}\s])body\s*\{/)
    expect(PREPOSITIONS_CSS).toMatch(/:host\{/)
    expect(PREPOSITIONS_CSS).toMatch(/\.pw\{margin:0;/)
  })

  it('шрифт — сайта', () => {
    expect(PREPOSITIONS_CSS).toContain('--sans:var(--pw-font,inherit)')
    expect(PREPOSITIONS_CSS).not.toMatch(/Golos Text|PT Root UI|@font-face/)
  })

  // В прототипе .pw — класс слова-предлога (violet, жирный), а корень раздела
  // теперь тоже .pw. Правила слова обязаны стоять потомком корня («.pw .pw»):
  // иначе цвет и жирность слова легли бы на весь раздел.
  it('слово-предлог .pw не красит корень .pw', () => {
    // Правила, чей селектор ровно «.pw» (корень), — тела блоков до закрывающей }.
    const css = PREPOSITIONS_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
    const rootRules = [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)]
      .filter((m) => m[1].trim() === '.pw')
      .map((m) => m[2])
    expect(rootRules.length).toBeGreaterThan(0)
    for (const body of rootRules) {
      expect(body).not.toMatch(/font-weight:(700|800)|color:var\(--v\)/)
    }
    expect(PREPOSITIONS_CSS).toContain('.pw .pw{font-family:var(--serif);color:var(--v);font-weight:700}')
    expect(PREPOSITIONS_CSS).toContain('.pw .pw{font-weight:800}')
  })
})
