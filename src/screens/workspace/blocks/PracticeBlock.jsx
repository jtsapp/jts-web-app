import { useEffect, useMemo, useRef } from 'react'
import { useI18n } from '../../../i18n.jsx'
import TapText from '../TapText.jsx'
import ChoiceQuestion from '../practice/ChoiceQuestion.jsx'
import ChipsQuestion from '../practice/ChipsQuestion.jsx'
import GapQuestion from '../practice/GapQuestion.jsx'
import MatchQuestion from '../practice/MatchQuestion.jsx'
import OrderQuestion from '../practice/OrderQuestion.jsx'
import MultiQuestion from '../practice/MultiQuestion.jsx'
import PickQuestion from '../practice/PickQuestion.jsx'
import { sanitizeHtml } from '../sanitizeHtml.js'
import { wrapTapWords } from '../wrapTapWords.js'
import { reportAudio } from '../../live/audioReport.js'
import { hasAttempt } from '../practiceGrading.js'
import { sentenceFromTap } from '../../../lib/wordTranslate.js'

const QUESTION_BY_TYPE = {
  choice: ChoiceQuestion,
  chips: ChipsQuestion,
  gap: GapQuestion,
  match: MatchQuestion,
  order: OrderQuestion,
  multi: MultiQuestion,
  pick: PickQuestion,
}

// Карточка практики: заголовок + инструкция/аудио/правило + список вопросов.
// `checked` — уже вычисленный родителем флаг для ЭТОЙ карточки (см.
// `practiceBlockKey` в LessonContent) — прокидывается в вопросы как есть.
export default function PracticeBlock({ block, answers, checked, onAnswer, onCheck, readOnly, liveQuestionId, onWord }) {
  const { t } = useI18n()
  const canCheck = (block?.questions || []).some((q) => hasAttempt(q, answers?.[q.id]))
  const html = useMemo(() => sanitizeHtml(block?.html), [block?.html])
  const tappableHtml = useMemo(() => wrapTapWords(html), [html])
  const htmlRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    const root = htmlRef.current
    if (!root || !onWord) return undefined
    const onClick = (e) => {
      if (e.target?.tagName !== 'SPAN' || !e.target.classList.contains('lw-tap-w')) return
      e.stopPropagation()
      onWord(sentenceFromTap(e.target), e.target)
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [tappableHtml, onWord])

  useEffect(() => {
    const nodes = [audioRef.current, htmlRef.current].filter(Boolean)
    if (!nodes.length) return undefined
    const report = (action) => (e) => {
      if (e.target?.tagName !== 'AUDIO') return
      reportAudio({ kind: 'file', action, url: e.target.currentSrc || e.target.src })
    }
    const onPlay = report('play')
    const onPause = report('stop')
    nodes.forEach((node) => {
      node.addEventListener('play', onPlay, true)
      node.addEventListener('pause', onPause, true)
    })
    return () => {
      nodes.forEach((node) => {
        node.removeEventListener('play', onPlay, true)
        node.removeEventListener('pause', onPause, true)
      })
    }
  }, [tappableHtml, block?.audio?.src])

  return (
    <div className="lw-card lw-practice">
      <div className="lw-practice__head">
        {block?.title && <TapText as="h3" className="lw-practice__title" text={block.title} onWord={onWord} />}
        {block?.hint && <TapText as="p" className="lw-practice__hint" text={block.hint} onWord={onWord} />}
      </div>

      {block?.instruction && (
        <TapText as="p" className="lw-practice__instruction" text={block.instruction} onWord={onWord} />
      )}
      {block?.audio?.src && (
        <audio ref={audioRef} className="lw-practice__audio" controls preload="none" src={block.audio.src} />
      )}
      {html && (
        <div
          className="lw-practice__html"
          ref={htmlRef}
          dangerouslySetInnerHTML={{ __html: tappableHtml }}
        />
      )}

      <div className="lw-practice__list">
        {(block?.questions || []).map((question) => {
          const Question = QUESTION_BY_TYPE[question.type]
          if (!Question) return null
          return (
            <div
              key={question.id}
              data-question-id={question.id}
              className={question.id === liveQuestionId ? 'lw-q--live-here' : undefined}
            >
              <Question
                question={question}
                answer={answers?.[question.id] ?? null}
                checked={checked}
                onAnswer={onAnswer}
                readOnly={readOnly}
                onWord={onWord}
              />
            </div>
          )
        })}
      </div>

      {!readOnly && (
        <button
          type="button"
          className="lw-practice__check"
          disabled={!canCheck}
          title={canCheck ? undefined : t('lesson.ws.checkNeedAnswer')}
          onClick={() => canCheck && onCheck(block)}
        >
          {t('lesson.ws.check')}
        </button>
      )}
    </div>
  )
}
