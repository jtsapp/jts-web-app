import { memo, useEffect, useMemo, useRef } from 'react'
import { sanitizeHtml } from '../sanitizeHtml.js'
import { reportAudio } from '../../live/audioReport.js'
import { wordFromTap, isPhraseSelection, isOversizedPhrase } from '../../../lib/wordTranslate.js'
import { wrapTapWords } from '../wrapTapWords.js'
import { bindWordBank, applyWordBankAnswers } from '../bindWordBank.js'
import TapText from '../TapText.jsx'

// Один info-блок живого урока: заголовок (опционально) + произвольный rich-html
// от учителя/экстрактора. html санитизируется перед dangerouslySetInnerHTML
// (см. sanitizeHtml.js). Банк слов (`.wbank` + `input.gap`) — это не practice-
// вопрос, но в live его ячейки всё равно едут тем же каналом ответов, иначе
// преподаватель не видит, что ученик вставил, и наоборот.
//
// Карточки на себе не несёт: её рисует LessonContent сразу на серию соседних
// info-блоков.
function InfoBlock({ block, onWord, answers, onAnswer, readOnly, liveQuestionId, gapPrefix }) {
  const html = useMemo(() => sanitizeHtml(block?.html), [block?.html])
  const tappableHtml = useMemo(() => wrapTapWords(html), [html])
  const bodyRef = useRef(null)
  const liveRef = useRef({ onAnswer, readOnly, answers, liveQuestionId })
  liveRef.current = { onAnswer, readOnly, answers, liveQuestionId }

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

  useEffect(() => {
    const root = bodyRef.current
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
    applyWordBankAnswers(bodyRef.current, answers, liveQuestionId, {
      sync: true,
      prefix: gapPrefix,
      clearMissing: false,
    })
  }, [answers, liveQuestionId, tappableHtml, gapPrefix])

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

  if (!html && !block?.title) return null

  return (
    <div className="lw-info__item">
      {block?.title && <TapText as="h3" className="lw-info__title" text={block.title} onWord={onWord} />}
      {html && <div className="lw-info__body" ref={bodyRef} dangerouslySetInnerHTML={{ __html: tappableHtml }} />}
    </div>
  )
}

export default memo(InfoBlock)
