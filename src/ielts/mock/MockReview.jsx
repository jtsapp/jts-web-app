import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { SecPlate } from '../today/TodayCards.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { ChevronLeftIcon, QuizIcon } from '../icons.jsx'
import IeltsReadingReviewPage from '../../screens/IeltsReadingReviewPage.jsx'
import WritingWorkView from '../writing/WritingWorkView.jsx'
import SpeakingWorkView from '../speaking/SpeakingWorkView.jsx'

const NAME = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' }

/** Сданные задания секции mock — по ним открывается разбор (у Writing два задания, у Speaking три части). */
export function reviewParts(sec) {
  return (sec?.parts || []).filter((p) => p?.attemptId)
}

/**
 * «Открыть разбор по навыкам» полного mock: одна страница, сверху — переключатель секций (L · R · W · S с баллом или
 * этапом проверки) и, если в секции несколько заданий, Task 1/2 или Part 1–3. Ниже — тот же разбор, что вне mock:
 * Reading/Listening — IeltsReadingReviewPage, Writing/Speaking — страницы работ. Раньше разбор каждой секции открывался
 * отдельным экраном, и чтобы перейти от Listening к Reading, надо было вернуться к итогу.
 */
export default function MockReview({ session, token, initial, onClose }) {
  const { t } = useI18n()
  const firstWithWork = session.sections.find((s) => reviewParts(s).length)?.name || session.sections[0]?.name
  const [sec, setSec] = useState(initial || firstWithWork)
  const [part, setPart] = useState(0)
  const cur = session.sections.find((s) => s.name === sec) || session.sections[0]
  const parts = reviewParts(cur)
  const idx = Math.min(part, Math.max(0, parts.length - 1))

  const bar = (
    <div className="ih-mrev__top">
      <header className="ih-mockbar">
        <b className="ih-ob__logo">just to study</b>
        <span className="ih-mockbar__chip">{session.title} · {t('ieltsMock.review.chip')}</span>
        <span className="ih-run__spacer" />
        <button type="button" className="ih-btn ih-btn--outline ih-mockbar__exit" onClick={onClose}>
          <ChevronLeftIcon size={16} /> <span>{t('ieltsMock.review.back')}</span>
        </button>
      </header>
      <nav className="ih-mrev__tabs" aria-label={t('ieltsMock.review.sections')}>
        <div className="ih-mrev__secs" role="tablist">
          {session.sections.map((s) => (
            <button
              key={s.name}
              type="button"
              role="tab"
              aria-selected={s.name === cur.name}
              className={`ih-mrev__sec${s.name === cur.name ? ' is-on' : ''}`}
              onClick={() => { setSec(s.name); setPart(0) }}
            >
              <SecPlate sec={s.name} size={32} />
              <span>
                <b>{NAME[s.name]}</b>
                <small className={s.band == null ? `is-${s.state}` : ''}>{s.band != null ? s.band.toFixed(1) : t(`ieltsMock.result.cell.${s.state}`)}</small>
              </span>
            </button>
          ))}
        </div>
        {parts.length > 1 && (
          <div className="ih-mrev__parts" role="tablist">
            {parts.map((p, i) => (
              <button key={p.attemptId} type="button" role="tab" aria-selected={i === idx} className={i === idx ? 'is-on' : ''} onClick={() => setPart(i)}>
                {cur.name === 'writing' ? `Task ${i + 1}` : `Part ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </nav>
    </div>
  )

  if (!parts.length) {
    return (
      <div className="ih-run ih-run--rl ih-mrev">
        {bar}
        <div className="ih-mrev__empty">
          <EmptyState icon={<QuizIcon size={28} />} title={t(`ieltsMock.result.cell.${cur.state}`)} text={t('ieltsMock.review.noWork')} />
        </div>
      </div>
    )
  }

  const id = parts[idx].attemptId
  if (cur.name === 'listening' || cur.name === 'reading') {
    return <IeltsReadingReviewPage key={id} token={token} target={{ attemptId: id }} header={bar} />
  }
  return (
    <div className="ih-run ih-run--rl ih-mrev">
      {bar}
      <div className="ih-mrev__body">
        {cur.name === 'writing'
          ? <WritingWorkView key={id} token={token} attemptId={id} embedded onGuide={() => {}} />
          : <SpeakingWorkView key={id} token={token} attemptId={id} embedded />}
      </div>
    </div>
  )
}
