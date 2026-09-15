import { useCallback, useState } from 'react'
import { EMOTIONS } from './avatarEmotions.js'

/**
 * Лицо тьютора — готовые рендеры карточек Figma «Speaking Buddy» (см.
 * avatarEmotions.js), а не рисунок в коде.
 *
 * Смена эмоции — кроссфейд с пружинкой: в прототипе макета переход между
 * вариантами задан Smart Animate, EASE_OUT_BACK, 200 мс. Послойно картинку не
 * «доморфить», поэтому повторяем длительность и кривую, а не сам морфинг.
 *
 * Новая картинка показывается только когда догрузилась: до этого на экране
 * остаётся прежнее лицо. Иначе первый переход в незнакомую эмоцию мигал бы
 * пустым местом, пока тянется файл. Грузим лишь то, что реально просили, —
 * дашборду с одним лицом не нужны все 13 файлов.
 *
 * @param emotion   ключ из EMOTIONS; незнакомый → idle
 * @param speaking  тьютор озвучивает реплику: пока true, на лице «Говорит»
 *                  поверх эмоции агента — решение по продукту под карточку
 *                  макета; как только замолчал, возвращается его эмоция
 * @param className класс обёртки: размер задаёт вёрстка (см. .t-voice__face)
 */
export default function TutorFace({ emotion = 'idle', speaking = false, className = 't-voice__face' }) {
  const asked = speaking ? 'talking' : emotion
  const want = EMOTIONS[asked] ? asked : 'idle'

  // Однажды запрошенные картинки не размонтируем: повторная смена на них
  // мгновенная, файл уже декодирован.
  const [keys, setKeys] = useState([want])
  if (!keys.includes(want)) setKeys([...keys, want])

  const [loaded, setLoaded] = useState(() => new Set())
  const markLoaded = useCallback((key) => {
    setLoaded((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  }, [])

  // На первом кадре показывать ещё нечего — рисуем запрошенное сразу, браузер
  // догрузит его сам. Дальше держим прежнее лицо, пока новое не придёт.
  const [shown, setShown] = useState(null)
  const visible = shown === null || loaded.has(want) ? want : shown
  if (visible !== shown) setShown(visible)

  return (
    <div className={className + ' t-face'} role="img" aria-label={EMOTIONS[visible].label}>
      {keys.map((key) => (
        <img
          key={key}
          className={'t-face__img' + (key === visible ? ' is-on' : '')}
          src={EMOTIONS[key].src}
          alt=""
          draggable={false}
          onLoad={() => markLoaded(key)}
          // Закешированная картинка может успеть загрузиться до того, как React
          // повесит onLoad, — тогда событие не придёт вовсе.
          ref={(el) => {
            if (el?.complete && el.naturalWidth) markLoaded(key)
          }}
        />
      ))}
    </div>
  )
}
