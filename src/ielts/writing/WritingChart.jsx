import { describeChart } from './writing.js'
import { safeSvg } from '../safeSvg.js'

// Графики Task 1 Academic — порт chartView прототипа (30-writing.html): линии, столбцы, круг, таблица, пара графиков
// и схема/карта (svg банка). Рисуем из данных, а не картинкой (§3): те же данные видит модель при оценке, и цифры на
// экране с ними совпадают. У каждого SVG — подпись данных для скринридера.

const COLORS = ['#9047ff', '#14b8c4', '#f08a24', '#1f9d55', '#d4a017', '#e5484d']
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'circle', 'square']

// маркер серии: цвет + форма — линии различимы и без цвета
function Marker({ i, x, y, r = 4 }) {
  const st = { fill: '#fff', stroke: COLORS[i % COLORS.length], strokeWidth: 2 }
  const shape = SHAPES[i % SHAPES.length]
  if (shape === 'square') return <rect x={x - r} y={y - r} width={2 * r} height={2 * r} style={st} />
  if (shape === 'triangle') return <polygon points={`${x},${y - r - 1} ${x + r + 1},${y + r} ${x - r - 1},${y + r}`} style={st} />
  if (shape === 'diamond') return <polygon points={`${x},${y - r - 1} ${x + r + 1},${y} ${x},${y + r + 1} ${x - r - 1},${y}`} style={st} />
  return <circle cx={x} cy={y} r={r} style={st} />
}

function Legend({ names, kind }) {
  return (
    <div className="ih-wchart__legend" lang="en">
      {names.map((name, i) => (
        <span key={name}>
          <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true">
            {kind === 'line' ? (
              <>
                <line x1="1" x2="25" y1="7" y2="7" stroke={COLORS[i % COLORS.length]} strokeWidth="3" />
                <Marker i={i} x={13} y={7} />
              </>
            ) : (
              <rect x="4" y="1" width="18" height="12" rx="2" fill={COLORS[i % COLORS.length]} />
            )}
          </svg>
          {name}
        </span>
      ))}
    </div>
  )
}

function frame(c) {
  const W = 420
  const H = 260
  const all = c.series.flatMap((s) => s.values)
  const top = Math.max(...all, 1)
  const step = c.yStep || Math.max(1, Math.ceil(top / 5))
  const max = c.yMax || Math.ceil(top / step) * step
  const L = 38
  const R = 12
  const T = 20
  const B = 30
  return { W, H, L, R, T, B, step, max, unit: c.unit || '', Y: (v) => T + ((max - v) * (H - T - B)) / max }
}

function Axes({ o }) {
  const ticks = []
  for (let v = 0; v <= o.max + 1e-9; v += o.step) ticks.push(v)
  return (
    <>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={o.L} x2={o.W - o.R} y1={o.Y(v)} y2={o.Y(v)} className="ih-wchart__grid" />
          <text x={o.L - 6} y={o.Y(v) + 4} textAnchor="end" className="ih-wchart__tick">{Math.round(v * 100) / 100}</text>
        </g>
      ))}
      <line x1={o.L} x2={o.L} y1={o.T} y2={o.H - o.B} className="ih-wchart__axis" />
      <line x1={o.L} x2={o.W - o.R} y1={o.H - o.B} y2={o.H - o.B} className="ih-wchart__axis" />
      {o.unit && <text x={o.L - 6} y={o.T - 6} textAnchor="end" className="ih-wchart__tick">{o.unit}</text>}
    </>
  )
}

function LineChart({ c }) {
  const o = frame(c)
  const X = (i) => o.L + 14 + (i * (o.W - o.L - o.R - 28)) / Math.max(1, c.x.length - 1)
  const every = Math.max(1, Math.ceil(c.x.length / 12))
  return (
    <>
      <svg viewBox={`0 0 ${o.W} ${o.H}`} width="100%" role="img" aria-label={describeChart(c)} data-chart="line">
        <Axes o={o} />
        {c.x.map((x, i) => (i % every === 0 || i === c.x.length - 1 ? <text key={x} x={X(i)} y={o.H - 10} textAnchor="middle" className="ih-wchart__tick">{x}</text> : null))}
        {c.series.map((s, si) => {
          const pts = s.values.map((v, i) => [X(i), o.Y(v)])
          return (
            <g key={s.name}>
              <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={COLORS[si % COLORS.length]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, k) => <Marker key={k} i={si} x={p[0]} y={p[1]} />)}
            </g>
          )
        })}
      </svg>
      <Legend names={c.series.map((s) => s.name)} kind="line" />
    </>
  )
}

