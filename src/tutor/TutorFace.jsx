import { useCallback, useState } from 'react'
import { EMOTIONS } from './avatarEmotions.js'
import { BUDDY_RIG } from './buddyRig.js'

/**
 * Лицо тьютора — слои карточек Figma «Speaking Buddy» (см. buddyRig.js): тело
 * со свечением, глаза и значки отдельными картинками. Вместе они дают ровно
 * рендер карточки, а раздельно — анимируются: у каждой эмоции своё движение
 * (tutor.css, .t-face--<ключ>). Поверх него у четырёх эмоций идёт петля из
 * макета — тело (.t-face__body) качается между двумя кадрами дизайнера, а
 * слои, что в карточке лежат вне тела (free в buddyRig.js), стоят на месте.
 *
 * Смена эмоции — кроссфейд с пружинкой: в прототипе макета переход между
 * вариантами задан Smart Animate, EASE_OUT_BACK, 200 мс. Послойно картинку не
 * «доморфить», поэтому повторяем длительность и кривую, а не сам морфинг.
 *
 * Новое лицо показывается только когда догрузилось тело: до этого на экране
 * остаётся прежнее. Иначе первый переход в незнакомую эмоцию мигал бы пустым
 * местом. Грузим лишь то, что реально просили (эмоцию и preload), а не все 13
 * наборов разом.
 *
 * @param emotion   ключ из EMOTIONS; незнакомый → idle
 * @param speaking  тьютор озвучивает реплику: на лице «Говорит», если текущая
 *                  эмоция не из тех, что держатся во время речи (speaks в
 *                  EMOTIONS); как только замолчал, возвращается его эмоция
 * @param preload   ключи эмоций, которые скоро понадобятся (витрина на
 *                  дашборде знает следующую): их наборы монтируются скрытыми
 *                  заранее и к смене уже догружены. Незнакомое и null
 *                  пропускаются
 * @param className класс обёртки: размер задаёт вёрстка (см. .t-voice__face)
 */
export default function TutorFace({ emotion = 'idle', speaking = false, preload = [], className = 't-voice__face' }) {
  const known = EMOTIONS[emotion] ? emotion : 'idle'
  const want = speaking && !EMOTIONS[known].speaks ? 'talking' : known

  // Однажды запрошенные наборы не размонтируем: повторная смена на них
  // мгновенная, файлы уже декодированы. preload проверяем по собственным полям
  // EMOTIONS: у литерала есть прототип, и 'constructor' прошёл бы проверку.
  const [keys, setKeys] = useState([want])
  const missing = [want, ...preload].filter(
    (key, i, all) => Object.hasOwn(EMOTIONS, key) && !keys.includes(key) && all.indexOf(key) === i
  )
  if (missing.length) setKeys([...keys, ...missing])

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
        <div
          key={key}
          className={`t-face__stack t-face--${key}` + (key === visible ? ' is-on' : '')}
          style={{ '--tilt': `${BUDDY_RIG[key].tilt}deg` }}
        >
          <div className="t-face__rig">
            <div className="t-face__body">
              {BUDDY_RIG[key].layers.filter((l) => !l.free).map((layer) => renderLayer(key, layer, markLoaded))}
            </div>
            {BUDDY_RIG[key].layers.filter((l) => l.free).map((layer) => renderLayer(key, layer, markLoaded))}
          </div>
        </div>
      ))}
    </div>
  )
}

function renderLayer(key, { part, src, box }, markLoaded) {
  return (
    <img
      key={part}
      className={`t-face__layer t-face__layer--${part}`}
      src={src}
      alt=""
      draggable={false}
      style={{ left: `${box[0]}%`, top: `${box[1]}%`, width: `${box[2]}%`, height: `${box[3]}%` }}
      onLoad={part === 'base' ? () => markLoaded(key) : undefined}
      // Закешированная картинка может успеть загрузиться до того, как
      // React повесит onLoad, — тогда событие не придёт вовсе.
      ref={
        part === 'base'
          ? (el) => {
              if (el?.complete && el.naturalWidth) markLoaded(key)
            }
          : undefined
      }
    />
  )
}
