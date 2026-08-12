import { useEffect, useRef, useState } from 'react'

// Картинка с состоянием загрузки: пока файл едет, в её собственной рамке идёт
// скелетон-шиммер. Клиент жаловался, что на 4G все арты «долго прогружаются», а
// до загрузки на месте картинок стояли пустые серые кружки — так интерфейс
// читался как сломанный.
//
// Обёртки вокруг <img> здесь намеренно нет: арты в проекте позиционируются
// своим же классом (абсолютом внутри кольца узла карты, object-fit в круге
// модалки), и лишний span ломал бы раскладку. Шиммер живёт фоном самой
// картинки — у незагруженного <img> фон виден целиком, с её border-radius и
// размерами, а после загрузки фон перекрывается пикселями.
export default function AssetImage({ className = '', src, onLoad, onError, ...rest }) {
  const [ready, setReady] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    setReady(false)
    // Картинка из кэша успевает загрузиться до того, как React навесит onLoad —
    // события не будет, и шиммер остался бы крутиться навсегда.
    const el = ref.current
    if (el?.complete && el.naturalWidth > 0) setReady(true)
  }, [src])

  return (
    <img
      ref={ref}
      src={src}
      className={`aimg${ready ? ' is-ready' : ''}${className ? ` ${className}` : ''}`}
      onLoad={(e) => {
        setReady(true)
        onLoad?.(e)
      }}
      onError={(e) => {
        setReady(true)
        onError?.(e)
      }}
      {...rest}
    />
  )
}
