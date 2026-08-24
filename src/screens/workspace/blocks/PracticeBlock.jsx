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
import { bindWordBank, applyWordBankAnswers } from '../bindWordBank.js'
import { reportAudio } from '../../live/audioReport.js'
import { hasAttempt } from '../practiceGrading.js'
import { wordFromTap, isPhraseSelection, isOversizedPhrase } from '../../../lib/wordTranslate.js'

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
// `checked` — флаг всей карточки; `checkedKeys`/`cardKey` нужны, чтобы
// после сброса одного вопроса остальными нельзя было снова тыкать.
export default function PracticeBlock({ block, answers, checked, checkedKeys, cardKey, onAnswer, onCheck, readOnly, liveQuestionId, onWord, gapPrefix, cardAnchorId }) {
  function questionChecked(question) {
    if (checkedKeys?.has(question.id)) return true
    if (cardKey && checkedKeys?.has(cardKey)) return true
    return !!checked
  }
  const { t } = useI18n()
  const canCheck = (block?.questions || []).some((q) => hasAttempt(q, answers?.[q.id]))
  const html = useMemo(() => sanitizeHtml(block?.html), [block?.html])
  const tappableHtml = useMemo(() => wrapTapWords(html), [html])
  const htmlRef = useRef(null)
  const audioRef = useRef(null)
  const liveRef = useRef({ onAnswer, readOnly, answers, liveQuestionId })
  liveRef.current = { onAnswer, readOnly, answers, liveQuestionId }

  useEffect(() => {
    const root = htmlRef.current
    if (!root) return undefined
    const unbind = bindWordBank(root, {
      prefix: gapPrefix,
      get readOnly() { return !!liveRef.current.readOnly },
      onChange: (id, value) => { if (id) liveRef.current.onAnswer?.(id, value) },
    })
    applyWordBankAnswers(root, liveRef.current.answers, liveRef.current.liveQuestionId, {
      sync: true,
      prefix: gapPrefix,
      clearMissing: false,
    })
    return unbind
  }, [tappableHtml, gapPrefix])

  useEffect(() => {
    applyWordBankAnswers(htmlRef.current, answers, liveQuestionId, {
      sync: true,
      prefix: gapPrefix,
      clearMissing: false,
    })
  }, [answers, liveQuestionId, tappableHtml, gapPrefix])

  useEffect(() => {
    const root = htmlRef.current
    if (!root || !onWord) return undefined
    const onClick = (e) => {
      if (e.target?.tagName !== 'SPAN' || !e.target.classList.contains('lw-tap-w')) return
      const selected = window.getSelection()?.toString() || ''
      if (isPhraseSelection(selected) || isOversizedPhrase(selected)) return
      e.stopPropagation()
      onWord(wordFromTap(e.target), e.target)
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
    <div className="lw-card lw-practice" data-question-id={cardAnchorId || gapPrefix}>
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
                checked={questionChecked(question)}
                onAnswer={onAnswer}
                readOnly={readOnly}
                onWord={onWord}
              />
            </div>
          )
        })}
      </div>

      {!readOnly && (block?.questions || []).length > 0 && (
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
