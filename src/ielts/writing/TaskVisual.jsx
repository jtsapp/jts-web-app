import { axisOf, fmtNum, fmtVal, normalizeChart } from './chartData.js'
import { describeChart } from './writing.js'
import { safeSvg } from '../safeSvg.js'

// Визуал Task 1 (ТЗ §4.1) — один компонент на все места: страница задания и теория (full), превью в карточке (thumb),
// вопрос тренировки (drill) и «отметь ключевые точки» (pick). Порт chartView/vis прототипа: рисуем из данных, а не
// картинкой — те же данные видит модель при оценке (describeChart), и цифры на экране с ними совпадают.
// Цвета — только токены темы (--tv-*, --jts-* на корне .ih-tv, тёмные значения даёт scripts/gen-dark-theme.js): hex в
// разметке не перекрасился бы в тёмной теме. Корень задаёт все --jts-* сам — схема банка читается в любом месте (A6).

const SERIES = 6
const sColor = (k) => `var(--tv-s${(k % SERIES) + 1})`
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'circle', 'square']
// ширина символа подписи 11px — оценка без измерения текста (SSR и jsdom мерить не умеют)
const CH = 6.4

// Размеры холста по режиму: превью — низкий и без подписей мелочи, тренировка — средний
const SIZE = { full: { W: 520, H: 270 }, drill: { W: 440, H: 230 }, pick: { W: 440, H: 240 }, thumb: { W: 300, H: 150 } }

// маркер серии: цвет + форма — линии различимы и без цвета
function Marker({ k, x, y, r = 4 }) {
  const st = { fill: 'var(--tv-surface)', stroke: sColor(k), strokeWidth: 2 }
  const shape = SHAPES[k % SHAPES.length]
  if (shape === 'square') return <rect x={x - r} y={y - r} width={2 * r} height={2 * r} style={st} />
  if (shape === 'triangle') return <polygon points={`${x},${y - r - 1} ${x + r + 1},${y + r} ${x - r - 1},${y + r}`} style={st} />
  if (shape === 'diamond') return <polygon points={`${x},${y - r - 1} ${x + r + 1},${y} ${x},${y + r + 1} ${x - r - 1},${y}`} style={st} />
  return <circle cx={x} cy={y} r={r} style={st} />
}

function Legend({ items, kind }) {
  return (
    <ul className="ih-tv__legend" lang="en">
      {items.map((it, k) => (
        <li key={k}>
          {kind === 'line' ? (
            <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true">
              <line x1="1" x2="25" y1="7" y2="7" stroke={sColor(k)} strokeWidth="3" />
              <Marker k={k} x={13} y={7} />
            </svg>
          ) : (
            <i className="ih-tv__swatch" style={{ background: sColor(k) }} aria-hidden="true" />
          )}
          <span>{it.label}</span>
          {it.value != null && <b>{it.value}</b>}
        </li>
      ))}
    </ul>
  )
}

/** Подпись по оси X в 1–2 строки под ширину слота; не влезло и в две — многоточие (подпись целиком — в <title>). */
export function wrapLabel(text, maxChars) {
  const s = String(text ?? '')
  if (s.length <= maxChars) return [s]
  const words = s.split(/\s+/)
  const lines = ['']
  for (const w of words) {
    const cur = lines[lines.length - 1]
    if (!cur || (cur + ' ' + w).length <= maxChars) lines[lines.length - 1] = cur ? `${cur} ${w}` : w
    else lines.push(w)
  }
  const out = lines.slice(0, 2).map((l) => (l.length > maxChars ? `${l.slice(0, Math.max(1, maxChars - 1))}…` : l))
  if (lines.length > 2) out[1] = `${out[1].slice(0, Math.max(1, maxChars - 1)).replace(/…$/, '')}…`
  return out
}

/**
 * Геометрия осей line/bar. Левое поле — по самой длинной подписи деления (ничего не выходит за viewBox), нижнее — по
 * числу строк подписей X. Единица — над осью, справа от неё: над столбцом подписей она ложилась на верхнее деление.
 */
