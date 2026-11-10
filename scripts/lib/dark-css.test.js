import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { darkShadowCss } = require('./dark-css.js')

const D = ':host([data-theme="dark"])'
const compact = (s) => s.replace(/\s+/g, ' ')

// Тёмный слой разделов в Shadow DOM: то же правило брендбука, что у глобального theme-dark.generated.css, только под
// атрибутом хоста (глобальный слой в тень не проходит).
describe('darkShadowCss', () => {
  it('переменные :host — токенами --dk-*, правила — под атрибутом хоста', () => {
    const { css } = darkShadowCss(':host{--bg:#F5F5F9;--ink:#16151C;--brand:#874BF8}.card{background:#fff;color:var(--ink)}')
    expect(compact(css)).toContain(`${D} { --bg: var(--dk-page); --ink: var(--dk-text); --brand: var(--dk-acc) }`)
    expect(compact(css)).toContain(`${D} .card { background: var(--dk-card); color: var(--ink) }`)
  })

  it('заливка цветом текста («выбранное» чёрной плашкой) не становится белой плашкой с белой подписью', () => {
    const { css } = darkShadowCss(':host{--ink:#16151C}.pill.on{background:var(--ink);color:#fff}')
    expect(compact(css)).toContain(`${D} .pill.on { background: var(--dk-ink-bg); color: #fff }`)
  })

  it('тень в переменной остаётся тенью, а не белым свечением', () => {
    const { css } = darkShadowCss(':host{--shadow:0 1px 2px rgba(22,21,28,.04)}')
    expect(css).toContain('--shadow: 0 1px 2px rgba(0, 0, 0, 0.08)')
  })

  it('светлые зоны: тёмные копии внутри зоны не срабатывают, переменные зоны — светлые прототипа', () => {
    const { css } = darkShadowCss(':host{--ink:#141217}.btn{background:#fff}.tip::before{color:#4E4B55}.hero{background:#E7D9FF}.hero h1{color:var(--ink)}', {
      lightZones: ['.hero'],
      zoneColor: { '.hero': 'var(--ink)' },
    })
    const c = compact(css)
    expect(c).toContain(`${D} .btn:not(:is(.hero, .hero *)) { background: var(--dk-card) }`)
    // условие — до псевдоэлемента: после него :not() недопустим, и браузер выбросил бы правило
    expect(c).toContain(`${D} .tip:not(:is(.hero, .hero *))::before {`)
    // правила самой зоны тёмных копий не получают
    expect(c).not.toMatch(/\.hero \{ background|\.hero h1/)
    expect(c).toContain(`${D} :is(.hero) { color-scheme: light; --ink: #141217 }`)
    expect(c).toContain(`${D} .hero { color: var(--ink) }`)
  })

  it(':host(…) не поддержан — падает, а не пропускает правило молча', () => {
    expect(() => darkShadowCss(':host(.x){color:#000}')).toThrow(/:host/)
  })
})
