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
//
// hideOnError прячет картинку, если она не пришла. Раньше это писали на месте
// (`onError={(e) => e.currentTarget.style.display = 'none'}`), но правка стиля
// руками мимо React необратима: сменится src — картинка приедет и останется
// невидимой навсегда. Здесь это состояние, и оно сбрасывается вместе с src.
export default function AssetImage({ className = '', src, hideOnError = false, ref: outerRef, onLoad, onError, ...rest }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const nodeRef = useRef(null)

  // Колбэк-реф, а не useEffect: он срабатывает в фазе коммита, ДО кадра.
  // Картинка из кэша уже complete — при проверке в пассивном эффекте шиммер
  // успевал мигнуть на весь экран, а после добавления кэш-заголовков в кэше
  // теперь как раз всё.
  const attach = (el) => {
    nodeRef.current = el
    // ref прокидываем руками: в React 19 это обычный проп, и попади он в
    // {...rest}, он молча затёр бы наш — тогда проверка кэша ниже никогда бы не
    // сработала, и загруженная картинка шиммерила бы вечно.
    if (typeof outerRef === 'function') outerRef(el)
    else if (outerRef) outerRef.current = el
    if (el) syncReady(el)
  }

  // complete=true и у сломанной картинки, и у <img> без src. Состояние конечное
  // в обоих случаях: события больше не будет, шиммеру крутиться незачем — иначе
  // 404 выглядел бы как «вечно грузится», ровно то, что мы убираем.
  const syncReady = (el) => {
    setReady(el.complete)
    if (el.complete && el.naturalWidth === 0 && el.currentSrc) setFailed(true)
  }

  useEffect(() => {
    const el = nodeRef.current
    setFailed(false)
    if (el) syncReady(el)
    else setReady(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  const cls = ['aimg', ready && 'is-ready', hideOnError && failed && 'is-failed', className].filter(Boolean).join(' ')

  return (
    <img
      {...rest}
      ref={attach}
      src={src}
      className={cls}
      onLoad={(e) => {
        setReady(true)
        setFailed(false)
        onLoad?.(e)
      }}
      onError={(e) => {
        setReady(true)
        setFailed(true)
        onError?.(e)
      }}
    />
  )
}
