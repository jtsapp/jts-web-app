import { useCallback, useEffect, useState } from 'react'
import { getOffers } from '../api.js'
import { sellableOffers } from './sellableOffers.js'

/**
 * Каталог витрины с бэкенда.
 *
 * Запасного прайса в бандле нет намеренно. Соблазн «показать хоть что-то, если
 * запрос не прошёл» здесь опаснее пустого экрана: человек увидел бы одну цену, а
 * заказ посчитался бы по серверной, другой. Не загрузилось — честная ошибка и
 * кнопка «попробовать снова».
 *
 * `sellableOnly` — только то, что можно оплатить онлайн (экраны с оплатой картой). Экраны, где «Купить» пишет
 * менеджеру (тарифы IELTS/SAT), видят всё опубликованное.
 *
 * @returns {{ offers: Array|null, failed: boolean, reload: () => void }}
 *          offers === null — ещё грузим.
 */
export function useOffers({ sellableOnly = false } = {}) {
  const [offers, setOffers] = useState(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setFailed(false)
    setOffers(null)
    getOffers()
      .then((all) => {
        if (!alive) return
        const list = sellableOnly ? sellableOffers(all) : all
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
  }, [attempt, sellableOnly])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { offers, failed, reload }
}