export function layoutXY(c, mode) {
  const { W, H } = SIZE[mode] || SIZE.full
  const thumb = mode === 'thumb'
  const unit = c.unit
  const all = (c.series || []).flatMap((s) => s?.values || []).map(Number)
  const ax = axisOf(all, c.yMax, c.yStep)
  const tickText = (v) => (unit === '%' ? `${fmtNum(v)}%` : fmtNum(v))
  const L = thumb ? 6 : Math.max(30, Math.max(...ax.ticks.map((v) => tickText(v).length)) * CH + 12)
  const R = 10
  const T = thumb ? 8 : unit && unit !== '%' ? 24 : 14
  const n = Math.max(1, (c.x || []).length)
  const isBar = c.type === 'bar'
  const plotW = W - L - R
  const slot = plotW / n
  const maxChars = Math.max(3, Math.floor((slot - 4) / CH))
  // столбцы — подписи в две строки под слотом; линия — через одну, если не помещаются (годы обычно короткие)
  const labels = (c.x || []).map((x) => (thumb ? [] : isBar ? wrapLabel(x, maxChars) : [String(x)]))
  const lines = Math.max(1, ...labels.map((l) => l.length))
  const longest = Math.max(1, ...(c.x || []).map((x) => String(x).length))
  const every = isBar || thumb ? 1 : Math.max(1, Math.ceil((longest * CH + 8) / Math.max(1, plotW / Math.max(1, n - 1))))
  const B = thumb ? 6 : 10 + lines * 13
  const padL = isBar ? 0 : Math.max(10, (String(c.x?.[0] ?? '').length * CH) / 2 + 2)
  const padR = isBar ? 0 : Math.max(10, (String(c.x?.[n - 1] ?? '').length * CH) / 2 + 2)
  const X = isBar ? (i) => L + slot * (i + 0.5) : (i) => L + padL + ((plotW - padL - padR) * (n === 1 ? 0.5 : i / (n - 1)))
  const Y = (v) => T + (H - T - B) * (1 - v / ax.top)
  return { W, H, L, R, T, B, ax, X, Y, slot, labels, every, tickText, unit, thumb, n }
}

function Axes({ g }) {
  return (
    <g aria-hidden="true">
      {g.ax.ticks.map((v) => (
        <g key={v}>
          <line x1={g.L} x2={g.W - g.R} y1={g.Y(v)} y2={g.Y(v)} className={v === 0 ? 'ih-tv__axis' : 'ih-tv__grid'} />
          {!g.thumb && <text x={g.L - 6} y={g.Y(v) + 4} textAnchor="end" className="ih-tv__tick">{g.tickText(v)}</text>}
        </g>
      ))}
      {!g.thumb && g.unit && g.unit !== '%' && <text x={g.L} y={12} textAnchor="start" className="ih-tv__tick ih-tv__unit">{g.unit}</text>}
    </g>
  )
}

function XLabels({ c, g }) {
  if (g.thumb) return null
  return (
    <g aria-hidden="true">
      {(c.x || []).map((x, i) => {
        if (!(i % g.every === 0 || i === g.n - 1)) return null
        // последняя подпись при прореживании не должна налезать на предпоследнюю показанную
        if (i === g.n - 1 && g.every > 1 && i % g.every !== 0 && i % g.every < g.every / 2) return null
        return (
          <text key={i} x={g.X(i)} y={g.H - g.B + 16} textAnchor="middle" className="ih-tv__tick">
            {g.labels[i].map((line, k) => <tspan key={k} x={g.X(i)} dy={k ? 13 : 0}>{line}</tspan>)}
          </text>
        )
      })}
    </g>
  )
}

const pointLabel = (c, s, i) => `${s?.name ? `${s.name} · ` : ''}${c.x?.[i] ?? ''}: ${fmtVal(s?.values?.[i], c.unit)}`

/**
 * Слой «отметь точки» (режим pick): на каждую подпись X — одна цель во всю высоту, фокус Tab, Enter/Пробел, aria-checked.
 * Маркер стоит на самом высоком значении в этой точке; ok / bad / miss — цвет проверки, подпись — словом в aria.
 */
function PickLayer({ c, g, picked, onPick, marks }) {
  return (
    <g className="ih-tv__picks">
      {(c.x || []).map((x, i) => {
        const vals = (c.series || []).map((s) => Number(s?.values?.[i])).filter(Number.isFinite)
        const top = vals.length ? Math.max(...vals) : 0
        const on = !!picked?.has?.(i)
        const mark = marks?.[i] || ''
        const half = Math.min(g.slot / 2, 22)
        const act = (e) => {
          if (!onPick) return
          if (e.type === 'keydown') {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
          }
          onPick(i)
        }
        return (
          <g
            key={i}
            role="checkbox"
            aria-checked={on}
            aria-label={`${x}: ${(c.series || []).map((s) => fmtVal(s?.values?.[i], c.unit)).join(', ')}${mark ? ` (${mark})` : ''}`}
            tabIndex={onPick ? 0 : -1}
            className={`ih-tv__pick${on ? ' is-on' : ''}${mark ? ` is-${mark}` : ''}`}
            data-i={i}
            onClick={act}
            onKeyDown={act}
          >
            <title>{pointLabel(c, c.series?.[0], i)}</title>
            <rect x={g.X(i) - half} y={g.T} width={half * 2} height={g.H - g.T - g.B} className="ih-tv__pickhit" />
            <circle cx={g.X(i)} cy={g.Y(top)} r={10} className="ih-tv__pickdot" />
          </g>
        )
      })}
    </g>
  )
}

