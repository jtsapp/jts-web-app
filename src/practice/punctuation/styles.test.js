import { describe, expect, it } from 'vitest'
import { PUNCTUATION_CSS } from './styles.js'

// Стили раздела живут в тени и ширину считают по своему корню: раздел — колонка рядом с сайдбаром, а не окно.
describe('PUNCTUATION_CSS', () => {
  it('без :root, html и body — тень их не видит; перевод и игра — на корне .punct', () => {
    expect(PUNCTUATION_CSS).not.toMatch(/:root\b/)
    expect(PUNCTUATION_CSS).not.toMatch(/(^|[}\s,])(html|body)\s*[{.[]/)
    expect(PUNCTUATION_CSS).toMatch(/:host\{/)
    expect(PUNCTUATION_CSS).toContain('.punct[data-tr=ru] .tr-ru,.punct[data-tr=kk] .tr-kk{display:block}')
    expect(PUNCTUATION_CSS).toContain('.punct.in-game{background:#2B2450}')
  })

  it('шрифт — сайта: своих @font-face (Onest) нет', () => {
    expect(PUNCTUATION_CSS).not.toMatch(/@font-face|Onest/)
    expect(PUNCTUATION_CSS).toContain('--font:var(--punct-font,inherit)')
  })

  it('ширина — по контейнеру раздела, игра — блок в колонке высотой с окно', () => {
    expect(PUNCTUATION_CSS).toContain('.punct{container:punct/inline-size')
    expect(PUNCTUATION_CSS).not.toMatch(/@media \((max|min)-width/)
    expect(PUNCTUATION_CSS).not.toMatch(/\d(vw)\b/)
    expect(PUNCTUATION_CSS).toContain('.adv.game{height:var(--punct-game-h,100dvh)}')
    // секции урока встают под липкую шапку раздела (scroll-padding прототипа жил на <html>)
    expect(PUNCTUATION_CSS).toContain('scroll-margin-top:84px')
  })
})
