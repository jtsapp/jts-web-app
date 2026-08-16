import { speak } from '../../../practice/vocab/audio.js'
import { sanitizeHtml } from '../sanitizeHtml.js'

// Один info-блок живого урока: заголовок (опционально) + произвольный rich-html
// от учителя/экстрактора. Только для чтения, без answers/checked — как
// banner/theory. html санитизируется перед dangerouslySetInnerHTML (см.
// sanitizeHtml.js), не дублируем эту логику здесь.
//
// Карточки на себе не несёт: её рисует LessonContent сразу на серию соседних
// info-блоков. Экстрактор режет тело упражнения по прямым детям `.ex-body`, и
// инструкция, подсказка и сама разметка приезжают отдельными блоками — карточка
// на каждый превращала шаг в стопку белых плашек (см. комментарий там).
// Кнопки озвучки внутри html: конвертация оставляет от них пустой
// `.say[data-say]` — маркер «здесь произносится вот это». Слушателем на
// контейнере, а не обработчиком на каждом узле: разметка приходит строкой, и
// навешивать на неё нечего, пока она не в DOM.
function speakFromMarkup(event) {
  const marker = event.target.closest?.('.say[data-say]')
  if (!marker) return
  event.preventDefault()
  speak(marker.getAttribute('data-say'))
}

export default function InfoBlock({ block }) {
  const html = sanitizeHtml(block?.html)
  if (!html && !block?.title) return null

  return (
    <div className="lw-info__item">
      {block?.title && <h3 className="lw-info__title">{block.title}</h3>}
      {html && (
        <div
          className="lw-info__body"
          onClick={speakFromMarkup}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  )
}
