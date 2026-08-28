'use client'

import { useI18n } from '../../i18n.jsx'
import { missCount, selfCheck, toggleSelfCheck } from '../../practice/workbook/workbookProgress.js'
import { ActRail } from './WorkbookAct.jsx'
import { loc } from './loc.js'

// Итог урока. Порт renderWrap (data/jtsworkbook-a0.html:6416): «пройдено»,
// счётчик оставшихся ошибок и самопроверка — три утверждения «я умею», по
// которым студент сам отмечает, что усвоил. Баллов здесь нет намеренно.

/** Порт selfCheckItems (:6409). */
export function selfCheckItems(lesson, t, lang) {
  const out = [loc(lesson.can, lang) || loc(lesson.fn, lang)]
  if (lesson.gr) out.push(t('workbook.scUse') + ' ' + lesson.gr + '.')
  out.push(t('workbook.scWords', { n: lesson.voc.length }))
  return out.filter(Boolean)
}

export default function WorkbookWrap({
  level,
  lesson,
  progress,
  onBack,
  onReview,
  onNext,
  nextTitle,
  onTick,
}) {
  const { t, lang } = useI18n()
  const mistakes = missCount(level, progress)
  const items = selfCheckItems(lesson, t, lang)

  return (
    <>
      <ActRail
        title={lesson.title}
        step={lesson.acts.length - 1}
        total={lesson.acts.length}
        doneMap={() => true}
        onBack={onBack}
      />
      <div className="wb-card">
        <div className="wb-done">
          <div className="wb-done__big" aria-hidden="true">
            ✓
          </div>
          <h2>{t('workbook.wrapTitle')}</h2>
          <p>{lesson.title}</p>
        </div>

        {mistakes > 0 ? (
          <button type="button" className="wb-mistakes wb-mistakes--inline" onClick={onReview}>
            <span className="wb-mistakes__ic" aria-hidden="true">
              ⌾
            </span>
            <span>
              <b>{t('workbook.mistakesN', { n: mistakes })}</b>
              <em>{t('workbook.reviewSub')}</em>
            </span>
            <span className="wb-mistakes__go">→</span>
          </button>
        ) : null}

        <div className="wb-sect">
          <h3>{t('workbook.scTitle')}</h3>
          {items.map((txt, k) => {
            const on = selfCheck(level, lesson.n, k, progress)
            return (
              <button
                key={k}
                type="button"
                className={'wb-scrow' + (on ? ' is-on' : '')}
                aria-pressed={on}
                onClick={() => {
                  toggleSelfCheck(level, lesson.n, k)
                  onTick()
                }}
              >
                <span className="wb-scrow__box" aria-hidden="true">
                  ✓
                </span>
                <span>{txt}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="wb-actionbar">
        <button type="button" className="wb-ghost" onClick={onBack}>
          {t('workbook.home')}
        </button>
        {nextTitle ? (
          <button type="button" className="wb-primary wb-primary--grow" onClick={onNext}>
            {t('workbook.nextLesson')} →
          </button>
        ) : null}
      </div>
    </>
  )
}
