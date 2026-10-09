// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { safeSvg } from './safeSvg.js'

// Обходы, которые пропускали прежние регулярки (проверено на них вживую)
const ATTACKS = [
  '<svg/onload=alert(1)>',
  '<svg><image/href/onerror=alert(2)></svg>',
  '<svg><a href="&#106;avascript:alert(3)"><text>x</text></a></svg>',
  '<svg><foreignObject><iframe srcdoc="<script>alert(4)</script>"></iframe></foreignObject></svg>',
  '<svg><script>alert(5)</script></svg>',
  '<svg><animate attributeName="href" values="javascript:alert(6)"/></svg>',
]

describe('safeSvg', () => {
  // Проверяем не строку, а то, что из неё соберёт браузер: обработчиков, опасных ссылок и исполняемых узлов нет
  it.each(ATTACKS)('вырезает исполняемое: %s', (dirty) => {
    const box = document.createElement('div')
    box.innerHTML = safeSvg(dirty)
    for (const el of box.querySelectorAll('*')) {
      expect(['script', 'iframe', 'foreignobject', 'animate', 'set']).not.toContain(el.localName.toLowerCase())
      for (const { name, value } of el.attributes) {
        expect(name.toLowerCase()).not.toMatch(/^on/)
        expect(value.replace(/\s/g, '').toLowerCase()).not.toMatch(/^javascript:/)
      }
    }
  })

  it('схема остаётся схемой: фигуры, подписи, стили', () => {
    const svg =
      '<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2" width="50" height="20" fill="#eee" stroke="#333"/>' +
      '<path d="M0 0L10 10" stroke-width="2"/><text x="5" y="15" font-size="12">1 ____</text><line x1="0" y1="0" x2="5" y2="5"/></svg>'
    const clean = safeSvg(svg)
    for (const part of ['<rect', 'viewBox="0 0 200 100"', '<path', 'd="M0 0L10 10"', '<text', '1 ____', '<line', 'fill="#eee"']) expect(clean).toContain(part)
  })

  it('пустое — пустая строка', () => {
    expect(safeSvg('')).toBe('')
    expect(safeSvg(null)).toBe('')
    expect(safeSvg(undefined)).toBe('')
  })
})
