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

  // Дальше — что разделы в тени показали на снимках 10.11.2026 (Pronunciation, «Числа», Word Hunt, «Грамматика · игры»).

  it('градиентный заголовок: clip переносится вслед за фоном, цвета градиента — как текст', () => {
    const { css } = darkShadowCss('h1{background:linear-gradient(100deg,#2B0F7A,#0A6E9E);-webkit-background-clip:text;background-clip:text;color:transparent}')
    const c = compact(css)
    // без clip шорткат background сбросил бы его к border-box — градиент лёг бы плашкой на весь блок
    expect(c).toContain('-webkit-background-clip: text; background-clip: text')
    expect(c).toContain('linear-gradient(100deg,var(--dk-acc-text),var(--dk-blue))')
  })

  it('чернила с оттенком — белый и серый текст графита, а не фиолетовый бренда', () => {
    const { css } = darkShadowCss(':host{--ink:#1f1640;--ink2:#5b5478;--link-text:#5a2fc8}')
    const c = compact(css)
    expect(c).toContain('--ink: var(--dk-text)')
    expect(c).toContain('--ink2: var(--dk-text-2)')
    // насыщенный тёмный — это цвет, он остаётся в семействе бренда
    expect(c).toContain('--link-text: var(--dk-acc-text)')
  })

  it('чернильный скрим под окном остаётся скримом, а не заливкой цветом бренда', () => {
    const { css } = darkShadowCss('.ov{background:rgba(25,20,49,.55)}')
    expect(compact(css)).toContain(`${D} .ov { background: rgba(25,20,49,.55) }`)
  })

  it('тёмная подпись на яркой заливке остаётся тёмной', () => {
    const { css } = darkShadowCss(':host{--gold:#f5b400}.tag{background:var(--gold);color:#3a2a00}')
    expect(compact(css)).toContain(`${D} .tag { background: var(--gold); color: var(--dk-on-bright) }`)
  })

  it('белый ореол — поверхность карточки той же прозрачности, без серого кольца', () => {
    const { css } = darkShadowCss('.board{background:radial-gradient(ellipse,rgba(255,255,255,.9),rgba(255,255,255,.55) 55%,rgba(255,255,255,0))}')
    const c = compact(css)
    expect(c).toContain('color-mix(in oklab, var(--dk-card) 90%, transparent)')
    expect(c).toContain('color-mix(in oklab, var(--dk-card) 55%, transparent) 55%')
    expect(c).not.toMatch(/rgba\(255,\s*255,\s*255/)
  })

  it('полупрозрачная белая кромка — линия графита, как и непрозрачная белая', () => {
    const { css } = darkShadowCss('.a{border:2px solid rgba(255,255,255,.95)}.b{border:2px solid #fff}')
    const c = compact(css)
    expect(c).toContain(`${D} .a { border: 2px solid var(--dk-line) }`)
    expect(c).toContain(`${D} .b { border: 2px solid var(--dk-line) }`)
  })
})

// Глобальный слой (gen-dark-theme.js) этими правилами не пользуется: его вывод обязан остаться прежним байт в байт.
describe('createConverter без опций разделов в тени', () => {
  it('чернила с оттенком и clip глобальный конвертер не трогает', () => {
    const { createConverter, collectVars } = require('./dark-css.js')
    const postcss = require('postcss')
    const root = postcss.parse('.x{color:#1f1640}.h{background:linear-gradient(90deg,#2B0F7A,#0A6E9E);background-clip:text}')
    const { convert } = createConverter({ prefixSelector: (s) => `html[data-theme="dark"] ${s}`, vars: collectVars([root]) })
    const out = postcss.root()
    convert(root, out)
    const c = compact(out.toString())
    expect(c).toContain('.x { color: var(--dk-acc-text) }')
    expect(c).not.toContain('background-clip')
  })
})
