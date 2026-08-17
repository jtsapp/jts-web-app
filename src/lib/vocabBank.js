'use client'

// Личный словарь ученика: слово с карточки урока кладётся сюда кнопкой «+».
// Дальше оно живёт в разделе «Словарь» и в повторениях тьютора (vocab_bank,
// kind='vocab') — так и было задумано в исходном курсе: слова с уроков можно
// продолжить учить отдельно.
//
// Best-effort, как и перенос анонимного прогресса: без DATABASE_URL роут
// честно отвечает 503, у неавторизованного слово уходит под device-id.
// Осечка не должна ломать урок — студент в этот момент читает слова, а не
// ждёт сети, поэтому наружу отдаём только «получилось/нет».

import { getDeviceId } from './identity.js'
import { loadToken } from './session.js'

/** items: [{ word, hint }] — hint это перевод, он же подсказка в словаре. */
export async function addVocabWords(items) {
  const words = (items || [])
    .filter((x) => x && typeof x.word === 'string' && x.word.trim())
    .map((x) => ({ word: x.word.trim(), hint: typeof x.hint === 'string' ? x.hint : null }))
  if (!words.length) return false

  try {
    const token = loadToken()
    const res = await fetch('/api/profile/vocab', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ deviceId: getDeviceId(), items: words.slice(0, 50) }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      console.warn('[vocab] слово не сохранилось:', data?.error || res.status)
      return false
    }
    return true
  } catch (e) {
    console.warn('[vocab] сеть недоступна:', e)
    return false
  }
}
