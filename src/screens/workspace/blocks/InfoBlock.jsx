import { memo, useEffect, useMemo, useRef } from 'react'
import { sanitizeHtml } from '../sanitizeHtml.js'
import { reportAudio } from '../../live/audioReport.js'
import { wordFromTap, isPhraseSelection, isOversizedPhrase } from '../../../lib/wordTranslate.js'
import { wrapTapWords } from '../wrapTapWords.js'
import { useWordBankRoot } from '../useWordBankRoot.js'
import TapText from '../TapText.jsx'
import { stripExerciseNumber, stripExerciseNumbersInHtml } from '../stripExerciseNumber.js'
import { tidyLessonLists } from '../tidyLessonLists.js'
import { stripAnswerKeySpoilers } from '../stripAnswerKeySpoilers.js'

// Один info-блок живого урока: заголовок (опционально) + произвольный rich-html
// от курса/экстрактора. html санитизируется (см. sanitizeHtml.js), а в DOM
// его ставит useWordBankRoot — не dangerouslySetInnerHTML: опрос занятия
// каждые 5 с иначе пересобирает пропуски и стирает слова. Банк слов
// (`.wbank` + `input.gap`) — не practice-вопрос, но в live его ячейки всё
// равно едут тем же каналом ответов, иначе преподаватель не видит, что
// ученик вставил, и наоборот.
//
// Карточки на себе не несёт: её рисует LessonContent сразу на серию соседних
// info-блоков. `checked` — ученик нажал «Проверить» на этой карточке.
// `showAnswerKey` — показывать ли спойлер «Why these answers» (только staff).
function InfoBlock({ block, onWord, answers, onAnswer, readOnly, liveQuestionId, gapPrefix, checked, showAnswerKey = true }) {
  const html = useMemo(() => {
    const raw = tidyLessonLists(stripExerciseNumbersInHtml(sanitizeHtml(block?.html)))
    return showAnswerKey ? raw : stripAnswerKeySpoilers(raw)
  }, [block?.html, showAnswerKey])
  const title = block?.title ? stripExerciseNumber(block.title) : ''
  const tappableHtml = useMemo(() => wrapTapWords(html), [html])
  const bodyRef = useRef(null)
  const liveRef = useRef({ onAnswer, readOnly, answers, liveQuestionId, checked })
  liveRef.current = { onAnswer, readOnly, answers, liveQuestionId, checked }

  useEffect(() => {
    const root = bodyRef.current
    if (!root) return undefined
    const report = (action) => (e) => {
      if (e.target?.tagName !== 'AUDIO') return
      reportAudio({ kind: 'file', action, url: e.target.currentSrc || e.target.src })
    }
    const onPlay = report('play')
    const onPause = report('stop')
    root.addEventListener('play', onPlay, true)
    root.addEventListener('pause', onPause, true)
    return () => {
      root.removeEventListener('play', onPlay, true)
      root.removeEventListener('pause', onPause, true)
    }
  }, [tappableHtml])

  useWordBankRoot(bodyRef, tappableHtml, gapPrefix, liveRef)

  useEffect(() => {
    const root = bodyRef.current
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

  if (!html && !title) return null

  return (
    <div className="lw-info__item">
      {title && <TapText as="h3" className="lw-info__title" text={title} onWord={onWord} />}
      {html && <div className="lw-info__body" ref={bodyRef} />}
    </div>
  )
}

export default memo(InfoBlock)