function LineChart({ c, mode, pick }) {
  const g = layoutXY(c, mode)
  const fc = (i) => /\*\s*$/.test(String(c.x?.[i] ?? '')) // прогноз помечен «*» в подписи X (ТЗ §4.2) — пунктиром
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} className="ih-tv__svg" role={mode === 'thumb' ? undefined : 'img'} aria-label={mode === 'thumb' ? undefined : describeChart(c)} data-chart="line">
      <Axes g={g} />
      <XLabels c={c} g={g} />
      {(c.series || []).map((s, k) => {
        const vals = s?.values || []
        let solid = ''
        let dash = ''
        for (let i = 1; i < vals.length; i++) {
          if (vals[i] == null || vals[i - 1] == null) continue
          const seg = `M${g.X(i - 1)},${g.Y(vals[i - 1])}L${g.X(i)},${g.Y(vals[i])}`
          if (fc(i)) dash += seg
          else solid += seg
        }
        return (
          <g key={k}>
            {solid && <path d={solid} fill="none" stroke={sColor(k)} strokeWidth={mode === 'thumb' ? 2 : 2.5} strokeLinejoin="round" strokeLinecap="round" />}
            {dash && <path d={dash} fill="none" stroke={sColor(k)} strokeWidth={mode === 'thumb' ? 2 : 2.5} strokeDasharray="5 4" strokeLinecap="round" />}
            {mode !== 'thumb' &&
              vals.map((v, i) =>
                v == null ? null : (
                  <g key={i}>
                    <Marker k={k} x={g.X(i)} y={g.Y(v)} />
                    <circle cx={g.X(i)} cy={g.Y(v)} r={8} className="ih-tv__hit">
                      <title>{pointLabel(c, s, i)}</title>
                    </circle>
                  </g>
                ),
              )}
          </g>
        )
      })}
      {pick && <PickLayer c={c} g={g} {...pick} />}
    </svg>
  )
}

function BarChart({ c, mode, pick }) {
  const g = layoutXY(c, mode)
  const series = c.series || []
  const groupW = g.slot * 0.74
  const w = groupW / Math.max(1, series.length)
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} className="ih-tv__svg" role={mode === 'thumb' ? undefined : 'img'} aria-label={mode === 'thumb' ? undefined : describeChart(c)} data-chart="bar">
      <Axes g={g} />
      <XLabels c={c} g={g} />
      {series.map((s, k) =>
        (s?.values || []).map((v, i) => {
          if (v == null || !Number.isFinite(Number(v))) return null
          const x = g.L + g.slot * i + (g.slot - groupW) / 2 + w * k
          const y = g.Y(Number(v))
          return (
            <rect key={`${k}-${i}`} x={x + 1} y={y} width={Math.max(2, w - 2)} height={Math.max(0, g.Y(0) - y)} rx="2" fill={sColor(k)}>
              <title>{pointLabel(c, s, i)}</title>
            </rect>
          )
        }),
      )}
      {pick && <PickLayer c={c} g={g} {...pick} />}
    </svg>
  )
}

function PieChart({ c, mode }) {
  const sl = (c.slices || []).filter((s) => Number(s?.value) > 0)
  const total = sl.reduce((a, s) => a + Number(s.value), 0) || 1
  const R = 86
  const C = 90
  const p = (a) => `${(C + R * Math.cos(a)).toFixed(2)},${(C + R * Math.sin(a)).toFixed(2)}`
  // начало каждого сектора — сумма долей до него (без изменяемой переменной в map)
  const starts = sl.reduce((acc, s) => [...acc, acc[acc.length - 1] + (Number(s.value) / total) * 2 * Math.PI], [-Math.PI / 2])
  const paths = sl.map((s, i) => {
    const a0 = starts[i]
    const a1 = starts[i + 1]
    // один сектор на весь круг — дугой не нарисовать (начало = концу), рисуем кругом
    const el =
      sl.length === 1 ? (
        <circle key={i} cx={C} cy={C} r={R} fill={sColor(i)} className="ih-tv__slice"><title>{`${s.label}: ${fmtVal(s.value, c.unit)}`}</title></circle>
      ) : (
        <path key={i} d={`M${C},${C} L${p(a0)} A${R},${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`} fill={sColor(i)} className="ih-tv__slice">
          <title>{`${s.label}: ${fmtVal(s.value, c.unit)}`}</title>
        </path>
      )
    return el
  })
  const svg = (
    <svg viewBox="0 0 180 180" className="ih-tv__svg ih-tv__piesvg" role={mode === 'thumb' ? undefined : 'img'} aria-label={mode === 'thumb' ? undefined : describeChart(c)} data-chart="pie">
      {paths}
    </svg>
  )
  if (mode === 'thumb') return <div className="ih-tv__pie">{svg}</div>
  return (
    <div className="ih-tv__pie">
      {svg}
      <Legend items={(c.slices || []).map((s) => ({ label: s.label, value: fmtVal(s.value, c.unit) }))} kind="pie" />
    </div>
  )
}

