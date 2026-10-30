import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import ConfirmDialog from '../../ielts/ui/ConfirmDialog.jsx'
import { InfoIcon } from '../../ielts/icons.jsx'
import { CalendarIcon, ErrorIcon, PlusIcon, TrashIcon } from '../icons.jsx'
import { SatModal } from '../question/ToolDialogs.jsx'
import { MANUAL_SOURCES, isRejected, legendKinds, roundSection, scoreBody, sectionState, tableRows, trajectoryChart, validateScore } from '../model/scores.js'
import { rangeText } from '../model/mock.js'
import { fmtDate } from '../model/dates.js'

const W = 372
const H = 210

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function day(s) {
  return new Date(`${String(s).slice(0, 10)}T00:00:00Z`)
}

/**
 * Месяц оси «июн», «авг» (17:2430). Отдельный месяц Intl пишет полной формой («июнь»), поэтому берём его из даты с
 * числом — там он сокращённый — и снимаем число.
 */
function monthLabel(loc, iso) {
  return fmtDate(loc, day(iso), { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/^\d+\s*/, '')
}

const locOf = (lang) => (lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU')

/**
 * Подпись источника в таблице (Figma «NEW 2», 17:2430): «Bluebook · пробник», «Past paper · Test 4». Имя симуляции
 * «Full simulation» — служебное английское с сервера, его не показываем; у сложных симуляций имя своё — его оставляем.
 */
function sourceText(r, t) {
  const src = t(`sat.scores.src.${r.source}`)
  if (r.source === 'BLUEBOOK') return `${src} · ${r.bluebookTest ? `Test ${r.bluebookTest}` : t('sat.scores.mockTag')}`
  if (r.source === 'SIMULATION') return r.label && r.label !== 'Full simulation' ? `${src} · ${r.label}` : src
  return r.label ? `${src} · ${r.label}` : src
}

/** Чип проверки куратора — один и тот же в таблице, форме и плитке (17:8454). */
export function ReviewChip({ status }) {
  const { t } = useI18n()
  if (!status) return null
  return <span className={`st-review is-${status.toLowerCase()}`}>{t(`sat.scores.status.${status}`)}</span>
}

/**
 * Траектория к цели (17:2430): сплошная синяя линия — официальные и Bluebook, симуляция — оранжевая «пилюля» своего
 * диапазона с точкой середины, Past paper — отдельная бирюзовая точка; цель — фиолетовая линия с подписью-пилюлей.
 * Геометрию считает trajectoryChart, здесь только разметка.
 */
export function ScoreTrajectory({ entries, target }) {
  const { t, lang } = useI18n()
  const c = trajectoryChart(entries, target, { w: W, h: H })
  if (!c) return <p className="st-muted st-mocks__empty">{t('sat.mock.trajEmpty')}</p>
  const loc = locOf(lang)
  const goalText = t('sat.scores.goal', { n: String(target) })
  const goalW = 12 + goalText.length * 6.2
  return (
    <svg className="st-traj" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('sat.mock.trajectory')}>
      {c.ticks.map((k) => (
        <g key={k.v}>
          <line x1={34} x2={W - 10} y1={k.y} y2={k.y} className="st-traj__grid" />
          <text x={28} y={k.y + 3} className="st-traj__tick">{k.v}</text>
        </g>
      ))}
      {c.goal != null && (
        <g>
          <line x1={34} x2={W - 10} y1={c.goal} y2={c.goal} className="st-traj__goal" />
          <rect x={W - 10 - goalW} y={c.goal - 22} width={goalW} height={18} rx={9} className="st-traj__goalPill" />
          <text x={W - 10 - goalW / 2} y={c.goal - 9.5} className="st-traj__goalText">{goalText}</text>
        </g>
      )}
      {c.line.length > 1 && <polyline className="st-traj__line" points={c.line.map((p) => `${p.x},${p.y}`).join(' ')} />}
      {c.ranges.map((p) => (
        <g key={p.id}>
          <rect x={p.x - 6} y={p.top} width={12} height={Math.max(12, p.bottom - p.top)} rx={6} className="st-traj__range" />
          <circle cx={p.x} cy={p.mid} r="3.5" className="st-traj__dot is-sim" />
        </g>
      ))}
      {c.line.map((p) => <circle key={p.id} cx={p.x} cy={p.y} r="4.5" className="st-traj__dot is-real" />)}
      {c.dots.map((p) => <circle key={p.id} cx={p.x} cy={p.y} r="6" className={`st-traj__dot is-${p.kind}`} />)}
      {c.months.map((m) => (
        <text key={m.key} x={m.x} y={H - 6} className="st-traj__month">{monthLabel(loc, m.date)}</text>
      ))}
    </svg>
  )
}

/** Легенда траектории — цветные чипы только тех источников, что есть на графике (17:2430). */
export function TrajectoryLegend({ entries }) {
  const { t } = useI18n()
  const kinds = legendKinds(entries)
  if (!kinds.length) return null
  return (
    <div className="st-mocks__legend">
      {kinds.map((k) => <span key={k} className={`st-legend is-${k}`}><i />{t(`sat.scores.legend.${k}`)}</span>)}
    </div>
  )
}

/** Поле секции с подсказкой «200–800» справа и живой проверкой: некратный 10 — предложение округлить (17:4989). */
function SectionField({ label, dot, value, onChange, tried }) {
  const { t } = useI18n()
  const state = sectionState(value)
  const rounded = roundSection(value)
  const bad = state === 'round' || (state === 'range' && value !== '') || (tried && state === 'empty')
  return (
    <label className="st-field">
      <span><i className={`st-dot is-${dot}`} />{label}</span>
      <span className={`st-scoreform__input ${bad ? 'is-bad' : ''}`}>
        <input type="number" inputMode="numeric" min={200} max={800} step={10} value={value} onChange={(e) => onChange(e.target.value)} />
        <small>200–800</small>
      </span>
      {state === 'round' && (
        <button type="button" className="st-scoreform__round" onClick={() => onChange(String(rounded))}>
          <ErrorIcon size={16} />{t('sat.scores.round', { n: String(rounded) })}
        </button>
      )}
      {(state === 'range' || (tried && state === 'empty')) && <small className="st-field__err">{t('sat.scores.err.section')}</small>}
    </label>
  )
}

/**
 * «Добавить результат» (17:4989): официальный SAT, Bluebook или «Другое», дата, баллы секций; итог считается сам —
 * из уже округлённых секций, то есть ровно тот, что сохранится.
 */
function AddScoreDialog({ busy, error, onSave, onClose }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ source: 'BLUEBOOK', takenOn: todayIso(), rw: '', math: '' })
  const [tried, setTried] = useState(false)
  const errs = validateScore(form, todayIso())
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const rw = roundSection(form.rw)
  const math = roundSection(form.math)
  const ready = rw != null && math != null
  const submit = (e) => {
    e.preventDefault()
    setTried(true)
    if (Object.keys(errs).length) return
    onSave(scoreBody(form))
  }
  return (
    <SatModal title={t('sat.scores.addTitle')} onClose={onClose}>
      <form className="st-scoreform" onSubmit={submit} noValidate>
        <p className="st-muted st-scoreform__sub">{t('sat.scores.addSub')}</p>
        <span className="st-scoreform__cap">{t('sat.scores.source')}</span>
        <div className="ih-seg st-scoreform__src" role="radiogroup" aria-label={t('sat.scores.source')}>
          {MANUAL_SOURCES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={form.source === s} className={form.source === s ? 'is-on' : ''} onClick={() => setForm((f) => ({ ...f, source: s }))}>
              {t(s === 'JTS' ? 'sat.scores.srcOther' : `sat.scores.src.${s}`)}
            </button>
          ))}
        </div>
        <label className="st-field">
          <span>{t('sat.scores.date')}</span>
          <span className="st-scoreform__date">
            <CalendarIcon size={20} />
            <input type="date" value={form.takenOn} max={todayIso()} onChange={(e) => set('takenOn')(e.target.value)} />
          </span>
          {tried && errs.takenOn && <small className="st-field__err">{t(`sat.scores.err.${errs.takenOn}`)}</small>}
        </label>
        <div className="st-scoreform__pair">
          <SectionField label="Reading and Writing" dot="rw" value={form.rw} onChange={set('rw')} tried={tried} />
          <SectionField label="Math" dot="math" value={form.math} onChange={set('math')} tried={tried} />
        </div>
        <div className="st-scoreform__total">
          <span>
            <small>{t('sat.scores.totalAuto')}</small>
            {ready && <span>{rw} + {math} = {rw + math}</span>}
          </span>
          <b>{ready ? rw + math : '—'}</b>
        </div>
        {error && <p className="st-error" role="alert">{error}</p>}
        <div className="st-navdlg__actions">
          <button type="button" className="ih-btn ih-btn--outline st-navdlg__back" onClick={onClose}>{t('sat.logerr.cancel')}</button>
          <button type="submit" className="ih-cta" disabled={busy}>{t('sat.scores.save')}</button>
        </div>
      </form>
    </SatModal>
  )
}

