import { memo, useMemo } from 'react'
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
//
// memo — не косметика: живой урок поллит статус/чат каждые 5с (LiveLessonPage),
// и без него этот компонент честно ре-рендерится на каждый тик, хотя `block`
// не менялся. Ре-рендер заново вызывает dangerouslySetInnerHTML тем же html —
// и это ВСЁ РАВНО пересобирает поддерево через element.innerHTML = html,
// уничтожая и создавая заново любой <audio>/<video> внутри: воспроизведение
// сбрасывалось на 0 каждые ~5 секунд (поймано MutationObserver'ом на реальном
// уроке — childList меняется 1:1 с интервалом поллинга). React пропускает
// повторную запись dangerouslySetInnerHTML только когда есть prev-props для
// сравнения; memo и даёт компоненту этот стабильный prev-render, блокируя
// ре-рендер целиком, пока сам `block` не изменится по ссылке.
function InfoBlock({ block }) {
  const html = useMemo(() => sanitizeHtml(block?.html), [block?.html])
  if (!html && !block?.title) return null

  return (
    <div className="lw-info__item">
      {block?.title && <h3 className="lw-info__title">{block.title}</h3>}
      {html && <div className="lw-info__body" dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  )
}

export default memo(InfoBlock)
