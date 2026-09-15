import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { scanDisabledControls, gapKey, resolveVariableClasses, stripInterpolations } from './disabled-controls.js'

const ROOT = new URL('../../src', import.meta.url).pathname
const BASELINE = JSON.parse(readFileSync(new URL('./disabled-controls-baseline.json', import.meta.url), 'utf8'))

function collect(dir, ext, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) collect(full, ext, out)
    else if (entry.name.endsWith(ext) && !entry.name.includes('.test.')) {
      out.push({ path: full.slice(ROOT.length - 3), text: readFileSync(full, 'utf8') })
    }
  }
  return out
}

// ——— сам сканер: он один раз уже врал, и молча -------------------------------
//
// Первая версия отбирала имена классов по одному дефису и теряла BEM на
// подчёркиваниях (`board__tool`) — доска попадала в отчёт зря, хотя у неё и
// `:disabled` есть, и баннер ученику. Сканер без своих тестов бесполезен:
// сломается он тихо, а список дыр будет выглядеть правдоподобно.
describe('сканер', () => {
  const css = [{ path: 'a.css', text: '.ok-btn:disabled { opacity: .4 } .block__tool:disabled { opacity: .4 }' }]

  it('видит кнопку без выключенного вида', () => {
    const jsx = [{ path: 'a.jsx', text: '<button className="bad-btn" disabled={x}>hi</button>' }]
    const { gaps } = scanDisabledControls({ jsxFiles: jsx, cssFiles: css })
    expect(gaps.map(gapKey)).toEqual(['a.jsx <button> .bad-btn'])
  })

  it('молчит, когда правило есть', () => {
    const jsx = [{ path: 'a.jsx', text: '<button className="ok-btn" disabled={x}>hi</button>' }]
    expect(scanDisabledControls({ jsxFiles: jsx, cssFiles: css }).gaps).toHaveLength(0)
  })

  it('BEM на подчёркиваниях — не дыра', () => {
    const jsx = [{ path: 'a.jsx', text: '<button className={`block__tool block__tool--icon${on ? " is-on" : ""}`} disabled={x} />' }]
    expect(scanDisabledControls({ jsxFiles: jsx, cssFiles: css }).gaps).toHaveLength(0)
  })

  it('покрытым считается элемент, а не каждый его класс', () => {
    const jsx = [{ path: 'a.jsx', text: '<button className="ok-btn ok-btn--sm" disabled={x} />' }]
    expect(scanDisabledControls({ jsxFiles: jsx, cssFiles: css }).gaps).toHaveLength(0)
  })

  it('разбирает класс, собранный переменной', () => {
    const text = "let cls = 'ok-btn'\nif (a) cls += ' is-ok'\nreturn <button className={cls} disabled={x} />"
    expect(scanDisabledControls({ jsxFiles: [{ path: 'a.jsx', text }], cssFiles: css }).gaps).toHaveLength(0)
    expect(resolveVariableClasses(text, 'cls')).toContain('ok-btn')
  })

  it('нативное поле и свой компонент — отдельными списками', () => {
    const jsx = [{ path: 'a.jsx', text: '<input className="bad-btn" disabled={x} /><Thing disabled={x} />' }]
    const res = scanDisabledControls({ jsxFiles: jsx, cssFiles: css })
    expect(res.gaps).toHaveLength(0)
    expect(res.native).toHaveLength(1)
    expect(res.components).toHaveLength(1)
  })

  it('aria-disabled за `disabled` не считается', () => {
    const jsx = [{ path: 'a.jsx', text: '<button className="bad-btn" aria-disabled={x} />' }]
    expect(scanDisabledControls({ jsxFiles: jsx, cssFiles: css }).gaps).toHaveLength(0)
  })

  it('выражения внутри `${…}` за классы не принимаются', () => {
    expect(stripInterpolations('a-b${cond ? "c-d" : ""}e-f')).toBe('a-be-f')
  })
})

// ——— сторож ------------------------------------------------------------------
describe('немые контролы не заводятся заново', () => {
  const { gaps } = scanDisabledControls({
    jsxFiles: collect(ROOT, '.jsx'),
    cssFiles: collect(ROOT, '.css'),
  })
  const found = [...new Set(gaps.map(gapKey))].sort()
  const known = new Set(BASELINE.known)

  it('новых нет', () => {
    const fresh = found.filter((key) => !known.has(key))
    expect(fresh, `Контрол выключается, а выглядит живым. Дай ему вид выключенного
(правило со сцепкой :disabled или класс is-locked) — либо, если это осознанно,
допиши строку в scripts/lib/disabled-controls-baseline.json:\n${fresh.join('\n')}`)
      .toEqual([])
  })

  it('починенное вычеркнуто из списка', () => {
    const stale = [...known].filter((key) => !found.includes(key))
    expect(stale, `Этих дыр больше нет — убери строки из
scripts/lib/disabled-controls-baseline.json, чтобы список не врал:\n${stale.join('\n')}`)
      .toEqual([])
  })
})
