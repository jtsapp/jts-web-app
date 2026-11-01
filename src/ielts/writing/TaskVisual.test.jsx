// @vitest-environment jsdom
//
// Визуал Task 1 в четырёх режимах (ТЗ §4): подписи в пределах viewBox, легенда только когда нужна, подсказка у каждой
// точки, превью без подписей и скрыто от скринридера, pick — с клавиатуры и с aria-checked.
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import TaskVisual, { layoutXY, wrapLabel } from './TaskVisual.jsx'
import WritingChart from './WritingChart.jsx'
import { normalizeChart } from './chartData.js'

const LINE = { type: 'line', title: 'Visitors to a zoo', unit: 'visitors', x: ['2015', '2017', '2019', '2021', '2023*'], series: [{ name: 'City zoo', values: [1240, 1810, 2100, 980, 2400] }, { name: 'Safari park', values: [600, 700, 900, 1000, 1500] }] }
const ONE = { type: 'bar', title: 'Sales', unit: '%', x: ['Shoes', 'Books and magazines', 'Food'], series: [{ name: '', values: [20, 45, 35] }] }
const PIE_OLD = { type: 'pie', unit: '%', title: 'Smartphone use', x: ['Messaging', 'Social media', 'Other'], series: [{ name: 'Share', values: [50, 30, 20] }] }
const TABLE_OLD = { type: 'table', unit: 'hours', title: 'Exercise', x: ['2000', '2020'], series: [{ name: '18–29', values: [6.5, 1240] }] }
const FIGURE = { type: 'figure', kind: 'process', alt: 'Water is filtered, then stored.', svg: '<svg viewBox="0 0 10 10" onload="alert(1)"><rect width="10" height="10" fill="var(--jts-bg-soft)"/></svg>' }

const texts = (box, sel) => [...box.querySelectorAll(sel)].map((n) => n.textContent)

describe('TaskVisual — full', () => {
  it('line: точки с подсказками, разделители тысяч, единица, легенда двух серий', () => {
    const { container } = render(<TaskVisual chart={LINE} />)
    const root = container.querySelector('figure.ih-tv')
    expect(root.className).toContain('ih-tv--full')
    expect(texts(container, 'title')).toContain('City zoo · 2015: 1,240 visitors')
    expect(texts(container, '.ih-tv__tick')).toContain('visitors')
    expect(texts(container, '.ih-tv__tick')).toContain('3,000')
    expect(texts(container, '.ih-tv__legend li')).toEqual(['City zoo', 'Safari park'])
    // прогноз (*) — пунктиром
    expect(container.querySelector('path[stroke-dasharray]')).toBeTruthy()
    expect(container.querySelector('svg').getAttribute('aria-label')).toContain('Line graph')
  })

  it('одна серия без имени — без легенды; % у делений', () => {
    const { container } = render(<TaskVisual chart={ONE} />)
    expect(container.querySelector('.ih-tv__legend')).toBeNull()
    expect(texts(container, '.ih-tv__tick')).toContain('40%')
    expect(container.querySelectorAll('rect title').length).toBe(3)
  })

  it('подписи не выходят за viewBox: левое поле по длине деления, длинные подписи X — в две строки', () => {
    const g = layoutXY(normalizeChart({ ...ONE, unit: '', series: [{ values: [12000, 45000, 35000] }] }), 'full')
    expect(g.L).toBeGreaterThanOrEqual('50,000'.length * 6)
    const narrow = layoutXY(normalizeChart({ ...ONE, x: ['Books and magazines', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] }), 'full')
    expect(narrow.labels[0].length).toBeLessThanOrEqual(2)
    expect(wrapLabel('Books and magazines', 8)).toEqual(['Books', 'and…'])
    expect(wrapLabel('Food', 8)).toEqual(['Food'])
  })

  it('pie в старом формате банка: секторы с подсказками и легенда со значениями', () => {
    const { container } = render(<TaskVisual chart={PIE_OLD} />)
    expect(container.querySelectorAll('.ih-tv__slice').length).toBe(3)
    expect(texts(container, '.ih-tv__slice title')).toContain('Messaging: 50%')
    expect(texts(container, '.ih-tv__legend b')).toEqual(['50%', '30%', '20%'])
  })

  it('table в старом формате: прокрутка внутри рамки, числа с разделителями, единица подписью', () => {
    const { container } = render(<TaskVisual chart={TABLE_OLD} />)
    const wrap = container.querySelector('.ih-tv__tablewrap')
    expect(wrap.getAttribute('tabindex')).toBe('0')
    expect(texts(container, 'thead th')).toEqual(['', '2000', '2020'])
    expect(texts(container, 'tbody td')).toEqual(['6.5', '1,240'])
    expect(container.querySelector('.ih-tv__note').textContent).toContain('hours')
  })

  it('figure — через safeSvg, с описанием', () => {
    const { container } = render(<TaskVisual chart={FIGURE} />)
    const fig = container.querySelector('.ih-tv__figure')
    expect(fig.getAttribute('aria-label')).toBe(FIGURE.alt)
    expect(fig.innerHTML).not.toContain('onload')
    expect(fig.querySelector('rect').getAttribute('fill')).toBe('var(--jts-bg-soft)')
  })

  it('multi — части друг под другом; WritingChart — тот же компонент', () => {
    const { container } = render(<WritingChart chart={{ type: 'multi', alt: 'Two charts', charts: [LINE, PIE_OLD] }} />)
    expect(container.querySelectorAll('.ih-tv__part').length).toBe(2)
    expect(container.querySelector('.ih-tv__multi').getAttribute('aria-label')).toBe('Two charts')
  })
})

