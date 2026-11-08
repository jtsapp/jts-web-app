// Не заходил 2+ дня — сайт сам облегчает план на сегодня (ТЗ v2.0, 9.1 и кейс 12): «после пропуска 2+ дней план
// облегчён системой — один шаг до 15 минут». Делает это код, а не кнопка Луны: раньше под сообщением стояла только
// «План на 15 минут», и ученик, не нажавший её, видел на «Главной» прежний полный день.
//
// Пересобирает день та же ручка, что «У меня мало времени» (POST /mobile/ge/plan/replan, ge/plan/replan.js): что войдёт
// в 15 минут, решает бэкенд, остальное уходит на следующий учебный день. Раз в день на аккаунт (localStorage): ученик,
// вернувший обычный план кнопкой «Вернуть обычный план», второй раз за день облегчение не получит. План уже короче
// 15 минут, пересобирать нечего (canReplan) или ручка не ответила — событие уходит как было, с кнопкой «План на 15
// минут» (events.js).

import { replanToday } from '../../ge/plan/replan.js'
import { daySummary } from './planSteps.js'
import { planParams } from './proactive.js'

export const GAP_LITE_MIN = 15

const key = (owner) => `jts_luna_gap_lite:${owner}`
const localDay = (now) => {
  const d = new Date(now)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * @param {{type: string, params?: object}} ev событие трекера
 * @param {{ token: string, owner: string, summary: object|null, now?: number, replan?: Function, storage?: Storage }} ctx
 * @returns {Promise<{type: string, params?: object}>} то же событие; облегчили — с params.lite = 1 и свежими цифрами плана
 */
export async function lightenForGap(ev, { token, owner, summary, now = Date.now(), replan = replanToday, storage = globalThis.localStorage } = {}) {
  if (ev?.type !== 'return_after_gap' || !token || !owner) return ev
  if (!summary?.ready || !summary.canReplan || !summary.left || summary.min <= GAP_LITE_MIN) return ev
  const day = localDay(now)
  try {
    if (storage?.getItem(key(owner)) === day) return ev
  } catch {
    // без хранилища — облегчаем, отметка просто не запомнится
  }
  try {
    const plan = await replan(token, GAP_LITE_MIN)
    try {
      storage?.setItem(key(owner), day)
    } catch {
      // приватный режим
    }
    return { ...ev, params: { ...(ev.params || {}), ...planParams(daySummary(plan)), lite: true } }
  } catch {
    return ev
  }
}