/** Баллы строки: у симуляции — диапазоны «530–610» (оценка JTS, не балл), у остальных — числа. */
function cells(r) {
  const range = r.source === 'SIMULATION' ? r.range : null
  return {
    rw: range?.rw ? rangeText(range.rw) : r.rw ?? '—',
    math: range?.math ? rangeText(range.math) : r.math ?? '—',
    total: range?.total ? rangeText(range.total) : r.total ?? '—',
    estimate: !!range?.total,
  }
}

/**
 * Таблица «Результаты» (17:2430): симуляции JTS, Past papers и добавленные баллы с изменением к предыдущему; статус
 * проверки куратора — своей колонкой после итога (17:8454), все три состояния. Свои строки можно удалить; у симуляции
 * и Past paper — «Разбор», у Bluebook Test 8 и 10 — «Сравнение». data — ответ GET /mobile/sat/scores.
 */
export function ScoresTable({ entries, onAdd, onDelete, onReview, onCompare, busy }) {
  const { t, lang } = useI18n()
  const [drop, setDrop] = useState(null)
  const rows = tableRows(entries)
  const loc = locOf(lang)
  return (
    <section className="st-card st-mocks__hist" id="sat-scores">
      <div className="st-mocks__histHead">
        <div>
          <h2>{t('sat.mock.results')}</h2>
          <p className="st-muted">{t('sat.scores.sub')}</p>
        </div>
        <span className="st-spacer" />
        <button type="button" className="st-mocks__add" onClick={onAdd}><PlusIcon size={16} />{t('sat.scores.add')}</button>
      </div>
      {rows.length === 0 ? <p className="st-muted st-mocks__empty">{t('sat.mock.noResults')}</p> : (
        <div className="st-mocks__table" role="table">
          <div className="st-mocks__tr is-head" role="row">
            {['date', 'source', 'rw', 'math', 'total'].map((k) => <span key={k} role="columnheader">{t(`sat.mock.col.${k}`)}</span>)}
            <span role="columnheader" />
            <span role="columnheader">{t('sat.mock.col.delta')}</span>
            <span role="columnheader" />
          </div>
          {rows.map((r) => {
            const c = cells(r)
            return (
              <div key={r.id} className={`st-mocks__tr ${isRejected(r) ? 'is-rejected' : ''}`} role="row">
                <span role="cell" className="is-wide">{r.takenOn ? fmtDate(loc, day(r.takenOn), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—'}</span>
                <span role="cell" className="is-wide">
                  <span className={`st-mocks__src is-${String(r.source).toLowerCase()}`} title={sourceText(r, t)}><i /><span>{sourceText(r, t)}</span></span>
                </span>
                <span role="cell" data-label={t('sat.mock.col.rw')}><b>{c.rw}</b></span>
                <span role="cell" data-label={t('sat.mock.col.math')}><b>{c.math}</b></span>
                <span role="cell" className="st-mocks__total" data-label={t('sat.mock.col.total')}>
                  <b>{c.total}</b>
                  {c.estimate && <span className="st-mocks__est">{t('sat.scores.estimate')}</span>}
                </span>
                <span role="cell"><ReviewChip status={r.reviewStatus} /></span>
                <span role="cell" data-label={t('sat.mock.col.delta')} className={r.delta > 0 ? 'is-up' : r.delta < 0 ? 'is-down' : 'st-muted'}>{r.delta == null ? '—' : `${r.delta > 0 ? '+' : ''}${r.delta}`}</span>
                <span role="cell" className="st-mocks__rowActs">
                  {(r.source === 'SIMULATION' || r.source === 'PAPER') && r.mockId && <button type="button" className="st-link" onClick={() => onReview(r.mockId)}>{t('sat.mock.reviewShort')}</button>}
                  {/* сравнение 6 → 8 → 10 открывается и отсюда, не только из «Плана»; у отклонённого его нет — баллы не в счёт */}
                  {(r.bluebookTest === 8 || r.bluebookTest === 10) && !isRejected(r) && onCompare && (
                    <button type="button" className="st-link" onClick={() => onCompare(r.bluebookTest)}>{t('sat.scores.compare')}</button>
                  )}
                  {MANUAL_SOURCES.includes(r.source) && (
                    <button type="button" className="st-iconbtn" disabled={busy} aria-label={t('sat.scores.delete')} title={t('sat.scores.delete')} onClick={() => setDrop(r)}><TrashIcon size={16} /></button>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
      <p className="st-mocks__note"><InfoIcon size={20} />{t('sat.mock.historyNote')}</p>
      <ConfirmDialog
        open={!!drop}
        title={t('sat.scores.deleteTitle')}
        text={t('sat.scores.deleteText')}
        confirmLabel={t('sat.scores.delete')}
        cancelLabel={t('sat.mock.abandonCancel')}
        busy={busy}
        onConfirm={() => {
          const r = drop
          setDrop(null)
          onDelete(r.id)
        }}
        onCancel={() => setDrop(null)}
      />
    </section>
  )
}

export { AddScoreDialog }