describe('TaskVisual — thumb и drill', () => {
  it('превью: без заголовка, легенды и подписей, скрыто от скринридера', () => {
    const { container } = render(<TaskVisual chart={LINE} mode="thumb" />)
    const root = container.querySelector('.ih-tv')
    expect(root.className).toContain('ih-tv--thumb')
    expect(root.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.ih-tv__title')).toBeNull()
    expect(container.querySelector('.ih-tv__legend')).toBeNull()
    expect(container.querySelector('.ih-tv__tick')).toBeNull()
    expect(container.querySelector('[tabindex]')).toBeNull()
  })
  it('превью с короткой подписью — одна картинка для скринридера; у multi — только первый график', () => {
    const { container } = render(<TaskVisual chart={{ type: 'multi', charts: [LINE, PIE_OLD] }} mode="thumb" label="Line graph" />)
    expect(container.querySelector('.ih-tv').getAttribute('role')).toBe('img')
    expect(container.querySelectorAll('.ih-tv__part').length).toBe(1)
  })
  it('drill — на подложке, с заголовком', () => {
    const { container } = render(<TaskVisual chart={ONE} mode="drill" />)
    expect(container.querySelector('.ih-tv').className).toContain('ih-tv--drill')
    expect(container.querySelector('.ih-tv__title').textContent).toBe('Sales')
  })
})

describe('TaskVisual — pick', () => {
  it('точки — чекбоксы: клик, Enter и пробел зовут onPick, отмеченные — aria-checked, проверка — классом', () => {
    const onPick = vi.fn()
    const { container } = render(<TaskVisual chart={LINE} mode="pick" picked={new Set([1])} onPick={onPick} marks={{ 3: 'bad', 4: 'miss' }} />)
    const boxes = container.querySelectorAll('[role="checkbox"]')
    expect(boxes.length).toBe(5)
    expect(boxes[0].getAttribute('tabindex')).toBe('0')
    expect(boxes[1].getAttribute('aria-checked')).toBe('true')
    expect(boxes[0].getAttribute('aria-checked')).toBe('false')
    expect(boxes[0].getAttribute('aria-label')).toBe('2015: 1,240 visitors, 600 visitors')
    fireEvent.click(boxes[2])
    fireEvent.keyDown(boxes[0], { key: 'Enter' })
    fireEvent.keyDown(boxes[0], { key: ' ' })
    fireEvent.keyDown(boxes[0], { key: 'a' })
    expect(onPick.mock.calls.map((c) => c[0])).toEqual([2, 0, 0])
    expect(boxes[3].getAttribute('class')).toContain('is-bad')
    expect(boxes[4].getAttribute('class')).toContain('is-miss')
  })
  it('без onPick — не в порядке Tab (итог проверки)', () => {
    const { container } = render(<TaskVisual chart={ONE} mode="pick" picked={new Set()} marks={{ 0: 'ok' }} />)
    expect(container.querySelector('[role="checkbox"]').getAttribute('tabindex')).toBe('-1')
  })
})
