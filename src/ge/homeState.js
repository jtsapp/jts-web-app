// Что рисовать сверху «Главной» General English и что говорит маскот блока цели (спека 2026-10-12, секция 3).
// Чистые функции — состояния проверяются тестом, а не глазами.

import { canSetGoal } from './route.js'

/**
 * Верхний блок: 'legacy' — прежняя карточка уровня (ручки профиля нет), 'finish' — анкеты нет, а цель ставить некуда:
 * уровень на потолке целей курса (C1, C2 владелец не даёт). До 31.10.2026 такой ученик получал прежнюю карточку уровня
 * поверх нового макета, и менеджер принял это за старый дизайн «Главной». 'locked' — анкеты
 * нет: роадмап под блюром ждёт тест уровня v16 (его анкета заменила нашу, спека 2026-10-14; раньше здесь были
 * 'start' — ни уровня, ни анкеты — и 'invite' — уровень есть, анкеты нет), 'notTested' — то же, но у ученика, который
 * учился до теста v16 (existing): ему тест не навязываем, вместо блюра — обычная карточка «тест не пройден» (решение
 * владельца 14.10), 'needTest' / 'needRoute' — анкета есть, шаг не сделан, 'goal' — блок цели.
 */
export function homeTopState({ geProfile, levelUnknown, level, existing = false }) {
  if (!geProfile) return 'legacy'
  if (!geProfile.onboarded) {
    if (!levelUnknown && !canSetGoal(level)) return 'finish'
    return existing ? 'notTested' : 'locked'
  }
  if (levelUnknown) return 'needTest'
  if (!geProfile.route) return 'needRoute'
  return 'goal'
}

// Сколько формулировок у реплики (geGoal.say.<key>, .2, .3): маскот говорит разное от захода к заходу, как в IELTS.
const SAY_VARIANTS = { reached: 2, noDate: 2, late: 2, onTrack: 3 }

/** Ключ реплики с вариантом: seed в [0, 1) — случайное число, взятое один раз на показ блока. */
export function sayKey(key, seed) {
  const n = SAY_VARIANTS[key] || 1
  const i = Math.min(n - 1, Math.floor(seed * n))
  return i === 0 ? `geGoal.say.${key}` : `geGoal.say.${key}.${i + 1}`
}

/** Реплика маскота и вид заголовка. fit — 'late' | 'fits' | 'spare' | null у выбранного формата. */
export function goalBannerState({ deadline, journey, fit }) {
  const reached = !!journey?.reached
  const state = deadline?.state || 'none'
  let say
  if (reached) say = 'reached'
  else if (state === 'today' || state === 'tomorrow' || state === 'passed') say = state
  else if (state === 'none') say = 'noDate'
  else if (fit === 'late') say = 'late'
  else say = 'onTrack'
  const title = reached ? 'reached' : state === 'days' && deadline?.approximate ? 'approx' : state
  return { reached, say, title }
}
