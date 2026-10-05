import { useEffect, useRef } from 'react'
import { counts, firstUnanswered, isAnswered, sectionGroups } from './session.js'
import { ArrowBackIcon, BookmarkIcon, ExpandLessIcon, WarningIcon } from '../icons.jsx'
import { CloseIcon } from '../../ielts/icons.jsx'
import { useI18n } from '../../i18n.jsx'

function tileState(session, i) {
  const q = session.questions[i]
  const a = session.answers[q.id]
  if (i === session.index) return 'is-here'
  if (a?.marked) return 'is-marked'
  if (isAnswered(a)) return 'is-done'
  return ''
}

/**
 * Нижняя лента (Figma SAT 8, 26, 27): плашка «7 из 24» открывает окно всех вопросов, дальше номера — отвеченные
 * тёмные, отмеченные оранжевые, текущий в фиолетовой рамке. Смена секции — разрыв и подпись «R&W 1–12 · Math 13–24».
 */
export function NavRail({ session, onGo, onOpen }) {
  const { t } = useI18n()
  const railRef = useRef(null)
  const groups = sectionGroups(session)
  const total = session.questions.length

  // длинная лента прокручивается к текущему вопросу, а не стоит на первом
  useEffect(() => {
    const rail = railRef.current
    const here = rail?.querySelector('.is-here')
    if (!rail || !here || rail.scrollWidth <= rail.clientWidth) return
    rail.scrollLeft = here.offsetLeft - rail.offsetLeft - (rail.clientWidth - here.offsetWidth) / 2
  }, [session.index])

  return (
    <>
      <button type="button" className="st-pos" aria-haspopup="dialog" onClick={onOpen}>
        {t('sat.run.position', { n: String(session.index + 1), total: String(total) })}
        <ExpandLessIcon size={18} />
      </button>
      <div className="st-rail" ref={railRef} role="group" aria-label={t('sat.run.jump')}>
        {groups.map((g) => (
          <div className="st-rail__group" key={g.from}>
            {Array.from({ length: g.to - g.from + 1 }, (_, k) => {
              const i = g.from - 1 + k
              return (
                <button
                  key={i}
                  type="button"
                  className={`st-rail__n ${tileState(session, i)}`}
                  aria-current={i === session.index ? 'step' : undefined}
                  aria-label={t('sat.run.position', { n: String(i + 1), total: String(total) })}
                  onClick={() => onGo(i)}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      {groups.length > 1 && (
        <span className="st-rail__legend">
          {groups.map((g) => `${g.section === 'math' ? 'Math' : 'R&W'} ${g.from}–${g.to}`).join(' · ')}
        </span>
      )}
    </>
  )
}

/**
 * Окно всех вопросов (Figma SAT 30). Нет в Figma: простой вариант 'nav' — адаптация прототипа question.js (openGrid);
 * макет рисует только проверку модуля. variant='nav' — просто перейти; variant='review' — проверка перед сдачей модуля:
 * пустые номера красной пунктирной рамкой, предупреждение, «К вопросу N» и «Завершить модуль». Esc и фон — закрыть.
 */
export function NavDialog({ session, variant = 'nav', title, subtitle, finishLabel, warn, onGo, onClose, onFinish }) {
  const { t } = useI18n()
  const closeRef = useRef(null)
  const c = counts(session)
  const review = variant === 'review'
  const gap = firstUnanswered(session)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="ih-dialog st-navdlg" role="presentation" onClick={onClose}>
      <div className="st-navdlg__box" role="dialog" aria-modal="true" aria-labelledby="st-navdlg-title" onClick={(e) => e.stopPropagation()}>
        <div className="st-navdlg__head">
          <div>
            <h2 id="st-navdlg-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button ref={closeRef} type="button" className="ih-round st-navdlg__close" aria-label={t('sat.run.close')} onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="st-navdlg__chips">
          <span className="st-chip st-chip--done"><i />{t('sat.run.answered', { n: String(c.answered) })}</span>
          {c.unanswered > 0 && <span className="st-chip st-chip--empty"><i />{t('sat.run.unanswered', { n: String(c.unanswered) })}</span>}
          {c.marked > 0 && <span className="st-chip st-chip--marked"><BookmarkIcon size={14} />{t('sat.run.markedN', { n: String(c.marked) })}</span>}
        </div>
        <div className="st-navdlg__grid">
          {session.questions.map((q, i) => {
            const a = session.answers[q.id]
            const done = isAnswered(a)
            let cls = done ? 'is-done' : review ? 'is-gap' : ''
            if (a?.marked) cls = 'is-marked'
            return (
              <button
                key={q.id}
                type="button"
                className={`st-navdlg__n ${cls} ${i === session.index ? 'is-here' : ''}`}
                aria-label={`${i + 1} · ${t(done ? 'sat.run.tileDone' : 'sat.run.tileEmpty')}${a?.marked ? ` · ${t('sat.run.marked')}` : ''}`}
                onClick={() => onGo(i)}
              >
                <span>{i + 1}</span>
                {a?.marked && <BookmarkIcon size={12} />}
              </button>
            )
          })}
        </div>
        {review && (
          <>
            <p className="st-navdlg__warn">
              <WarningIcon size={20} />
              <span>{warn || t('sat.run.reviewWarn')}</span>
            </p>
            <div className="st-navdlg__actions">
              {gap >= 0 ? (
                <button type="button" className="ih-btn ih-btn--outline st-navdlg__back" onClick={() => onGo(gap)}>
                  <ArrowBackIcon size={18} />{t('sat.run.toQuestion', { n: String(gap + 1) })}
                </button>
              ) : <span />}
              <button type="button" className="st-navdlg__finish" onClick={onFinish}>{finishLabel || t('sat.run.finishModule')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
