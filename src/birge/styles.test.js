import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Стили Birge: у каждого класса разметки есть правило, файлы подключены в layout.jsx, тёмный слой вставлен. Класс без
// правила в глобальном CSS не виден ни линту, ни сборке — только глазами на экране.
const src = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(src, rel), 'utf8')
const css = read('birge.css') + read('mobile/birge.css')
const markup = [
  ...readdirSync(join(src, 'birge'))
    .filter((f) => f.endsWith('.jsx') && !f.includes('.test.'))
    .map((f) => read(`birge/${f}`)),
  read('screens/BirgePage.jsx'),
].join('\n')

describe('стили Birge', () => {
  it('у каждого класса .brg-* из разметки есть правило', () => {
    const used = [...new Set([...markup.matchAll(/\bbrg-[a-z0-9_-]*[a-z0-9]/g)].map((m) => m[0]))]
    expect(used.length).toBeGreaterThan(40)
    expect(used.filter((cls) => !new RegExp(String.raw`\.${cls}(?![\w-])`).test(css))).toEqual([])
  })

  it('файлы подключены: раздел — к разделам, телефон — к мобильному слою после base.css', () => {
    const layout = read('app/layout.jsx')
    expect(layout).toContain("import '../birge.css'")
    expect(layout.indexOf("import '../mobile/birge.css'")).toBeGreaterThan(layout.indexOf("import '../mobile/base.css'"))
  })

  it('мобильный слой целиком внутри @media (max-width: 560px)', () => {
    const mobile = read('mobile/birge.css').replace(/\/\*[\s\S]*?\*\//g, '').trim()
    expect(mobile.startsWith('@media (max-width: 560px)')).toBe(true)
  })

  it('тёмный слой знает Birge и метку «new» плитки «Сервисов»', () => {
    const dark = read('theme-dark.generated.css')
    expect(dark).toContain('/*  birge.css  */')
    expect(dark).toContain('html[data-theme="dark"] .brg-card')
    expect(dark).toContain('html[data-theme="dark"] .svc-tile__new')
  })
})
