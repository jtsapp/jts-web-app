import { describe, expect, it } from 'vitest'
import { PRONUNCIATION_CSS } from './styles.js'

// Стили раздела живут в тени и ширину считают по своему корню: раздел — колонка рядом с сайдбаром, а не окно.
describe('PRONUNCIATION_CSS', () => {
  it('без :root, html и body — тень их не видит; атрибуты движка — на корне .pron', () => {
    expect(PRONUNCIATION_CSS).not.toMatch(/:root\b/)
    expect(PRONUNCIATION_CSS).not.toMatch(/(^|[}\s,])(html|body)\s*\{/)
    expect(PRONUNCIATION_CSS).toMatch(/:host\{/)
    expect(PRONUNCIATION_CSS).toContain('.pron[data-tr="kk"] .xpl .tr-kk')
    expect(PRONUNCIATION_CSS).toContain('.pron[data-audio="on"]')
  })

  it('шрифт — сайта: своих @font-face (Onest, JTS IPA) нет', () => {
    expect(PRONUNCIATION_CSS).not.toMatch(/@font-face|Onest|JTS IPA/)
    expect(PRONUNCIATION_CSS).toContain('--ui:var(--pron-font,inherit)')
    expect(PRONUNCIATION_CSS).toContain('--head:var(--pron-font,inherit)')
  })

  it('ширина — по контейнеру раздела, игра — блок в колонке, а не fixed на всё окно', () => {
    expect(PRONUNCIATION_CSS).toContain('.pron{container:pron/inline-size')
    expect(PRONUNCIATION_CSS).not.toMatch(/@media \((max|min)-width/)
    expect(PRONUNCIATION_CSS).not.toMatch(/\d(vw)\b/)
    expect(PRONUNCIATION_CSS).not.toMatch(/\.game\{position:fixed/)
  })
})
