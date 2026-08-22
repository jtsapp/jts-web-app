// Как отчёт понимает, что появившийся звонок — ИМЕННО ТОТ, который только что
// закончился. Чистая функция: её легко проверить тестом, а ошибка тут не
// падает, а тихо показывает ученику разбор чужого разговора.
//
// Клиент не знает id звонка: его пишет агент в конце сессии. Поэтому перед
// разговором App.jsx запоминает «последний звонок ДО», и отчёт ждёт другой.

// Звонков до этого разговора не было — значит любая появившаяся строка новая.
export const NO_PREVIOUS_CALL = 'none'

/**
 * @param {string|null|undefined} nextId  id самой свежей строки из GET
 * @param {string|null} baseline  id последнего звонка ДО разговора,
 *   NO_PREVIOUS_CALL если их не было, либо null — если узнать не удалось
 * @returns {{baseline: string|null, fresh: boolean}}
 */
export function classifyCall(nextId, baseline) {
  // Строки ещё нет — ждём дальше.
  if (!nextId) return { baseline, fresh: false }
  // baseline неизвестен: предзапрос не прошёл. Принять первую же строку нельзя
  // — это может быть прошлый разговор. Берём её за точку отсчёта и ждём
  // следующую: лучше не показать отчёт, чем показать чужой.
  if (baseline === null || baseline === undefined) return { baseline: nextId, fresh: false }
  return { baseline, fresh: nextId !== baseline }
}