function BarChart({ c }) {
  const o = frame(c)
  const n = c.series.length
  const groupW = (o.W - o.L - o.R) / c.x.length
  const barW = Math.min(26, (groupW - 10) / n)
  return (
    <>
      <svg viewBox={`0 0 ${o.W} ${o.H}`} width="100%" role="img" aria-label={describeChart(c)} data-chart="bar">
        <Axes o={o} />
        {c.x.map((x, i) => {
          const gx = o.L + i * groupW + (groupW - barW * n) / 2
          return (
            <g key={x}>
              {c.series.map((s, si) => {
                const y = o.Y(s.values[i])
                return <rect key={s.name} x={gx + si * barW} y={y} width={Math.max(1, barW - 2)} height={Math.max(0, o.H - o.B - y)} fill={COLORS[si % COLORS.length]} />
              })}
              <text x={o.L + i * groupW + groupW / 2} y={o.H - 10} textAnchor="middle" className="ih-wchart__tick">{x}</text>
            </g>
          )
        })}
      </svg>
      <Legend names={c.series.map((s) => s.name)} kind="bar" />
    </>
  )
}

function PieChart({ c }) {
  const S = 220
  const r = 90
  const cx = S / 2
  const total = c.slices.reduce((a, s) => a + Number(s.value), 0) || 1
  const p = (a) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cx + r * Math.sin(a)).toFixed(2)}`
  let a0 = -Math.PI / 2
  const paths = c.slices.map((s, i) => {
    const a1 = a0 + (Number(s.value) / total) * 2 * Math.PI
    const d = `M${cx},${cx} L${p(a0)} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z`
    a0 = a1
    return <path key={s.label} d={d} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="2" />
  })
  return (
    <>
      <div className="ih-wchart__pie">
        <svg viewBox={`0 0 ${S} ${S}`} width="100%" role="img" aria-label={describeChart(c)} data-chart="pie">{paths}</svg>
      </div>
      <Legend names={c.slices.map((s) => `${s.label} — ${s.value}${c.unit === '%' ? '%' : ''}`)} kind="pie" />
    </>
  )
}

function DataTable({ c }) {
  return (
    <div className="ih-wchart__tablewrap">
      <table className="ih-wchart__table" lang="en">
        <thead>
          <tr>{c.columns.map((x) => <th key={x}>{x}</th>)}</tr>
        </thead>
        <tbody>
          {c.rows.map((row, ri) => (
            <tr key={ri}>{row.map((x, i) => (i === 0 ? <th key={i}>{x}</th> : <td key={i}>{x}</td>))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function WritingChart({ chart }) {
  if (!chart) return null
  if (chart.type === 'multi')
    return (
      <div className="ih-wchart__multi" role={chart.alt ? 'group' : undefined} aria-label={chart.alt || undefined}>
        {(chart.charts || []).map((c, i) => <WritingChart key={i} chart={c} />)}
      </div>
    )
  let body = null
  if (chart.type === 'line') body = <LineChart c={chart} />
  else if (chart.type === 'bar') body = <BarChart c={chart} />
  else if (chart.type === 'pie') body = <PieChart c={chart} />
  else if (chart.type === 'table') body = <DataTable c={chart} />
  else if (chart.type === 'figure')
    body = <div className="ih-wchart__figure" role="img" aria-label={chart.alt || ''} dangerouslySetInnerHTML={{ __html: safeSvg(chart.svg) }} />
  return (
    <figure className="ih-wchart" data-chart={chart.type}>
      {chart.title && <figcaption lang="en">{chart.title}</figcaption>}
      {body}
    </figure>
  )
}
