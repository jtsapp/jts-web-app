import { memo, useEffect, useMemo, useRef } from 'react'
import { sanitizeHtml } from '../sanitizeHtml.js'
import { reportAudio } from '../../live/audioReport.js'
import { wordFromTap, isPhraseSelection, isOversizedPhrase } from '../../../lib/wordTranslate.js'
import { wrapTapWords } from '../wrapTapWords.js'
import { bindWordBank } from '../bindWordBank.js'
import TapText from '../TapText.jsx'

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
function InfoBlock({ block, onWord }) {
  const html = useMemo(() => sanitizeHtml(block?.html), [block?.html])
  // Английские слова обёрнуты в .lw-tap-w для тап-перевода (см. useTapTranslate.js) —
  // тот же приём, что читалка книг делает через split() в JSX, только здесь текст
  // уже HTML-строка, поэтому оборачиваем DOM-обходом текстовых узлов.
  const tappableHtml = useMemo(() => wrapTapWords(html), [html])
  const bodyRef = useRef(null)

  // Настоящие <audio> из разметки урока (аудирование) — репортим play/pause тем
  // же каналом, что и TTS (см. audioReport.js), чтобы преподаватель в живом
  // режиме слышал то же самое. play/pause не всплывают — слушаем на фазе
  // захвата на контейнере, а не на каждом <audio> по отдельности.
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
    return bindWordBank(root)
  }, [tappableHtml])

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
