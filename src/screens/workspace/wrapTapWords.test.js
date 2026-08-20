// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { wrapTapWords } from './wrapTapWords.js'

describe('wrapTapWords', () => {
  it('заменяет текстовый узел ОДНИМ узлом-обёрткой, а не россыпью соседей', () => {
    const html = '<div class="card"><b>\u{1F3E0}</b>  at home</div>'
    const out = wrapTapWords(html)
    const div = document.createElement('div')
    div.innerHTML = out
    const card = div.querySelector('.card')
    // Раньше замена текстового узла давала N соседних детей (b, text, span,
    // text, span…) — во flex/grid-карточке урока (класс .card) каждое слово
    // становилось отдельным элементом раскладки и уезжало на свою строку.
    // Теперь один узел заменяется одним — b + span-обёртка, как и было.
    expect(card.childNodes.length).toBe(2)
    expect(card.childNodes[1].tagName).toBe('SPAN')
    expect(card.querySelectorAll('.lw-tap-w').length).toBe(2)
    expect(card.textContent.replace(/\s+/g, ' ').trim()).toContain('at home')
  })
})
