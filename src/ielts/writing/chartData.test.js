import { describe, it, expect } from 'vitest'
import { axisOf, chartIssues, fmtNum, fmtVal, niceStep, normalizeChart, resolveVisual, unitOf } from './chartData.js'
import { describeChart } from './writing.js'

// Данные визуалов Task 1: оба формата банка (pie одной серией, table серией по x — TEST_FORMAT §7, разбор A4) и
// проверка данных §4.6 — её же гоняет проверка банка.

const LINE = { type: 'line', title: 'Visitors', unit: 'thousands', yMax: 60, yStep: 10, x: ['2015', '2019', '2023*'], series: [{ name: 'Zoo', values: [12, 40, 55] }] }
// W1-AC-103 — pie одной серией по x, как хранится в банке
const PIE_OLD = { type: 'pie', unit: '%', title: 'Smartphone use', x: ['Messaging', 'Social media', 'Other'], series: [{ name: 'Share', values: [50, 30, 20] }] }
// W1-AC-104 — table: строки — серии, колонки — x
const TABLE_OLD = { type: 'table', unit: 'hours', title: 'Exercise', x: ['2000', '2020'], series: [{ name: '18–29', values: [6.5, 4.6] }, { name: '60 and over', values: [1.9, 3.8] }] }

describe('числа и единицы', () => {
  it('разделитель тысяч, проценты и единица', () => {
    expect(fmtNum(1240)).toBe('1,240')
    expect(fmtNum(2.456)).toBe('2.46')
    expect(fmtVal(32, '%')).toBe('32%')
    expect(fmtVal(1240, 'visitors')).toBe('1,240 visitors')
    expect(fmtVal(5, '')).toBe('5')
  })
  it('unit «undefined» — без единицы (W1-AC-020)', () => {
    expect(unitOf({ unit: 'undefined' })).toBe('')
    expect(normalizeChart({ type: 'line', unit: 'undefined', x: [], series: [] }).unit).toBe('')
  })
})

describe('ось Y', () => {
  it('yMax и yStep задания', () => {
    expect(axisOf([12, 40, 55], 60, 10).ticks).toEqual([0, 10, 20, 30, 40, 50, 60])
  })
  it('без них — красивый шаг от нуля до деления над максимумом', () => {
    expect(niceStep(1240)).toBe(500)
    const ax = axisOf([310, 1240], null, null)
    expect(ax.ticks[0]).toBe(0)
    expect(ax.top).toBeGreaterThanOrEqual(1240)
    expect(ax.ticks.length).toBeLessThanOrEqual(6)
  })
  it('yMax ниже данных не обрезает график, мелкий yStep не даёт сотни делений', () => {
    expect(axisOf([80], 50, 10).top).toBe(80)
    expect(axisOf([1000], null, 1).ticks.length).toBeLessThanOrEqual(13)
  })
})

describe('normalizeChart — оба формата банка', () => {
  it('pie одной серией → slices', () => {
    expect(normalizeChart(PIE_OLD).slices).toEqual([{ label: 'Messaging', value: 50 }, { label: 'Social media', value: 30 }, { label: 'Other', value: 20 }])
  })
  it('table серией по x → columns и rows', () => {
    const t = normalizeChart(TABLE_OLD)
    expect(t.columns).toEqual(['', '2000', '2020'])
    expect(t.rows).toEqual([['18–29', 6.5, 4.6], ['60 and over', 1.9, 3.8]])
  })
  it('новый формат не трогает, multi — по частям', () => {
    const pie = { type: 'pie', slices: [{ label: 'A', value: 1 }] }
    expect(normalizeChart(pie).slices).toBe(pie.slices)
    expect(normalizeChart({ type: 'multi', charts: [PIE_OLD] }).charts[0].slices).toHaveLength(3)
  })
  it('describeChart понимает старый формат (раньше table серией падал на columns.join)', () => {
    expect(describeChart(TABLE_OLD)).toContain('Columns:  | 2000 | 2020')
    expect(describeChart(PIE_OLD)).toContain('Messaging — 50%')
  })
})

describe('resolveVisual — визуал раунда', () => {
  const multi = { type: 'multi', charts: [LINE, { ...LINE, title: 'B', series: [{ name: 'a', values: [1, 2, 3] }, { name: 'b', values: [3, 2, 1] }] }] }
  const chartOf = (id) => ({ 'W1-AC-005': multi })[id] || null
  it('inline, ссылка, часть multi и выбор серий', () => {
    expect(resolveVisual(LINE, chartOf)).toBe(LINE)
    expect(resolveVisual({ ref: 'W1-AC-005' }, chartOf)).toBe(multi)
    expect(resolveVisual({ ref: 'W1-AC-005', sub: 1 }, chartOf).title).toBe('B')
    expect(resolveVisual({ ref: 'W1-AC-005', sub: 1, series: [1] }, chartOf).series.map((s) => s.name)).toEqual(['b'])
    expect(resolveVisual({ ref: 'NOPE' }, chartOf)).toBeNull()
  })
})

describe('chartIssues — проверка данных §4.6', () => {
  it('годный визуал — пусто, во всех форматах', () => {
    expect(chartIssues(LINE)).toEqual([])
    expect(chartIssues(PIE_OLD)).toEqual([])
    expect(chartIssues(TABLE_OLD)).toEqual([])
    expect(chartIssues(normalizeChart(TABLE_OLD))).toEqual([])
    expect(chartIssues({ type: 'figure', svg: '<svg/>', alt: 'A process' })).toEqual([])
  })
  it('длина values ≠ длине x', () => {
    expect(chartIssues({ ...LINE, series: [{ name: 'Zoo', values: [1, 2] }] })[0]).toMatch(/series\/0\/values: 2 значений, а подписей x — 3/)
  })
  it('значение больше yMax', () => {
    expect(chartIssues({ ...LINE, series: [{ name: 'Zoo', values: [1, 2, 70] }] })[0]).toMatch(/70 больше yMax 60/)
  })
  it('сумма pie = 100 ± 0.6', () => {
    expect(chartIssues({ type: 'pie', unit: '%', slices: [{ label: 'A', value: 60 }, { label: 'B', value: 40.5 }] })).toEqual([])
    expect(chartIssues({ type: 'pie', unit: '%', slices: [{ label: 'A', value: 60 }, { label: 'B', value: 41 }] })[0]).toMatch(/сумма долей 101/)
    // круг в абсолютных числах сумму 100 не держит
    expect(chartIssues({ type: 'pie', unit: 'tonnes', slices: [{ label: 'A', value: 600 }, { label: 'B', value: 410 }] })).toEqual([])
  })
  it('строка table длиной не в число колонок', () => {
    expect(chartIssues({ type: 'table', columns: ['', 'a', 'b'], rows: [['x', 1]] })[0]).toMatch(/rows\/0: 2 ячеек, а колонок — 3/)
  })
  it('figure без svg или alt, unit «undefined», части multi с путём', () => {
    expect(chartIssues({ type: 'figure', svg: '' })).toHaveLength(2)
    expect(chartIssues({ ...LINE, unit: 'undefined' })[0]).toMatch(/unit/)
    expect(chartIssues({ type: 'multi', charts: [LINE, { type: 'figure', svg: '<svg/>' }] })).toEqual(['charts/1/alt: нет описания схемы'])
  })
})
