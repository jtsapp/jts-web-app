import { useEffect, useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import Chip from '../ui/Chip.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { SectionTile } from '../sections.jsx'
import { getIeltsTest } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { formatDate } from '../format.js'
import { ArrowForwardIcon, CheckCircleIcon, MenuBookIcon, MicIcon, RadioOffIcon, TaskAltIcon, TimerIcon } from '../icons.jsx'
import { TIMING, speakingQuestions } from './speaking.js'
import { useI18n } from '../../i18n.jsx'

const MODES = [
  { key: 'exam', Icon: TimerIcon },
  { key: 'practice', Icon: TaskAltIcon },
]

/** Карточка Part 2 — как у экзаменатора: «Describe…», «You should say:», пункты и «and explain…». */
export function CueCard({ doc }) {
  const bullets = doc.bullets || []
  const last = bullets.at(-1) || ''
  const explain = /^and\s/i.test(last)
  return (
    <div className="ih-cue" lang="en">
      <span className="ih-chip ih-chip--green ih-chip--md"><span>Cue card</span></span>
      <h3>{doc.cue}</h3>
      <p className="ih-muted">You should say:</p>
      <ul>{(explain ? bullets.slice(0, -1) : bullets).map((b) => <li key={b}>{b}</li>)}</ul>
      {explain && <p>{last}</p>}
    </div>
  )
}

// Экран задания Speaking: что спросят (тема и число вопросов или карточка), режим и прошлая оценка.
export default function SpeakingTaskView({ token, testId, listLabel, onBackToLearn, onBackToList, onStart, onOpenWork, onGuide }) {
  const { t, lang } = useI18n()
  const [state, setState] = useState({ status: 'loading' })
  const [mode, setMode] = useState('exam')

  useEffect(() => {
    let alive = true
    getIeltsTest(token || loadToken(), testId)
      .then((r) => alive && setState({ status: 'ready', test: r.test, doc: r.document }))
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error' }))
    return () => {
      alive = false
    }
  }, [token, testId])

  const crumbs = [{ label: t('ieltsHub.tab.learn'), onClick: onBackToLearn }, { label: 'Speaking', onClick: onBackToLearn }]
  if (listLabel) crumbs.push({ label: listLabel, onClick: onBackToList })
  if (state.status !== 'ready')
    return (
      <div className="ih-rtask">
        <Breadcrumbs items={[...crumbs, { label: '…' }]} />
        {state.status === 'loading' ? <p className="ih-muted">{t('ieltsReading.loading')}</p> : <EmptyState icon={<MicIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />}
      </div>
    )

  const { test, doc } = state
  const part = Number(doc.kind.slice(4))
  const qs = speakingQuestions(doc)
  const last = test.lastAttempt
  const timing = TIMING[doc.kind]
  return (
    <div className="ih-rtask">
      <Breadcrumbs items={[...crumbs, { label: test.title }]} />
      <div className="ih-rtask__grid">
        <div className="ih-rtask__main">
          <section className="ih-card ih-rtask__info">
            <div className="ih-rtask__title">
              <SectionTile section="speaking" size={48} iconSize={24} />
              <div>
                <h2>{test.title}</h2>
                <p>Speaking · Part {part}</p>
              </div>
            </div>
            <div className="ih-rtask__chips">
              {doc.kind === 'part2' ? (
                <>
                  <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsSpeaking.prepMin', { n: String(timing.prepSec / 60) })}</Chip>
                  <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsSpeaking.talkMin', { n: String(timing.answerSec / 60) })}</Chip>
                </>
              ) : (
                <>
                  <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsReading.questions', { n: String(qs.length) })}</Chip>
                  <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsSpeaking.perAnswer', { n: String(timing.answerSec) })}</Chip>
                </>
              )}
            </div>
            {doc.kind === 'part2' ? <CueCard doc={doc} /> : <p className="ih-muted">{t(`ieltsSpeaking.partText.${doc.kind}`)}</p>}
          </section>
        </div>
        <aside className="ih-rtask__side">
          <h3 className="ih-rtask__label">{t('ieltsReading.modeLabel')}</h3>
          <div className="ih-modes" role="radiogroup" aria-label={t('ieltsReading.modeLabel')}>
            {MODES.map(({ key, Icon }) => {
              const on = mode === key
              return (
                <button key={key} type="button" role="radio" aria-checked={on} className={`ih-mode ${on ? 'is-on' : ''}`} onClick={() => setMode(key)}>
                  <span className="ih-mode__icon"><Icon size={22} /></span>
                  <span className="ih-mode__body">
                    <b>{t(`ieltsSpeaking.mode.${key}`)}</b>
                    <span>{t(`ieltsSpeaking.modeHint.${key}`)}</span>
                  </span>
                  <span className="ih-mode__radio">{on ? <CheckCircleIcon size={22} /> : <RadioOffIcon size={22} />}</span>
                </button>
              )
            })}
          </div>
          <div className="ih-rtask__start">
            <button type="button" className="ih-cta" onClick={() => onStart(test.id, mode)}>
              {t('ieltsSpeaking.start')}
              <ArrowForwardIcon size={20} />
            </button>
          </div>
          <section className="ih-rtask__tools">
            <h3>{t('ieltsSpeaking.guideTitle', { n: String(part) })}</h3>
            <p><MenuBookIcon size={18} />{t('ieltsSpeaking.guideHint')}</p>
            <button type="button" className="ih-btn ih-btn--soft-violet" onClick={onGuide}>{t('ieltsSpeaking.openGuide')}</button>
          </section>
          <section className="ih-card ih-rtask__last">
            <h3>{t('ieltsReading.last.title')}</h3>
            {last ? (
              <>
                <div className="ih-rtask__score"><b>{last.band != null ? `band ${last.band.toFixed(1)}` : t('ieltsWriting.status.grading')}</b></div>
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
