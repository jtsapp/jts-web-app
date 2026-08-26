import { cleanWord, wordFromTap, isPhraseSelection, isOversizedPhrase } from '../../lib/wordTranslate.js'

// Оборачивает слова обычного JSX-текста (не HTML) в тап-перевод — тот же
// приём, что читалка книг делает через split() прямо в JSX (BookDetail.jsx),
// портирован для формулировок вопросов практики (`question.prompt`,
// `gapBefore`/`gapAfter`). Тап по слову переводит это слово; фразу — если
// выделить её мышью. Варианты ответа (кнопки выбора) сюда не заворачиваются —
// тап по слову внутри кнопки конфликтовал бы с выбором ответа.
export default function TapText({ text, onWord, as: As = 'span', className }) {
  if (!text) return null
  if (!onWord) return <As className={className}>{text}</As>
  return (
    <As className={className}>
      {String(text)
        .split(/(\s+)/)
        .map((tok, i) =>
          /^\s+$/.test(tok) || !cleanWord(tok) ? (
            tok
          ) : (
            <span
              key={i}
              className="lw-tap-w"
              onClick={(e) => {
                // Выделенную фразу уже перевёл mouseup родителя (LessonContent,
                // CourseStepPlayer, LessonPlayer). Клик по слову приходит следом
                // и без этой проверки перебивал фразу одним словом — из-за чего
                // в формулировках вопросов и в пропусках у ученика работал
                // только перевод слова, хотя выделение до 100 символов умеет всё
                // остальное. Ту же проверку делают InfoBlock и PracticeBlock для
                // своих span'ов из wrapTapWords.
                const selected = window.getSelection()?.toString() || ''
                if (isPhraseSelection(selected) || isOversizedPhrase(selected)) return
                e.stopPropagation()
                onWord(wordFromTap(e.currentTarget), e.currentTarget)
              }}
            >
              {tok}
            </span>
          ),
        )}
    </As>
  )
}
