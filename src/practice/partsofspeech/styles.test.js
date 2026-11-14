import { describe, expect, it } from 'vitest'
import { PARTSOFSPEECH_CSS } from './styles.js'
import { PARTSOFSPEECH_DARK_CSS } from './styles.dark.js'

// Стили раздела живут в тени и ширину считают по своему хосту: раздел — колонка рядом с сайдбаром, а не окно.
describe('PARTSOFSPEECH_CSS', () => {
  it('без :root, html, body и main — тень их не видит; классы страницы — на корне .posw', () => {
    expect(PARTSOFSPEECH_CSS).not.toMatch(/:root\b/)
    expect(PARTSOFSPEECH_CSS).not.toMatch(/(^|[}\s,])(html|body|main)\s*[{.[:]/)
    expect(PARTSOFSPEECH_CSS).toMatch(/:host\{/)
    expect(PARTSOFSPEECH_CSS).toContain('.posw.full .wrap{grid-template-columns:minmax(0,1fr)}')
    expect(PARTSOFSPEECH_CSS).toContain('.posw.show-labels .w')
    expect(PARTSOFSPEECH_CSS).toContain('.posw.full .main{')
  })

  it('шрифт — сайта: гарнитур прототипа (PT Root UI, Golos Text, SF Pro, Literata) нет', () => {
    expect(PARTSOFSPEECH_CSS).not.toMatch(/@font-face|Golos|Literata|PT Root|SF Pro/)
    for (const v of ['display', 'sans', 'serif', 'f-ui', 'f-tl']) expect(PARTSOFSPEECH_CSS).toContain(`--${v}:var(--pos-font,inherit);`)
    // каждая явная гарнитура — через переменную
    const own = [...PARTSOFSPEECH_CSS.matchAll(/(?<![-\w])font-family\s*:\s*([^;}]+)/g)].map((m) => m[1].trim())
    expect(own.filter((v) => !/^var\(--(display|sans|serif|f-ui|f-tl)\)$/.test(v) && !v.startsWith("'Inter'"))).toEqual([])
  })

  it('ширина — по контейнеру-хосту; шторка карты — от шапки раздела и гаснет, а не уезжает на сайдбар приложения', () => {
    expect(PARTSOFSPEECH_CSS).toContain(':host{display:block;container:posw/inline-size}')
    expect(PARTSOFSPEECH_CSS).not.toMatch(/@media \((max|min)-width/)
    expect(PARTSOFSPEECH_CSS).not.toMatch(/\d(vw)\b/)
    expect(PARTSOFSPEECH_CSS).toContain('position:fixed;left:var(--pos-x,0px);top:var(--pos-y,68px);')
    expect(PARTSOFSPEECH_CSS).not.toContain('position:fixed;left:0;top:68px')
    expect(PARTSOFSPEECH_CSS).toContain('.posw.full nav.side{transform:none;opacity:0;visibility:hidden')
  })

  it('тёмная тема — отдельным слоем по атрибуту хоста; картинки островов и «фонарик» остаются в палитре прототипа', () => {
    expect(PARTSOFSPEECH_CSS).not.toContain('data-theme="dark"')
    expect(PARTSOFSPEECH_DARK_CSS).toMatch(/--bg: var\(--dk-page\);/)
    expect(PARTSOFSPEECH_DARK_CSS).toContain(':not(:is(.w-hero, .q-hero, .u-hero, .g-banner,')
    expect(PARTSOFSPEECH_DARK_CSS).toMatch(/:host\(\[data-theme="dark"\]\) :is\(\.w-hero, [^)]*\.g-item:has\(\.g-torch\)\) \{\s+color-scheme: light;\s+--brand: #874BF8;/)
    // жёлтый акцент плашек практики — сплошной, а не тинт
    expect(PARTSOFSPEECH_DARK_CSS).toContain(':host([data-theme="dark"]){--yellow:var(--dk-yellow)}')
  })
})
