import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import ConfirmDialog from '../../ielts/ui/ConfirmDialog.jsx'
import { InfoIcon } from '../../ielts/icons.jsx'
import { PlusIcon, TrashIcon } from '../icons.jsx'
import { SatModal } from '../question/ToolDialogs.jsx'
import { MANUAL_SOURCES, gapToTarget, scale, scoreBody, tableRows, trajectoryPoints, validateScore } from '../model/scores.js'
import { fmtDate } from '../model/dates.js'

const W = 372
const H = 210
const PAD = { l: 34, r: 10, t: 12, b: 26 }

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function day(s) {
  return new Date(`${String(s).slice(0, 10)}T00:00:00Z`)
}

/** Траектория к цели (прототип 34658a47): точка на результат, цвет — источник, пунктир — цель. */
export function ScoreTrajectory({ entries, target }) {
  const { t, lang } = useI18n()
  const pts = trajectoryPoints(entries)
  const sc = scale([...pts.map((p) => p.total), target || null])
  if (!pts.length || !sc) return <p className="st-muted st-mocks__empty">{t('sat.mock.trajEmpty')}</p>
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const y = (v) => PAD.t + (1 - (v - sc.lo) / (sc.hi - sc.lo)) * (H - PAD.t - PAD.b)
  const n = pts.length
  const x = (i) => PAD.l + 20 + (n === 1 ? (W - PAD.l - PAD.r - 40) / 2 : (i * (W - PAD.l - PAD.r - 40)) / (n - 1))
  return (
    <svg className="st-traj" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('sat.mock.trajectory')}>
      {sc.ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="st-traj__grid" />
          <text x={PAD.l - 6} y={y(v) + 3} className="st-traj__tick">{v}</text>
        </g>
      ))}
      {target && target >= sc.lo && target <= sc.hi && (
        <g>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(target)} y2={y(target)} className="st-traj__goal" />
          <text x={W - PAD.r - 4} y={y(target) - 6} className="st-traj__goalText">{t('sat.mock.goal', { n: String(target) })}</text>
        </g>
      )}
      {n > 1 && <polyline className="st-traj__line" points={pts.map((p, i) => `${x(i)},${y(p.total)}`).join(' ')} />}
      {pts.map((p, i) => (
        <g key={p.id}>
          <circle cx={x(i)} cy={y(p.total)} r="6" className={`st-traj__dot is-${String(p.source).toLowerCase()}`} />
          {(n <= 6 || i === 0 || i === n - 1) && (
            <text x={x(i)} y={H - 6} className="st-traj__month">{fmtDate(loc, day(p.takenOn), { day: 'numeric', month: 'short', timeZone: 'UTC' })}</text>
          )}
        </g>
      ))}
    </svg>
  )
}

/** «Добавить результат» (Figma 30): источник — официальный SAT, JTS или Bluebook, дата, баллы секций; итог считается сам. */
function AddScoreDialog({ busy, error, onSave, onClose }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ source: 'BLUEBOOK', takenOn: todayIso(), rw: '', math: '' })
  const [tried, setTried] = useState(false)
  const errs = validateScore(form, todayIso())
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const total = Number(form.rw) + Number(form.math)
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
              {t(`sat.scores.src.${s}`)}
            </button>
          ))}
        </div>
        <label className="st-field">
          <span>{t('sat.scores.date')}</span>
          <input type="date" value={form.takenOn} max={todayIso()} onChange={set('takenOn')} />
          {tried && errs.takenOn && <small className="st-field__err">{t(`sat.scores.err.${errs.takenOn}`)}</small>}
        </label>
        <div className="st-scoreform__pair">
          <label className="st-field">
            <span><i className="st-dot is-rw" />Reading and Writing</span>
            <input type="number" inputMode="numeric" min={200} max={800} step={10} value={form.rw} onChange={set('rw')} placeholder="200–800" />
            {tried && errs.rw && <small className="st-field__err">{t('sat.scores.err.section')}</small>}
          </label>
          <label className="st-field">
            <span><i className="st-dot is-math" />Math</span>
            <input type="number" inputMode="numeric" min={200} max={800} step={10} value={form.math} onChange={set('math')} placeholder="200–800" />
            {tried && errs.math && <small className="st-field__err">{t('sat.scores.err.section')}</small>}
          </label>
        </div>
        <div className="st-scoreform__total">
          <span>
            <small>{t('sat.scores.totalAuto')}</small>
            {!errs.rw && !errs.math && <span>{form.rw} + {form.math} = {total}</span>}
          </span>
          <b>{!errs.rw && !errs.math ? total : '—'}</b>
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

