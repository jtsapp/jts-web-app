import { describe, expect, it } from 'vitest'
import { TENSES_CSS } from './styles.js'

// Стили раздела живут в тени и ширину считают по своему корню: раздел — колонка рядом с сайдбаром, а не окно.
describe('TENSES_CSS', () => {
  it('без :root, html и body — тень их не видит; переменные — на :host', () => {
    expect(TENSES_CSS).not.toMatch(/:root\b/)
    expect(TENSES_CSS).not.toMatch(/(^|[}\s,])(html|body)\s*\{/)
    expect(TENSES_CSS).toMatch(/^:host \{/)
    expect(TENSES_CSS).toContain('.tws { margin: 0; background: var(--bg);')
  })

  it('шрифт — сайта: гарнитур прототипа нет, казахский перевод — на Inter', () => {
    expect(TENSES_CSS).not.toMatch(/@font-face|Onest|PT Root UI|SF Pro/)
    expect(TENSES_CSS).toContain('--font-head: var(--tw-font, inherit);')
    expect(TENSES_CSS).toContain('--font-body: var(--tw-font, inherit);')
    expect(TENSES_CSS).toContain(`.tws[lang="kk"] { --font-head: 'Inter'`)
  })

  it('ширина — по контейнеру раздела, а не по окну', () => {
    expect(TENSES_CSS).toContain('.tws { container: tws / inline-size;')
    expect(TENSES_CSS).not.toMatch(/@media \((max|min)-width/)
    expect(TENSES_CSS).not.toMatch(/\d(vw)\b/)
    // 12 правил прототипа и одно своё (кегль плитки карты на телефоне); тёмный слой повторяет их со своими цветами
    expect(LIGHT.match(/@container tws \(/g)).toHaveLength(13)
  })

  // 10.11.2026: тёмная тема приложения раздел не перекрашивала — тень не видит ни html[data-theme], ни глобального
  // тёмного слоя.
  it('тёмная тема — по атрибуту хоста, токенами брендбука, после светлых стилей', () => {
    expect(LIGHT).not.toContain('data-theme')
    expect(TENSES_CSS).toMatch(/:host\(\[data-theme="dark"\]\) \{\s+--brand: var\(--dk-acc\);/)
    expect(TENSES_CSS).toMatch(/--bg: var\(--dk-page\);\s+--card: var\(--dk-card\);\s+--ink: var\(--dk-text\);/)
    expect(TENSES_CSS).toContain('color-scheme: dark')
    // «выбранное» чёрной плашкой с белой подписью не становится белым по белому
    expect(TENSES_CSS).toMatch(/:host\(\[data-theme="dark"\]\) \.pill\.on \{\s+background: var\(--dk-ink-bg\);/)
  })
})

const LIGHT = TENSES_CSS.slice(0, TENSES_CSS.indexOf(':host([data-theme="dark"])'))
