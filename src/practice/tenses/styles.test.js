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
    // 12 правил прототипа и одно своё (кегль плитки карты на телефоне)
    expect(TENSES_CSS.match(/@container tws \(/g)).toHaveLength(13)
  })
})
