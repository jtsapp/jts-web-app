import { describe, expect, it } from 'vitest'
import { SPEED_READING_CSS } from './styles.js'

// Раздел на шрифте сайта: гарнитуру отдаёт экран (--sr-font от шрифта хоста — Manrope, на телефоне PT Root UI,
// в kk — Inter). Гарнитуры прототипа (Manrope и Material Symbols с Google Fonts) увели бы казахский интерфейс
// с Inter, а запрос к Google Fonts — за пределы сайта.
describe('SPEED_READING_CSS', () => {
  it('без :root, html и body — тень их не видит', () => {
    expect(SPEED_READING_CSS).not.toMatch(/:root\s*\{/)
    expect(SPEED_READING_CSS).not.toMatch(/(^|[}\s,])(html|body)\s*[{,]/)
    expect(SPEED_READING_CSS).toMatch(/^\.sr\{--acc:/m)
  })

  it('гарнитура — только от сайта, шрифт значков не грузится', () => {
    const families = [...SPEED_READING_CSS.matchAll(/font-family\s*:\s*([^;}]+)/g)].map((m) => m[1].trim())
    expect(families.length).toBeGreaterThan(0)
    for (const f of families) expect(['var(--sr-font,inherit)', 'inherit']).toContain(f)
    expect(SPEED_READING_CSS).not.toMatch(/@import|@font-face|fonts\.googleapis|Manrope|Material Symbols/)
  })
})
