import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { getSatErrors, patchSatError } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { plural } from '../../lib/plural.js'
import EmptyState from '../../ielts/ui/EmptyState.jsx'
import { FlagIcon } from '../../ielts/icons.jsx'
import { ReplayIcon } from '../icons.jsx'
import { ERROR_TYPES } from '../study/ErrorTypeDialog.jsx'
import { parse } from '../model/plan.js'
import { skillName } from '../names.js'

const VIEWS = ['due', 'waiting', 'resolved']

/**
 * «Ошибки» — журнал ошибок. Нет в Figma: адаптация прототипа errors.js. Неверный ответ встаёт в очередь на 3 дня;
 * здесь видно, что пора повторить, что ждёт срока и что закрыто. Тип ошибки меняется прямо в строке; «Разобрано» —
 * ручная отметка (setReviewed прототипа), её можно снять. Сама очередь закрывает ошибку верным ответом без помощи.
 * Ручного добавления ошибки (addManualError прототипа) пока нет.
 */
export default function ErrorsTab({ onReview }) {
  const { t, lang } = useI18n()
  const token = loadToken()
  const [view, setView] = useState('due')
  const [list, setList] = useState(null)
  const [all, setAll] = useState([])
  const [busy, setBusy] = useState(false)
  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const fmt = (s) => new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).format(parse(s.slice(0, 10)))

  const load = useCallback(() => {
    getSatErrors(token, 'all')
      .then((l) => {
        setAll(l)
        setList(l)
      })
      .catch(() => setList([]))
  }, [token])
  useEffect(() => load(), [load])

  const shown = (list || []).filter((e) => (view === 'resolved' ? e.resolvedAt : view === 'due' ? !e.resolvedAt && e.due : !e.resolvedAt && !e.due))
  const counts = Object.fromEntries(VIEWS.map((v) => [v, all.filter((e) => (v === 'resolved' ? e.resolvedAt : v === 'due' ? !e.resolvedAt && e.due : !e.resolvedAt && !e.due)).length]))

  const patch = async (id, body) => {
    setBusy(true)
    try {
      const upd = await patchSatError(token, id, body)
      setList((l) => l.map((e) => (e.id === id ? upd : e)))
      setAll((l) => l.map((e) => (e.id === id ? upd : e)))
    } finally {
      setBusy(false)
    }
  }

  if (!list) return null
  return (
    <div className="st-errs">
      <div className="st-plan__bar">
        <div className="ih-seg" role="tablist">
          {VIEWS.map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => setView(v)}>
              {t(`sat.errs.view.${v}`)} · {counts[v]}
            </button>
          ))}
        </div>
        <span className="st-spacer" />
        {view === 'due' && counts.due > 0 && (
          <button type="button" className="ih-cta st-errs__all" onClick={onReview}><ReplayIcon size={18} />{t('sat.errs.reviewAll', { n: String(counts.due) })}</button>
        )}
      </div>
      <p className="st-plan__note">{t('sat.errs.rule')}</p>
      {shown.length === 0 ? (
        <EmptyState icon={<FlagIcon size={28} />} title={t(`sat.errs.empty.${view}`)} text={t('sat.errs.emptyText')} />
      ) : (
        <ul className="st-errs__list">
          {shown.map((e) => (
            <li key={e.id} className="st-card st-err">
              <div className="st-err__main">
                <span className="st-err__skill"><i className={`st-dot is-${e.section === 'math' ? 'math' : 'rw'}`} />{skillName(e.skillId, lang)}</span>
                {/* теги сервер уже снял, остались сущности (&minus;, &pi;) — их раскрывает разметка */}
                {e.stem && <p className="st-err__stem" dangerouslySetInnerHTML={{ __html: e.stem.length > 160 ? `${e.stem.slice(0, 160)}…` : e.stem }} />}
                <small className="st-muted">
                  {t(`sat.errs.mode.${e.mode}`)} · {fmt(e.createdAt)} · {e.resolvedAt ? t('sat.errs.closed', { date: fmt(e.resolvedAt) }) : t(e.due ? 'sat.errs.dueNow' : 'sat.errs.dueOn', { date: fmt(e.reviewDueAt) })}
                </small>
              </div>
              <select className="st-err__type" value={e.errorType || ''} disabled={busy} aria-label={t('sat.etype.title')} onChange={(ev) => patch(e.id, { errorType: ev.target.value })}>
                <option value="" disabled>{t('sat.errs.noType')}</option>
                {ERROR_TYPES.map(({ key }) => <option key={key} value={key}>{t(`sat.etype.${key}`)}</option>)}
              </select>
              <button type="button" className="ih-btn ih-btn--outline" disabled={busy} onClick={() => patch(e.id, { resolved: !e.resolvedAt })}>
                {t(e.resolvedAt ? 'sat.errs.reopen' : 'sat.errs.markDone')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {view === 'waiting' && counts.waiting > 0 && <p className="st-muted">{plural(t, lang, 'sat.errs.waitingNote', counts.waiting)}</p>}
    </div>
  )
}
