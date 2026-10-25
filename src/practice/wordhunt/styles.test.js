import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { WORDHUNT_CSS } from './styles.js'

// styles.js генерирует scripts/wordhunt/extract-assets.js; здесь — что он обязан был сделать с CSS прототипа.
describe('WORDHUNT_CSS', () => {
  it('без :root, html и body — тень их не видит', () => {
    expect(WORDHUNT_CSS).not.toMatch(/:root\s*\{/)
    expect(WORDHUNT_CSS).not.toMatch(/(^|[}\s,])(html|body)\s*[{,]/m)
    expect(WORDHUNT_CSS).toMatch(/:host\{/)
    expect(WORDHUNT_CSS).toMatch(/^\.wh\{color:/m)
  })

  // Раздел на шрифте сайта: каждая гарнитура — inherit, корень берёт её у хоста тени (в казахском — Inter).
  it('шрифт — сайта: гарнитуры только inherit', () => {
    const own = [...WORDHUNT_CSS.matchAll(/(?<![-\w])font-family\s*:\s*([^;}]+)/g)].map((m) => m[1].trim())
    expect(own.length).toBeGreaterThan(40)
    expect(new Set(own)).toEqual(new Set(['inherit']))
    // Комментарий-шапка прототипа называет его шрифты — смотрим только правила.
    expect(WORDHUNT_CSS.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/var\(--f-[db]\)|PT Root UI|SF Pro|@font-face/)
  })

  it('картинки дизайна — файлами, и каждый файл на месте', () => {
    expect(WORDHUNT_CSS).not.toMatch(/data:image/)
    const files = [...WORDHUNT_CSS.matchAll(/url\("\/practice\/wordhunt\/img\/([\w-]+\.webp)"\)/g)].map((m) => m[1])
    expect(files).toHaveLength(26)
    const dir = path.join(__dirname, '..', '..', '..', 'public', 'practice', 'wordhunt', 'img')
    for (const f of files) expect(fs.existsSync(path.join(dir, f)), f).toBe(true)
  })

  it('небо обрезано по разделу: fixed-слой не ложится на сайдбар', () => {
    expect(WORDHUNT_CSS).toContain('.sky-clip{position:absolute;inset:0;z-index:0;clip-path:inset(0);pointer-events:none}')
  })
})
