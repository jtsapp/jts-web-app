import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useWordBankRoot } from '../useWordBankRoot.js'
import { reportAudio } from '../../live/audioReport.js'
import { hasAttempt } from '../practiceGrading.js'
import { wordFromTap, isPhraseSelection, isOversizedPhrase } from '../../../lib/wordTranslate.js'
import {
  collectCheckableGapIds,
  gradeWordBankInRoot,
  htmlHasCheckableWordBank,
  wordBankAnswersAttempted,
} from '../wordBankCheck.js'
import { stripExerciseNumber, stripExerciseNumbersInHtml, stripExerciseNumbersInText } from '../stripExerciseNumber.js'
import { tidyLessonLists } from '../tidyLessonLists.js'
import { stripAnswerKeySpoilers } from '../stripAnswerKeySpoilers.js'

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
// Word-bank в `html` (B2 cloze) тоже получает «Проверить» — иначе ключи в
// data-answer есть, а кнопки нет.
export default function PracticeBlock({
  block, answers, checked, checkedKeys, cardKey, stepTitle, onAnswer, onCheck, readOnly,
  liveQuestionId, onWord, gapPrefix, cardAnchorId, status, highlighted, number,
  showAnswerKey = true, lockNote = '',
}) {
  function questionChecked(question) {
    if (checkedKeys?.has(question.id)) return true
    if (cardKey && checkedKeys?.has(cardKey)) return true
    return !!checked
  }
  const { t } = useI18n()
  // Badge already shows card order — drop «3 ·» from course title/instruction
  // (and from leftover .instruction HTML) so the student sees one number.
  const displayTitle = stripExerciseNumber(block?.title)
  const displayInstruction = block?.instruction
    ? stripExerciseNumbersInText(block.instruction)
    : ''
  const showBlockTitle = Boolean(displayTitle && displayTitle !== stepTitle)
  const html = useMemo(() => {
    const raw = tidyLessonLists(stripExerciseNumbersInHtml(sanitizeHtml(block?.html)))
    return showAnswerKey ? raw : stripAnswerKeySpoilers(raw)
  }, [block?.html, showAnswerKey])
  const tappableHtml = useMemo(() => wrapTapWords(html), [html])
  const htmlRef = useRef(null)
  const audioRef = useRef(null)
  const liveRef = useRef({ onAnswer, readOnly, answers, liveQuestionId, checked })

  const hasWbCheck = htmlHasCheckableWordBank(html)
  const questions = block?.questions || []
  const hasPick = questions.some((q) => q.type === 'pick')
  const canCheckQuestions = questions.some((q) => hasAttempt(q, answers?.[q.id]))
  const canCheckWb = hasWbCheck && wordBankAnswersAttempted(answers, gapPrefix)
  const canCheck = canCheckQuestions || canCheckWb
  const hasAnswerable = questions.length > 0 || hasWbCheck
  const showCheck = !readOnly && hasAnswerable
  // Почему карточка молчит. Баннер урока висит наверху страницы, и ученик,
  // доскроллив до задания, его уже не видит: «Проверить» просто исчезает, а
  // варианты перестают нажиматься без единого слова. Причина должна быть в
  // самой карточке — и до вопросов, а не под ними, иначе в длинном задании она
  // окажется там же за экраном.
  const showLockNote = readOnly && hasAnswerable && Boolean(lockNote)

  const [wbScore, setWbScore] = useState(null)
  // Пропуск, в который уедет следующее слово из банка.
  const [activeGapId, setActiveGapId] = useState(null)

  // Всё изменчивое, что читают слушатели на живом DOM: подписка не должна
  // зависеть от состояния, иначе она пересоздаётся на каждый ответ.
  liveRef.current = { onAnswer, readOnly, answers, liveQuestionId, checked, questions, activeGapId }

  useWordBankRoot(htmlRef, tappableHtml, gapPrefix, liveRef)

  useEffect(() => {
    if (!checked) {
      setWbScore(null)
      return
    }
    if (htmlRef.current && hasWbCheck) {
      setWbScore(gradeWordBankInRoot(htmlRef.current))
    }
  }, [checked, hasWbCheck, answers, tappableHtml])

  // Слово из банка — в пропуск.
  //
  // Задание «вставь слово из словаря» экстрактор разрывает пополам: банк
  // остаётся в html блока, а предложения становятся отдельными gap-вопросами.
  // Движок bindWordBank к этой разметке не цепляется — он ищет .wbank/.wchip и
  // input.gap, а тут .bank/.bw и React-инпуты, — поэтому слова банка не делали
  // ничего, и заполнить пропуск можно было только руками с клавиатуры.
  //
  // Клик по слову банка — это ответ, а не просьба перевести, поэтому тап-перевод
  // глушим. Ловим на ПЕРЕХВАТЕ, а не на всплытии: на всплытии оба слушателя
  // висят на одном узле, и кто из них первый — решает порядок подписки. Он
  // переставал быть нашим сразу после первого же ответа: этот эффект зависел от
  // `answers`, на новом ответе переподписывался и уезжал в конец очереди — со
  // второго слова банка окно перевода успевало открыться раньше и накрывало
  // задание. Перехват отрабатывает до любого всплытия и от порядка не зависит.
  //
  // Изменчивое читаем из `liveRef` по той же причине: подписка не должна
  // зависеть от состояния.
  useEffect(() => {
    const root = htmlRef.current
    if (!root) return undefined
    const onClick = (e) => {
      const { questions, answers, activeGapId, onAnswer, readOnly, checked } = liveRef.current
      if (readOnly || checked) return
      const chip = e.target?.closest?.('.bw')
      if (!chip) return
      const word = (chip.textContent || '').trim()
      if (!word) return
      const gaps = questions.filter((q) => q.type === 'gap')
      if (!gaps.length) return
      const target = gaps.find((q) => q.id === activeGapId)
        ?? gaps.find((q) => !String(answers?.[q.id] ?? '').trim())
      // Класть некуда — молча ничего не делаем, но и перевод не открываем:
      // иначе одно и то же нажатие вело бы то в ответ, то в словарь.
      e.stopImmediatePropagation()
      e.preventDefault()
      if (!target) return
      onAnswer(target.id, word)
      setActiveGapId(null)
    }
    root.addEventListener('click', onClick, true)
    return () => root.removeEventListener('click', onClick, true)
  }, [tappableHtml])

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

  function handleCheck() {
    if (!canCheck) return
    const gapIds = collectCheckableGapIds(htmlRef.current)
    if (htmlRef.current && hasWbCheck) {
      setWbScore(gradeWordBankInRoot(htmlRef.current))
    }
    onCheck?.(gapIds)
  }

  return (
    <div
      className={`lw-card lw-practice is-${status}${highlighted ? ' is-highlighted' : ''}${questions.length ? ' lw-practice--has-qs' : ''}`}
      data-question-id={cardAnchorId || gapPrefix}
    >
      <div className="lw-practice__top">
        {/* Номер задания — он же его статус: галочка вместо цифры, когда
            задание проверено (макет «Онлайн-уроки»). */}
        {number != null && (
          <span className="lw-practice__num" aria-hidden="true">
            {status === 'done' ? (
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                <path d="m4 8.4 2.6 2.6L12 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              number
            )}
          </span>
        )}
        <div className="lw-practice__head">
            {showBlockTitle && <TapText as="h3" className="lw-practice__title" text={displayTitle} onWord={onWord} />}
            {block?.hint && <TapText as="p" className="lw-practice__hint" text={block.hint} onWord={onWord} />}
        </div>
        {highlighted && (
          <span className="lw-practice__flag">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path fill="currentColor" d="M3 10v4h3l5 4V6L6 10H3Zm12.5 2c0-1.5-.8-2.8-2-3.4v6.8c1.2-.6 2-1.9 2-3.4Zm-2-7v2c2.6.7 4.5 3 4.5 5s-1.9 4.3-4.5 5v2c3.7-.8 6.5-4 6.5-7s-2.8-6.2-6.5-7Z" />
            </svg>
            {t('live.highlighted')}
          </span>
        )}
      </div>

      {displayInstruction && (
        <TapText as="p" className="lw-practice__instruction" text={displayInstruction} onWord={onWord} />
      )}
      {block?.audio?.src && (
        <audio ref={audioRef} className="lw-practice__audio" controls preload="none" src={block.audio.src} />
      )}
      {html && <div className={`lw-practice__html${readOnly ? ' is-locked' : ''}`} ref={htmlRef} />}

      {/* «Верного ответа нет» — правило всего упражнения, а не каждого пункта:
          в разминке их десяток подряд, и десять одинаковых строк прячут сами
          вопросы. */}
      {hasPick && <p className="lw-pick__hint">{t('lesson.ws.pickHint')}</p>}

      {showLockNote && (
        <p className="lw-practice__locked" role="status">
          {lockNote}
        </p>
      )}

      <div className="lw-practice__list">
        {questions.map((question) => {
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
                onFocusGap={setActiveGapId}
                showAnswerKey={showAnswerKey}
              />
            </div>
          )
        })}
      </div>

      {showCheck && (
        <button
          type="button"
          className="lw-practice__check"
          disabled={!canCheck}
          title={canCheck ? undefined : t('lesson.ws.checkNeedAnswer')}
          onClick={handleCheck}
        >
          {t('lesson.ws.check')}
        </button>
      )}
      {checked && wbScore && wbScore.total > 0 && (
        <div className="lw-practice__wb-score" role="status">
          {wbScore.correct} / {wbScore.total} {t('lesson.ws.correctCount')}
        </div>
      )}
    </div>
  )
}