function DataTable({ c, mode }) {
  const cols = c.columns || []
  const rows = mode === 'thumb' ? (c.rows || []).slice(0, 4) : c.rows || []
  const cell = (v) => (typeof v === 'number' ? fmtNum(v) : v)
  return (
    <>
      {/* таблица шире экрана телефона прокручивается внутри рамки, а не тянет страницу (ТЗ §4.4) */}
      <div className="ih-tv__tablewrap" tabIndex={mode === 'thumb' ? undefined : 0} role={mode === 'thumb' ? undefined : 'region'} aria-label={mode === 'thumb' ? undefined : c.title || 'table'}>
        <table className="ih-tv__table" lang="en">
          <thead>
            <tr>{cols.map((x, i) => <th key={i} scope="col">{x}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((x, i) => (i === 0 ? <th key={i} scope="row">{x}</th> : <td key={i}>{cell(x)}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mode !== 'thumb' && c.unit && <p className="ih-tv__note" lang="en">{c.unit === '%' ? '%' : `Unit: ${c.unit}`}</p>}
    </>
  )
}

function Figure({ c, mode }) {
  return (
    <div
      className="ih-tv__figure"
      role={mode === 'thumb' ? undefined : 'img'}
      aria-label={mode === 'thumb' ? undefined : c.alt || ''}
      dangerouslySetInnerHTML={{ __html: safeSvg(c.svg) }}
    />
  )
}

function Body({ c, mode, pick }) {
  if (c.type === 'line') return <LineChart c={c} mode={mode} pick={pick} />
  if (c.type === 'bar') return <BarChart c={c} mode={mode} pick={pick} />
  if (c.type === 'pie') return <PieChart c={c} mode={mode} />
  if (c.type === 'table') return <DataTable c={c} mode={mode} />
  if (c.type === 'figure') return <Figure c={c} mode={mode} />
  return null
}

// Легенда — только если серий больше одной или у серии есть имя (ТЗ §4.4); у превью легенды нет вовсе
function seriesLegend(c, mode) {
  if (mode === 'thumb' || (c.type !== 'line' && c.type !== 'bar')) return null
  const s = c.series || []
  if (!(s.length > 1 || s[0]?.name)) return null
  return <Legend items={s.map((x) => ({ label: x?.name || '' }))} kind={c.type} />
}

function Part({ c, mode, pick, sub }) {
  return (
    <div className="ih-tv__part" data-chart={c.type}>
      {mode !== 'thumb' && c.title && <p className={sub ? 'ih-tv__title is-sub' : 'ih-tv__title'} lang="en">{c.title}</p>}
      <Body c={c} mode={mode} pick={pick} />
      {seriesLegend(c, mode)}
    </div>
  )
}

/**
 * chart — визуал задания (line | bar | pie | table | multi | figure; pie/table в обоих форматах банка).
 * mode — full | thumb | drill | pick. Для pick: picked (Set индексов X), onPick(i), marks ({i: 'ok'|'bad'|'miss'}).
 * label — короткая подпись превью для скринридера (без неё превью скрыто от него: рядом есть название задания).
 */
export default function TaskVisual({ chart, mode = 'full', picked, onPick, marks, label, className = '' }) {
  const c = normalizeChart(chart)
  if (!c || !c.type) return null
  const pick = mode === 'pick' ? { picked, onPick, marks } : null
  const thumb = mode === 'thumb'
  let inner
  if (c.type === 'multi') {
    const parts = thumb ? (c.charts || []).slice(0, 1) : c.charts || []
    // pick — у первого графика: индексы X разных частей не сравнимы
    inner = (
      <div className="ih-tv__multi" role={!thumb && c.alt ? 'group' : undefined} aria-label={!thumb ? c.alt || undefined : undefined}>
        {parts.map((p, i) => <Part key={i} c={p} mode={mode} pick={i === 0 ? pick : null} sub />)}
      </div>
    )
  } else inner = <Part c={c} mode={mode} pick={pick} />
  return (
    <figure
      className={`ih-tv ih-tv--${mode} ${className}`.trim()}
      data-chart={c.type}
      aria-hidden={thumb && !label ? true : undefined}
      aria-label={thumb && label ? label : undefined}
      role={thumb && label ? 'img' : undefined}
    >
      {inner}
    </figure>
  )
}
