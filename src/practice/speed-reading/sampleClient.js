// Клиент роута образца (/api/practice/speed-reading/sample): образец создаётся при первом открытии текста.
//
// Роут отвечает 202, пока образец готовит другой запрос (claim бэкенда держит отметку 90 с) или пока бэкенд
// не принял образец старого текста: тогда спрашиваем снова через 3 с, не больше десяти раз (спека B3). 503 —
// синтез на стенде не настроен: «Образец недоступен», и больше не спрашиваем.

import { normalizeSample } from './data.js'

export const SAMPLE_URL = '/api/practice/speed-reading/sample'
export const SAMPLE_TRIES = 10
export const SAMPLE_DELAY_MS = 3000

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * @returns {Promise<{status:'ready', sample} | {status:'unavailable'} | {status:'error'} | {status:'cancelled'}>}
 */
export async function requestSample(id, { token, fetchImpl = fetch, sleep = wait, tries = SAMPLE_TRIES, delayMs = SAMPLE_DELAY_MS, alive = () => true } = {}) {
  for (let i = 0; i < tries; i++) {
    if (!alive()) return { status: 'cancelled' }
    let res
    try {
      res = await fetchImpl(SAMPLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id }),
      })
    } catch {
      return { status: 'error' }
    }
    if (res.status === 202) {
      if (i < tries - 1) await sleep(delayMs)
      continue
    }
    if (res.status === 503) return { status: 'unavailable' }
    if (!res.ok) return { status: 'error' }
    const data = await res.json().catch(() => null)
    const sample = normalizeSample(data?.sample)
    return sample ? { status: 'ready', sample } : { status: 'error' }
  }
  return alive() ? { status: 'error' } : { status: 'cancelled' }
}
