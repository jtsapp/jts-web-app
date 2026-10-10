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

const MODES = [
  { key: 'exam', Icon: TimerIcon },
  { key: 'practice', Icon: TaskAltIcon },
]

// Экран задания Writing: буклет с графиком, режим (с таймером, как на экзамене, или без), черновик, прошлые работы
// по этому заданию и вход в «Как писать».
export default function WritingTaskView({ token, testId, onBackToLearn, onBackToList, listLabel, onStart, onOpenWork, onGuide }) {
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
  return (
    <div className="ih-rtask">
      <Breadcrumbs items={[...crumbs, { label: test.title }]} />
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
              {draft ? t('ieltsReading.continue') : t('ieltsWriting.start')}
              <ArrowForwardIcon size={20} />
            </button>
          </div>
          <section className="ih-rtask__tools">
            <h3>{t('ieltsWriting.p.guide.title')}</h3>
            <p><MenuBookIcon size={18} />{t('ieltsWriting.guideHint')}</p>
            <button type="button" className="ih-btn ih-btn--soft-violet" onClick={onGuide}>{t('ieltsWriting.openGuide')}</button>
          </section>
          <section className="ih-card ih-rtask__last">
            <h3>{t('ieltsReading.last.title')}</h3>
            {last ? (
              <>
                <div className="ih-rtask__score">
                  <b>{last.band != null ? `band ${last.band.toFixed(1)}` : t('ieltsWriting.status.pending')}</b>
                </div>
                <p>{formatDate(last.finishedAt, lang)}</p>
                <button type="button" className="ih-btn ih-btn--outline" onClick={() => onOpenWork(last.id)}>{t('ieltsWriting.openWork')}</button>
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
