import { useEffect, useRef } from 'react'
import { counts, firstUnanswered, isAnswered, sectionGroups } from './session.js'
import { ArrowBackIcon, BookmarkIcon, ExpandLessIcon, NoCircleIcon, OkCircleIcon, WarningIcon } from '../icons.jsx'
import { CloseIcon, InfoIcon, RadioOffIcon } from '../../ielts/icons.jsx'
import { useI18n } from '../../i18n.jsx'

/**
 * Цвет по результату — только в учебном режиме, где студент и так видит его сразу после ответа (ТЗ 21.10, задача 8).
 * Непроверенный там — is-none (пунктир, «NEW 2» 17:7551): форма дублирует цвет, сетку читают и без различения
 * красного и зелёного. Выбранный, но не проверенный ответ — тоже пунктир: «отвечен» в учебном режиме значит «проверен».
 */
function resultClass(results, qid) {
  if (!results) return ''
  if (results[qid] == null) return 'is-none'
  return results[qid] ? 'is-right' : 'is-wrong'
}

function tileState(session, i, results) {
  const q = session.questions[i]
  const a = session.answers[q.id]
  const res = resultClass(results, q.id)
  if (i === session.index) return `is-here ${res}`
  // результат главнее отметки, отметка — главнее пунктира «ещё не проверен»
  if (res && res !== 'is-none') return res
  if (a?.marked) return 'is-marked'
  if (res) return res
  if (isAnswered(a)) return 'is-done'
  return ''
}

/** Счётчики учебного режима: «Верно · Неверно · Без ответа» вместо «Отвечено · Без ответа». */
export function resultCounts(session, results) {
  let right = 0
  let wrong = 0
  for (const q of session.questions) {
    if (results?.[q.id] === true) right++
    else if (results?.[q.id] === false) wrong++
  }
  return { right, wrong, none: session.questions.length - right - wrong }
}

/** «К вопросу N» учебного режима — первый непроверенный; -1, если проверено всё. */
export function firstUnchecked(session, results) {
  return session.questions.findIndex((q) => results?.[q.id] == null)
}

/**
 * Нижняя лента (Figma SAT 8, 26, 27): плашка «7 из 24» открывает окно всех вопросов, дальше номера — отвеченные
 * тёмные, отмеченные оранжевые, текущий в фиолетовой рамке. Смена секции — разрыв и подпись «R&W 1–12 · Math 13–24».
 */
export function NavRail({ session, onGo, onOpen, results }) {
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
                  className={`st-rail__n ${tileState(session, i, results)}`}
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
 * canFinish — в 'nav' тоже показать предупреждение и «Завершить модуль» (экзамен: на Digital SAT модуль можно закрыть
 * досрочно в любой момент, а не только дойдя до последнего вопроса; ТЗ SAT 17.10, задача 12) — и пустые номера там
 * тоже красным пунктиром («NEW 2», 17:7351). results — учебный режим (17:7551): «Верно · Неверно · Без ответа» со
 * значками, пояснение кодировки и «К вопросу N» — к первому непроверенному.
 */
export function NavDialog({ session, variant = 'nav', title, subtitle, finishLabel, warn, canFinish = false, onGo, onClose, onFinish, results }) {
  const { t } = useI18n()
  const closeRef = useRef(null)
  const c = counts(session)
  const rc = resultCounts(session, results)
  const review = variant === 'review'
  const gap = firstUnanswered(session)
  const studyGap = results ? firstUnchecked(session, results) : -1

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
          {results ? (
            <>
              <span className="st-chip st-chip--right"><OkCircleIcon size={14} />{t('sat.run.rightN', { n: String(rc.right) })}</span>
              <span className="st-chip st-chip--wrong"><NoCircleIcon size={14} />{t('sat.run.wrongN', { n: String(rc.wrong) })}</span>
              <span className="st-chip st-chip--none"><RadioOffIcon size={14} />{t('sat.run.unanswered', { n: String(rc.none) })}</span>
            </>
          ) : (
            <>
              <span className="st-chip st-chip--done"><i />{t('sat.run.answered', { n: String(c.answered) })}</span>
              {c.unanswered > 0 && <span className="st-chip st-chip--empty"><i />{t('sat.run.unanswered', { n: String(c.unanswered) })}</span>}
            </>
          )}
          {c.marked > 0 && <span className="st-chip st-chip--marked"><BookmarkIcon size={14} />{t('sat.run.markedN', { n: String(c.marked) })}</span>}
        </div>
        <div className="st-navdlg__grid">
          {session.questions.map((q, i) => {
            const a = session.answers[q.id]
            const done = isAnswered(a)
            let cls = done ? 'is-done' : review || canFinish ? 'is-gap' : ''
            if (a?.marked) cls = 'is-marked'
            const res = resultClass(results, q.id)
            if (res && (res !== 'is-none' || !a?.marked)) cls = res
            return (
              <button
                key={q.id}
                type="button"
                className={`st-navdlg__n ${cls} ${i === session.index ? 'is-here' : ''}`}
                aria-label={`${i + 1} · ${t(results?.[q.id] != null ? (results[q.id] ? 'sat.run.tileRight' : 'sat.run.tileWrong') : done && !results ? 'sat.run.tileDone' : 'sat.run.tileEmpty')}${a?.marked ? ` · ${t('sat.run.marked')}` : ''}`}
                onClick={() => onGo(i)}
              >
                <span>{i + 1}</span>
                {a?.marked && <BookmarkIcon size={12} />}
              </button>
            )
          })}
        </div>
        {results && !review && !canFinish && (
          <>
            <p className="st-navdlg__note">
              <InfoIcon size={16} />
              <span>{t('sat.run.studyNote')}</span>
            </p>
            {studyGap >= 0 && (
              <div className="st-navdlg__actions">
                <button type="button" className="ih-btn ih-btn--outline st-navdlg__back" onClick={() => onGo(studyGap)}>
                  <ArrowBackIcon size={18} />{t('sat.run.toQuestion', { n: String(studyGap + 1) })}
                </button>
              </div>
            )}
          </>
        )}
        {(review || canFinish) && (
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
