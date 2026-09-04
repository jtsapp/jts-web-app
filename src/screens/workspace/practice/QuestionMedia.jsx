import { useI18n } from '../../../i18n.jsx'
import { speak } from '../../../practice/vocab/audio.js'
import TapText from '../TapText.jsx'

// Шапка вопроса: что послушать, что прочитать, на что посмотреть.
//
// До этого звук и картинку рисовал только ChoiceQuestion, а остальные пять
// типов молча их теряли: вопрос «отметь всё, что услышал» (multi) приходил без
// кнопки 🔊, а пропуск с картинкой — без картинки. Ответить на такой вопрос
// нечем, и ученик даже не понимает, что от него что-то скрыли: пустого места
// на экране не остаётся.
//
// Порядок тот же, что был в ChoiceQuestion: сначала звук, потом формулировка,
// потом картинка — на неё смотрят уже зная, что спрашивают.
export default function QuestionMedia({ question, onWord }) {
  const { t } = useI18n()
  if (!question) return null

  const { say, prompt, imageUrl } = question
  if (!say && !prompt && !imageUrl) return null

  return (
    <>
      {/* В заданиях Listening формулировка — «Word 1», а что именно звучит,
          знает только `say`: без кнопки вопрос не отвечаем в принципе. Речь
          синтезируется — записи слова в курсе нет, есть только вызов синтеза. */}
      {say && (
        <button type="button" className="lw-say" onClick={() => speak(say)} aria-label={t('lesson.play')}>
          🔊
        </button>
      )}
      {prompt && <TapText as="p" className="lw-q__prompt" text={prompt} onWord={onWord} />}
      {/* Картинка — это содержание вопроса, а не украшение: «Что на картинке?»
          без неё не имеет смысла. Поэтому alt не пустой: формулировка хотя бы
          говорит незрячему ученику, о чём спрашивают. */}
      {imageUrl && <img className="lw-q__img" src={imageUrl} alt={prompt || t('lesson.ws.questionImage')} />}
    </>
  )
}
