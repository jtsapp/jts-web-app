// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import { safeSvg } from './safeSvg.js'
import figures from './__fixtures__/task1-figures.json'

// Схемы банка IELTS (Writing Task 1 process/map, Reading diagram) нарисованы на токенах ядра прототипа:
// fill="var(--jts-bg-soft)", stroke="var(--jts-line-strong)". Сайт обязан задать каждый такой токен на обёртке схемы:
// без значения fill не вычисляется и наследуется чёрный по умолчанию — схема «Разобранного примера» в «Как писать»
// была сплошным чёрным прямоугольником (замечание владельца 11).
// Фикстуры — настоящие SVG из банка (сид бэкенда = прототип writing-guide.js). BANK — все токены, что встречаются
// в SVG сида (reading-types, writing task1/reference), чтобы новая схема с cyan/gold не почернела частично.
const BANK = [
  '--font', '--jts-ink', '--jts-muted', '--jts-line', '--jts-line-strong', '--jts-bg', '--jts-bg-soft',
  '--jts-violet', '--jts-violet-soft', '--jts-cyan', '--jts-cyan-soft', '--jts-cyan-ink',
  '--jts-green', '--jts-green-soft', '--jts-green-ink', '--jts-gold-soft',
]
const used = [...new Set(Object.values(figures).flatMap((svg) => [...svg.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1])))]

const SRC = path.join(__dirname, '..')
const css = (f) => postcss.parse(fs.readFileSync(path.join(SRC, f), 'utf8'))

// Какие custom properties объявлены правилами, у которых среди селекторов есть ровно `selector`.
function declared(root, selector) {
  const props = new Set()
  root.walkRules((rule) => {
    if (!rule.selectors.map((s) => s.trim()).includes(selector)) return
    rule.walkDecls((d) => d.prop.startsWith('--') && props.add(d.prop))
  })
  return props
}

const light = css('ielts.css')
const dark = css('theme-dark.generated.css')
const DARK = 'html[data-theme="dark"]'

describe('токены схем IELTS', () => {
  it('фикстуры — те схемы, что чернели, и все их токены есть в списке банка', () => {
    expect(figures.process).toContain('9 stored, then')
    expect(figures.mapAfter).toContain('Footbridge')
    expect(used).toContain('--jts-line-strong')
    for (const v of used) expect(BANK).toContain(v)
  })

  it('санитайзер не трогает цвета на токенах', () => {
    const box = document.createElement('div')
    box.innerHTML = safeSvg(figures.process)
    const rect = box.querySelector('rect[rx]')
    expect(box.querySelector('svg').getAttribute('fill')).toBe('var(--jts-ink)')
    expect(rect.getAttribute('fill')).toBe('var(--jts-bg-soft)')
    expect(rect.getAttribute('stroke')).toBe('var(--jts-line-strong)')
    expect(box.querySelectorAll('polygon').length).toBeGreaterThan(0)
  })

  for (const wrap of ['.ih-wchart__figure', '.ih-qfigure']) {
    it(`${wrap}: каждый токен банка задан в светлой теме`, () => {
      const have = declared(light, wrap)
      expect(BANK.filter((v) => !have.has(v))).toEqual([])
    })
    it(`${wrap}: каждый цветовой токен банка переопределён в тёмной теме`, () => {
      const have = declared(dark, `${DARK} ${wrap}`)
      expect(BANK.filter((v) => v !== '--font' && !have.has(v))).toEqual([])
    })
  }
})
