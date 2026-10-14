// Клиент роутов теста уровня v16: сохранение конверта, последний результат для «Главной», оценка говорения.

import { authHeaders } from '../lib/identity.js'
import { trimSilenceWav } from '../practice/shadowing/trimWav.js'

async function readJson(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

/** true — конверт лёг в базу. Сбой не бросает: тест у ученика уже показал итог, повтор будет на следующем событии. */
export async function saveAttempt(token, envelope) {
  if (!token || !envelope) return false
  try {
    const res = await fetch('/api/placement/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ envelope }),
    })
    return res.ok && (await readJson(res)).saved === true
  } catch {
    return false
  }
}

/** Последний конверт аккаунта или null (нет теста, нет базы, сеть). */
export async function fetchLatestAttempt(token) {
  if (!token) return null
  try {
    const res = await fetch('/api/placement/attempts', { headers: authHeaders(token) })
    if (!res.ok) return null
    const d = await readJson(res)
    return d.envelope && typeof d.envelope === 'object' ? d.envelope : null
  } catch {
    return null
  }
}

/**
 * Оценка устного ответа. Бросает Error с status/code при отказе роута; { status: 'insufficient' } — речи не хватило
 * (оценка не списана, можно переписать).
 */
export async function assessSpeaking(token, wavBlob, { topicId, lang, measured }) {
  // Тишину по краям срезаем: распознавание и произношение берут за секунды записи.
  const audio = await trimSilenceWav(wavBlob)
  const form = new FormData()
  form.append('audio', audio, 'answer.wav')
  form.append('metadata', JSON.stringify({ topicId, lang, measured }))
  const res = await fetch('/api/placement/speaking', { method: 'POST', body: form, headers: authHeaders(token) })
  const d = await readJson(res)
  if (!res.ok) {
    const err = new Error(d.error || `speaking assess failed ${res.status}`)
    err.status = res.status
    err.code = d.error || null
    throw err
  }
  return d
}
