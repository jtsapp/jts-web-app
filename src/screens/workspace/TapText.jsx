import { cleanWord, sentenceFromTap } from '../../lib/wordTranslate.js'

// Оборачивает слова обычного JSX-текста (не HTML) в тап-перевод — тот же
// приём, что читалка книг делает через split() прямо в JSX (BookDetail.jsx),
// портирован для формулировок вопросов практики (`question.prompt`,
// `gapBefore`/`gapAfter`). Тап по слову переводит предложение целиком.
// Варианты ответа (кнопки выбора) сюда не заворачиваются — тап по слову внутри
// кнопки конфликтовал бы с выбором ответа (см. useTapTranslate.js).
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
                e.stopPropagation()
                onWord(sentenceFromTap(e.currentTarget), e.currentTarget)
              }}
            >
              {tok}
            </span>
          ),
        )}
    </As>
  )
}
