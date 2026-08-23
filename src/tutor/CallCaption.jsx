import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fitSizes } from './captions.js'

// Пауза, после которой подпись считается «устоявшейся» и уходит в live-region
// для скринридера. Без неё озвучивалось бы каждое слово потоковой транскрипции:
// текст обновляется по несколько раз в секунду, и aria-live превратился бы в
// кашу вместо реплики.
const CAPTION_SETTLE_MS = 700

// Субтитры звонка с автоподгоном кегля. Бокс по высоте фиксирован (см.
// .t-voice__text), поэтому длинная фраза не растягивает карточку и не двигает
// лицо; вместо этого уменьшается шрифт, и в ту же высоту влезает больше строк.
// Раньше здесь стоял глухой line-clamp на 2 строки при 32px: у реплики уровня
// B1 пропадала треть текста на десктопе и две трети на мобилке.
//
// Меряем на невидимом двойнике, а не на самой подписи: у видимой строки стоит
// line-clamp, и её scrollHeight упирается в потолок клампа — подобранный по
// нему кегль всегда был бы максимальным.
export default function CallCaption({ text, isUser }) {
  const boxRef = useRef(null)
  const probeRef = useRef(null)
  const [fit, setFit] = useState(null)
  const [settled, setSettled] = useState('')

  useLayoutEffect(() => {
    const box = boxRef.current
    const probe = probeRef.current
    if (!box || !probe) return
    const measure = () => {
      const budget = box.clientHeight
      if (!budget) return
      const max = parseFloat(getComputedStyle(box).getPropertyValue('--t-cap-max')) || 32
      const sizes = fitSizes(max)
      let picked = sizes[sizes.length - 1]
      for (const px of sizes) {
        probe.style.fontSize = `${px}px`
        if (probe.scrollHeight <= budget) {
          picked = px
          break
        }
      }
      probe.style.fontSize = `${picked}px`
      // Число строк считаем по фактическому line-height, а не по константе 1.3:
      // многоточие рисует именно line-clamp, и ошибка на строку либо съедала бы
      // видимый текст, либо роняла хвост за край бокса без «…».
      const lh = parseFloat(getComputedStyle(probe).lineHeight) || picked * 1.3
      setFit({ size: picked, lines: Math.max(1, Math.floor(budget / lh)) })
    }
    measure()
    // Ширина бокса меняется не только на ресайз окна: сайдбар и мобильная
    // раскладка режут её на лету, а от неё зависит подобранный кегль.
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
  }, [text])

  useEffect(() => {
    const id = setTimeout(() => setSettled(text), CAPTION_SETTLE_MS)
    return () => clearTimeout(id)
  }, [text])

  const style = fit ? { fontSize: `${fit.size}px`, WebkitLineClamp: fit.lines } : undefined
  return (
    <div className="t-voice__text" ref={boxRef}>
      <span
        className={'t-voice__cap' + (isUser ? ' is-user' : '')}
        style={style}
        aria-hidden="true"
      >
        {text}
      </span>
      <span className="t-voice__cap t-voice__cap--probe" ref={probeRef} aria-hidden="true">
        {text}
      </span>
      <span className="t-voice__srlive" role="status" aria-live="polite">
        {settled}
      </span>
    </div>
  )
}
