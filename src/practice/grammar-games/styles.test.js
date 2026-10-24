import { describe, expect, it } from 'vitest'
import { GRAMMAR_GAMES_CSS } from './styles.js'

// Раздел на шрифте сайта: гарнитуру отдаёт экран (--gg-font от шрифта хоста — Manrope,
// на телефоне PT Root UI, в kk — Inter). Своя гарнитура прототипа (Manrope с Google
// Fonts) увела бы казахский интерфейс с Inter, а запрос к Google Fonts — за пределы сайта.
describe('GRAMMAR_GAMES_CSS', () => {
  it('без :root, html и body — тень их не видит', () => {
    expect(GRAMMAR_GAMES_CSS).not.toMatch(/:root\s*\{/)
    expect(GRAMMAR_GAMES_CSS).not.toMatch(/(^|[}\s,])(html|body)\s*[{,]/)
    expect(GRAMMAR_GAMES_CSS).toMatch(/^\.gg\{--acc:/m)
  })

  it('гарнитура — только от сайта', () => {
    const families = [...GRAMMAR_GAMES_CSS.matchAll(/font-family\s*:\s*([^;}]+)/g)].map((m) => m[1].trim())
    expect(families.length).toBeGreaterThan(0)
    for (const f of families) expect(['var(--gg-font,inherit)', 'inherit']).toContain(f)
    expect(GRAMMAR_GAMES_CSS).not.toMatch(/@import|@font-face|fonts\.googleapis|Manrope/)
  })

  it('шапки прототипа нет — язык и звук у экрана', () => {
    expect(GRAMMAR_GAMES_CSS).not.toMatch(/\.logo\{|\.seg\{|\.mascot-top/)
  })
})
