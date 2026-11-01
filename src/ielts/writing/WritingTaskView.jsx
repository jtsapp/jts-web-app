import { useEffect, useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import Chip from '../ui/Chip.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { SectionTile } from '../sections.jsx'
import { getIeltsTest } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { formatDate } from '../format.js'
import { ArrowForwardIcon, CheckCircleIcon, EditIcon, MenuBookIcon, RadioOffIcon, TaskAltIcon, TimerIcon } from '../icons.jsx'
import WritingTaskBody from './WritingTaskBody.jsx'
import { categoryLabel } from './WritingListView.jsx'
import { dropWritingDraft, loadWritingDraft, minWords, timeLimitSec } from './writing.js'
import { useI18n } from '../../i18n.jsx'
import { pickLang } from './drills/drillModel.js'
import { guideSection, writingDrillsForType } from '../practice/practiceModel.js'

const MODES = [
  { key: 'exam', Icon: TimerIcon },
  { key: 'practice', Icon: TaskAltIcon },
]

// Экран задания Writing (ТЗ §3.4): буклет с графиком крупно, режим (с таймером, как на экзамене, или без), черновик;
// справа — «Разминка перед заданием» (3–4 тренировки этого типа, запуск с ty), «Теория этого типа», «Начать писать»,
// «Другие задания этого типа →» и последняя работа с переходом к разбору.
// drills — тренировки трека с частью и типами (practiceModel.writingDrillList); onGuide(section) — глава гида.
export default function WritingTaskView({ token, testId, onBackToLearn, onBackToList, listLabel, onStart, onOpenWork, onGuide, onBack, drills, onStartDrill, onTasksOfType }) {
  const { t, lang } = useI18n()
  const [state, setState] = useState({ status: 'loading' })
  const [mode, setMode] = useState('exam')
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    let alive = true
    getIeltsTest(token || loadToken(), testId)
      .then((r) => alive && setState({ status: 'ready', test: r.test, doc: r.document }))
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error' }))
    setDraft(loadWritingDraft(testId))
    return () => {
      alive = false
    }
  }, [token, testId])

  const crumbs = [{ label: t('ieltsHub.tab.learn'), onClick: onBackToLearn }, { label: 'Writing', onClick: onBackToLearn }]
  if (listLabel) crumbs.push({ label: listLabel, onClick: onBackToList })
  if (state.status !== 'ready')
    return (
      <div className="ih-rtask">
        <Breadcrumbs items={[...crumbs, { label: '…' }]} />
        {state.status === 'loading' ? (
          <p className="ih-muted">{t('ieltsReading.loading')}</p>
        ) : (
          <EmptyState icon={<EditIcon size={28} />} title={t(state.status === 'missing' ? 'ieltsReading.missingTitle' : 'ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />
        )}
      </div>
    )

  const { test, doc } = state
  const chosen = draft?.mode || mode
  const last = test.lastAttempt
  const part = doc.kind === 'task2' ? 'T2' : doc.taskKind === 'task1_general' ? 'GT' : 'T1'
  const ty = test.category || null
  const warm = ty && drills ? writingDrillsForType(drills, part, ty) : []
  const typeName = categoryLabel(t, doc.kind, ty)
  return (
    <div className="ih-rtask">
      <Breadcrumbs items={[...crumbs, { label: test.title }]} />
      {onBack && <button type="button" className="ih-back" onClick={onBack}>← {t('ieltsWNav.back')}</button>}
      <div className="ih-rtask__grid">
        <div className="ih-rtask__main">
          <section className="ih-card ih-rtask__info">
            <div className="ih-rtask__title">
              <SectionTile section="writing" size={48} iconSize={24} />
              <div>
                <h2>{test.title}</h2>
                <p>{doc.kind === 'task2' ? 'Task 2' : doc.taskKind === 'task1_general' ? 'Task 1 · General Training' : 'Task 1 · Academic'}</p>
              </div>
            </div>
            <div className="ih-rtask__chips">
              {categoryLabel(t, doc.kind, test.category) && <Chip tone="neutral" className="ih-chip--soft-ink">{categoryLabel(t, doc.kind, test.category)}</Chip>}
              <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsWriting.minutes', { n: String(Math.round(timeLimitSec(doc) / 60)) })}</Chip>
              <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsWriting.minWords', { n: String(minWords(doc)) })}</Chip>
            </div>
            <WritingTaskBody task={doc} />
          </section>
        </div>

        <aside className="ih-rtask__side">
          <h3 className="ih-rtask__label">{t('ieltsReading.modeLabel')}</h3>
          {draft && (
            <div className="ih-rtask__draft" role="status">
              {t('ieltsWriting.draftNote', { n: String(draft.words || 0) })}
              <button type="button" onClick={() => { dropWritingDraft(testId); setDraft(null) }}>{t('ieltsReading.draftDrop')}</button>
            </div>
          )}
          <div className="ih-modes" role="radiogroup" aria-label={t('ieltsReading.modeLabel')}>
            {MODES.map(({ key, Icon }) => {
              const on = chosen === key
              return (
                <button key={key} type="button" role="radio" aria-checked={on} disabled={!!draft && draft.mode !== key} className={`ih-mode ${on ? 'is-on' : ''}`} onClick={() => setMode(key)}>
                  <span className="ih-mode__icon"><Icon size={22} /></span>
                  <span className="ih-mode__body">
                    <b>{t(`ieltsWriting.mode.${key}`)}</b>
                    <span>{t(`ieltsWriting.modeHint.${key}`, { n: String(Math.round(timeLimitSec(doc) / 60)) })}</span>
                  </span>
                  <span className="ih-mode__radio">{on ? <CheckCircleIcon size={22} /> : <RadioOffIcon size={22} />}</span>
                </button>
              )
            })}
          </div>
          <div className="ih-rtask__start">
            <button type="button" className="ih-cta" onClick={() => onStart(test.id, chosen)}>
              {draft ? t('ieltsReading.continue') : t('ieltsWNav.startWriting')}
              <ArrowForwardIcon size={20} />
            </button>
          </div>
          {ty && onTasksOfType && (
            <button type="button" className="ih-link ih-wcat__more" onClick={() => onTasksOfType(part, ty)}>
              {t('ieltsWNav.otherTasks')} <ArrowForwardIcon size={16} />
            </button>
          )}
          {/* разминка — тренировки именно этого типа, с фильтром раундов по типу (ТЗ §5.4) */}
          {warm.length > 0 && (
            <section className="ih-card ih-wtask__warm">
              <h3>{t('ieltsWNav.warmup')}{warm.some((d) => d.minutes) ? ` · ~${t('ieltsHub.minutes', { n: String(warm.reduce((a, d) => a + (Number(d.minutes) || 0), 0)) })}` : ''}</h3>
              <p className="ih-muted">{t('ieltsWNav.warmupSub', { type: typeName || '' })}</p>
              <div className="ih-wcat__actions">
                {warm.map((d) => (
                  <button key={d.id} type="button" className="ih-btn2 ih-btn2--outline" onClick={() => onStartDrill?.(d, ty)}>
                    {pickLang(d.name, lang) || d.title}{d.minutes ? ` · ${t('ieltsHub.minutes', { n: String(d.minutes) })}` : ''}
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="ih-rtask__tools">
            <h3>{t('ieltsWNav.theoryType')}</h3>
            <p><MenuBookIcon size={18} />{typeName ? t('ieltsWNav.theoryHint', { type: typeName }) : t('ieltsWriting.guideHint')}</p>
            <button type="button" className="ih-btn ih-btn--soft-violet" onClick={() => onGuide?.(guideSection(part, ty))}>{t('ieltsWriting.openGuide')}</button>
          </section>
          <section className="ih-card ih-rtask__last">
            <h3>{t('ieltsWNav.lastWork')}</h3>
            {last ? (
              <>
                <div className="ih-rtask__score">
                  <b>{last.band != null ? `Band ${last.band.toFixed(1)}` : last.status === 'failed' ? t('ieltsMock.result.cell.failed') : t('ieltsWriting.status.pending')}</b>
                </div>
                <p>{formatDate(last.finishedAt, lang)}</p>
                <button type="button" className="ih-btn ih-btn--outline" onClick={() => onOpenWork(last.id)}>{t(last.band != null ? 'ieltsWNav.openReview' : 'ieltsWriting.openWork')}</button>
              </>
            ) : (
              <p>{t('ieltsReading.last.none')}</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
