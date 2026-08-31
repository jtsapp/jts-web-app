// Сохранение уровня, определённого тестом.
//
// Уровень — единственное, что уезжает из теста в профиль, и он решает, какой
// контент студент увидит. Раньше запись была «выстрелил и забыл»: осечка сети
// уходила в console.warn, на экране всё выглядело успешным, а на бэкенде
// уровня не было — и следующий вход снова считал тест непройденным (15 минут
// впустую). Поэтому: пишем, **перечитываем** уровень с бэкенда (2xx сам по
// себе не доказывает, что профиль изменился) и повторяем, а результат
// возвращаем вызывающему, чтобы он мог показать ошибку и дать «Повторить».

import { saveLanguageLevel, getLanguageLevel } from '../api.js'
import { savePlacementLevel } from './tutorPrefs.js'

const DEFAULT_ATTEMPTS = 3
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Пишет уровень в профиль на бэкенде и в Neon-профиль тьютора (туда же —
 * [options.summary], снимок прохождения).
 * @returns {Promise<{ok: boolean, level?: string, anonymous?: boolean, error?: Error}>}
 *   level — уровень, который в итоге записан: вердикт сервера, если он его
 *   прислал, иначе то, что посчитал клиент.
 *   ok=true — уровень подтверждён чтением с бэкенда (или прогон анонимный, и
 *   писать в профиль просто некуда).
 */
export async function persistPlacementLevel(token, level, options = {}) {
  const { attempts = DEFAULT_ATTEMPTS, sleep = wait, delay = (n) => 400 * n, summary, session } = options
  if (!level) return { ok: false, error: new Error('Нет уровня для сохранения.') }

  // Neon-профиль читает голосовой тьютор; он и у анонима свой, по deviceId.
  // Туда же уезжает снимок прохождения (θ, SE, флаги качества) и журнал
  // ответов, по которому сервер пересчитывает уровень сам. Его вердикт и есть
  // итоговый: клиентский уровень — утверждение, серверный — измерение.
  const verdict = await savePlacementLevel(token, level, summary, session).catch(() => null)
  const finalLevel = typeof verdict?.level === 'string' && verdict.level ? verdict.level : level

  // Без токена профиля на бэкенде нет: сохранять нечего и подтверждать нечем.
  if (!token) return { ok: true, anonymous: true, level: finalLevel }

  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await saveLanguageLevel(token, finalLevel)
      const stored = await getLanguageLevel(token)
      if (String(stored || '').toUpperCase() === String(finalLevel).toUpperCase()) {
        return { ok: true, level: finalLevel }
      }
      lastError = new Error(`Бэкенд вернул уровень «${stored || 'пусто'}» вместо «${finalLevel}».`)
    } catch (e) {
      lastError = e
    }
    if (attempt < attempts) await sleep(delay(attempt))
  }
  return { ok: false, error: lastError, level: finalLevel }
}
