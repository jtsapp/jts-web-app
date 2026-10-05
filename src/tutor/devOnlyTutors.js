import { JARVIS_ENABLED } from '../config.js'

// Тьюторы dev-стенда: их карточки есть только при JARVIS_ENABLED (см.
// tutors.js), на проде — нет даже в бандле.
//
// Одного этого мало, потому что голосовой агент ОБЩИЙ для дева и прода: он
// знает эти ключи и включает по ним стенд (BUDDY_STANDS в agent/agent.py).
// Штатный прод-клиент такой ключ не пришлёт — getTutor откатывает незнакомый
// ключ на Спарка, — но сервер токена до этого пропускал любую строку как есть
// (`|| p.tutor`), и звонок со стендом на проде упирался только в честность
// клиента. Теперь решает сервер: без флага стенда dev-only ключ = Спарк.
//
// Новый dev-only тьютор — сюда же; тест сверяет список с tutors.js.
export const DEV_ONLY_TUTOR_KEYS = Object.freeze(['jarvis', 'sparktest'])

// Тот же откат, что у getTutor на клиенте (DEFAULT_TUTOR).
const FALLBACK_TUTOR_KEY = 'spark'

/**
 * Ключ тьютора, который можно отдать агенту с этого стенда.
 *
 * Регистр и пробелы срезаются ДО сравнения: агент сам приводит ключ к нижнему
 * регистру, и « SparkTest» иначе прошёл бы мимо списка и включил стенд.
 *
 * @param {unknown} key      ключ из запроса
 * @param {boolean} devStand стенд с dev-only тьюторами (по умолчанию — флаг сборки)
 * @returns {string} нормализованный ключ; '' — тьютор не указан
 */
export function tutorKeyForStand(key, devStand = JARVIS_ENABLED) {
  const k = typeof key === 'string' ? key.trim().toLowerCase() : ''
  if (!devStand && DEV_ONLY_TUTOR_KEYS.includes(k)) return FALLBACK_TUTOR_KEY
  return k
}
