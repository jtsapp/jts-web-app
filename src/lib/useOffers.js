import { useCallback, useEffect, useState } from 'react'
import { getOffers } from '../api.js'

/**
 * Каталог витрины с бэкенда.
 *
 * Запасного прайса в бандле нет намеренно. Соблазн «показать хоть что-то, если
 * запрос не прошёл» здесь опаснее пустого экрана: человек увидел бы одну цену, а
 * заказ посчитался бы по серверной, другой. Не загрузилось — честная ошибка и
 * кнопка «попробовать снова».
 *
 * @returns {{ offers: Array|null, failed: boolean, reload: () => void }}
 *          offers === null — ещё грузим.
 */
export function useOffers() {
  const [offers, setOffers] = useState(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setFailed(false)
    setOffers(null)
    getOffers()
      .then((list) => {
        if (!alive) return
        setOffers(list)
        // Пустой каталог — тоже нечего показывать: это не «загрузилось», это
        // «продавать нечего», и вести себя должно как ошибка.
        setFailed(list.length === 0)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { offers, failed, reload }
}