/**
 * Таблица «Результаты» (B5): симуляции JTS и добавленные баллы с изменением к предыдущему; свои строки можно удалить.
 * Бумажные тесты сюда не входят — их результаты на странице Past papers. data — ответ GET /mobile/sat/scores.
 */
export function ScoresTable({ entries, onAdd, onDelete, onReview, busy }) {
  const { t, lang } = useI18n()
  const [drop, setDrop] = useState(null)
  const rows = tableRows(entries)
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  return (
    <section className="st-card st-mocks__hist" id="sat-scores">
      <div className="st-mocks__histHead">
        <div>
          <h2>{t('sat.mock.results')}</h2>
          <p className="st-muted">{t('sat.scores.sub')}</p>
        </div>
        <span className="st-spacer" />
        <button type="button" className="ih-btn ih-btn--outline" onClick={onAdd}><PlusIcon size={16} />{t('sat.scores.add')}</button>
      </div>
      {rows.length === 0 ? <p className="st-muted st-mocks__empty">{t('sat.mock.noResults')}</p> : (
        <div className="st-mocks__table" role="table">
          <div className="st-mocks__tr is-head" role="row">
            {['date', 'source', 'rw', 'math', 'total', 'delta'].map((k) => <span key={k} role="columnheader">{t(`sat.mock.col.${k}`)}</span>)}
            <span role="columnheader" />
          </div>
          {rows.map((r) => (
            <div key={r.id} className="st-mocks__tr" role="row">
              <span role="cell" className="is-wide">{r.takenOn ? fmtDate(loc, day(r.takenOn), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—'}</span>
              <span role="cell" className="is-wide">
                <span className={`st-mocks__src is-${String(r.source).toLowerCase()}`} title={r.label || undefined}><i /><span>{r.label || t(`sat.scores.src.${r.source}`)}</span></span>
              </span>
              <span role="cell" data-label={t('sat.mock.col.rw')}><b>{r.rw ?? '—'}</b></span>
              <span role="cell" data-label={t('sat.mock.col.math')}><b>{r.math ?? '—'}</b></span>
              <span role="cell" className="st-mocks__total" data-label={t('sat.mock.col.total')}><b>{r.total ?? '—'}</b></span>
              <span role="cell" data-label={t('sat.mock.col.delta')} className={r.delta > 0 ? 'is-up' : r.delta < 0 ? 'is-down' : 'st-muted'}>{r.delta == null ? '—' : `${r.delta > 0 ? '+' : ''}${r.delta}`}</span>
              <span role="cell" className="st-mocks__rowActs">
                {r.source === 'SIMULATION' && r.mockId && <button type="button" className="st-link" onClick={() => onReview(r.mockId)}>{t('sat.mock.reviewShort')}</button>}
                {r.source !== 'SIMULATION' && (
                  <button type="button" className="st-iconbtn" disabled={busy} aria-label={t('sat.scores.delete')} title={t('sat.scores.delete')} onClick={() => setDrop(r)}><TrashIcon size={16} /></button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="st-mocks__note"><InfoIcon size={20} />{t('sat.scores.note')}</p>
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

export { AddScoreDialog, gapToTarget }
