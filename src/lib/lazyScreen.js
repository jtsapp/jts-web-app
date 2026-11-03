import { createElement, lazy, useState } from 'react'

// Экраны App грузятся по требованию. Причина: сайт — SPA, картинки экрана начинают качаться только после JS, а
// стартовый JS весил 2 МБ в gzip, потому что App импортировал статически все 106 экранов. На Slow 4G первая картинка
// стартовала на 12,6 с на любом экране (замер 03.11.2026).
//
// Почему своя обёртка, а не голый React.lazy и не next/dynamic. Первый рендер App на сервере и при гидратации — всегда
// спиннер восстановления сессии (см. restoring в App.jsx), экраны в него не попадают, поэтому SSR им не нужен и
// гидратацию они не трогают: next/dynamic здесь ничего не даёт. А у React.lazy нет двух вещей:
// - загрузки заранее: чанк первого экрана App просит сразу, параллельно с восстановлением сессии (preload);
// - отрисовки без задержки: лениво объявленный компонент хотя бы раз уходит в Suspense, даже если модуль уже в памяти,
//   и заглушка мелькала бы там, где чанк давно загружен.

// Чанк, который не приехал и не отказал: прокси, отдающий на пропавший файл 200 с HTML, не вызывает у script ни error,
// ни регистрации чанка, и экран вечно показывал бы заглушку. Срок с большим запасом на медленную сеть.
const LOAD_TIMEOUT_MS = 60_000

/** Отказ загрузки экрана. Отдельный класс: ScreenBoundary ловит только его, а ошибки самих экранов идут дальше. */
export class ScreenChunkError extends Error {
  constructor(cause) {
    super(`Не удалось загрузить экран: ${cause?.message ?? cause}`, { cause })
    this.name = 'ScreenChunkError'
  }
}

function withTimeout(promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`нет ответа за ${LOAD_TIMEOUT_MS} мс`)), LOAD_TIMEOUT_MS)
    promise.then(resolve, reject).finally(() => clearTimeout(timer))
  })
}

/**
 * Компонент экрана, который грузится при первой отрисовке или раньше — по `Screen.preload()`.
 *
 * @param {() => Promise<any>} load `() => import('...')`
 * @param {string} [exportName] именованный экспорт, если в файле экранов несколько
 */
export function lazyScreen(load, exportName = 'default') {
  let loaded = null
  let pending = null
  const preload = () => {
    pending ??= withTimeout(load()).then(
      (mod) => {
        loaded = mod[exportName]
        return { default: loaded }
      },
      (cause) => {
        throw new ScreenChunkError(cause)
      },
    )
    return pending
  }
  const Lazy = lazy(preload)

  function Screen(props) {
    // Выбор один на монтирование: подмена Lazy на готовый компонент в середине жизни сменила бы тип и пересоздала экран.
    const [type] = useState(() => loaded || Lazy)
    return createElement(type, props)
  }
  Screen.preload = preload
  return Screen
}
