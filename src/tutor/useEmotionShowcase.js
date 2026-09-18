import { useEffect, useState, useSyncExternalStore } from 'react'
import { showcaseFrom } from './avatarEmotions.js'

/**
 * Витрина эмоций на дашборде: лицо в орбе идёт по кругу SHOWCASE_ORDER с
 * родной эмоции тьютора — ученик видит весь спектр персонажа, а не одну маску.
 *
 * Шаг — раз в dwellMs. Пока вкладка скрыта, круг стоит: вернулся ученик — идёт
 * дальше с того же места. При «уменьшить движение» круга нет вовсе: лицо стоит
 * на родной эмоции, как до витрины, и заранее ничего не грузится.
 *
 * @param mood    родная эмоция тьютора (mood в tutors.js)
 * @param dwellMs сколько держится каждая эмоция
 * @returns emotion — что показывать сейчас; next — что покажется следующим (его
 *          TutorFace монтирует заранее через preload), null — круга нет
 */
export function useEmotionShowcase(mood, dwellMs = 3000) {
  const reduced = useReducedMotion()
  // Шаг хранится вместе с тем, для чего он считан. Сменился тьютор (профиль
  // может догрузиться уже на дашборде) — круг заново с его родной эмоции, а не
  // с середины чужого. Выключили «уменьшить движение» — тоже с родной: она и
  // стояла на лице, пока круга не было.
  const [pos, setPos] = useState({ mood, reduced, step: 0 })
  if (pos.mood !== mood || pos.reduced !== reduced) setPos({ mood, reduced, step: 0 })

  // mood внутри не читается: он в зависимостях, чтобы перезапуск таймера дал
  // родной эмоции нового тьютора полный шаг, а не остаток чужого.
  useEffect(() => {
    if (reduced) return undefined
    const id = setInterval(() => {
      if (document.hidden) return
      setPos((p) => ({ ...p, step: p.step + 1 }))
    }, dwellMs)
    return () => clearInterval(id)
  }, [reduced, dwellMs, mood])

  if (reduced) return { emotion: mood, next: null }
  const order = showcaseFrom(mood)
  return { emotion: order[pos.step % order.length], next: order[(pos.step + 1) % order.length] }
}

// «Уменьшить движение» — через useSyncExternalStore, а не эффект с setState:
// на сервере matchMedia нет, и первый кадр гидратации обязан совпасть с
// серверным (false); переключение настройки в системе подхватывается на лету.
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange) {
  const mq = window.matchMedia?.(REDUCED_MOTION)
  mq?.addEventListener?.('change', onChange)
  return () => mq?.removeEventListener?.('change', onChange)
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => Boolean(window.matchMedia?.(REDUCED_MOTION).matches),
    () => false
  )
}
