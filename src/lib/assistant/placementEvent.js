// Итог теста уровня для Луны (кейс 35 ТЗ v2.0, 7.2в): после теста она называет уровень, сильную и слабую сторону, цель
// и первый шаг. Что сказать, решает код: из конверта v16 — тем же reportView, что рисует отчёт «Главной», — берутся
// уровень, цель и разделы с самым высоким и самым низким уровнем (при равенстве — по доле верных). Модели уходят только
// коды (events.js: lvl, tgt, strong, weak), без текстов v16.

import { homeReport } from '../../placement/reportModel.js'
import { CEFR } from '../../placement/envelope.js'
import { announcePlacementDone } from './placementDone.js'

const rank = (lv) => CEFR.indexOf(lv)

/** App: итог теста сохранён — передать Луне (один раз на попытку решает App). */
export function announcePlacement(env) {
  announcePlacementDone(placementHighlights(env))
}

/** { lvl, tgt, strong, weak } по конверту или null — тест не пройден (homeReport пустой). */
export function placementHighlights(env) {
  const view = homeReport(env)
  if (!view) return null
  const rated = view.skills.filter((s) => s.assessed && s.level)
  const score = (s) => rank(s.level) * 1000 + (Number.isFinite(s.percent) ? s.percent : 0)
  const sorted = [...rated].sort((a, b) => score(b) - score(a))
  const strong = sorted[0] || null
  const weak = sorted.length > 1 ? sorted[sorted.length - 1] : null
  return {
    ...(view.overall ? { lvl: view.overall } : {}),
    ...(view.target ? { tgt: view.target } : {}),
    // Сильная и слабая стороны — только если они разные по уровню или доле: «всё ровно» модель скажет и без них.
    ...(strong && weak && score(strong) !== score(weak) ? { strong: strong.id, weak: weak.id } : {}),
  }
}
