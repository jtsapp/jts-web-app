// Очередь озвучки ответа помощника: фраза → /api/assistant/speak → blob →
// общий <audio> из speech.js (разрешение iPhone играть звук живёт на нём, и его
// выдал тап по микрофону). Следующая фраза запрашивается, пока звучит
// текущая, — между фразами нет паузы на синтез; дальше одной вперёд не
// забегаем: ученик может оборвать ответ, и синтез остального был бы впустую.
//
// Голос один на весь ответ: если первая фраза казахская, весь ответ идёт с
// lang kk (иначе Луна посреди ответа сменила бы тембр Gemini на Soniox).

import { playUrl, stopTts } from '../speech.js'

const KK_LETTERS = /[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/

/**
 * @param {{ token: string, lang?: string, fetchImpl?: typeof fetch,
 *           play?: typeof playUrl, stopSound?: typeof stopTts,
 *           onFinish?: (r: { played: number, failed: number }) => void }} opts
 *   onFinish — один раз, когда после end() доиграна вся очередь; после stop()
 *   не зовётся.
 */
export function createVoiceQueue({
  token,
  lang = 'ru',
  fetchImpl = (...args) => fetch(...args),
  play = playUrl,
  stopSound = stopTts,
  onFinish,
} = {}) {
  const items = [] // { text, url: Promise<string|null> | null }
  const urls = new Set()
  const ctrl = new AbortController()
  let idx = 0
  let busy = false
  let ended = false
  let stopped = false
  let finished = false
  let voiceLang = null
  let played = 0
  let failed = 0

  const revoke = (u) => {
    if (u && urls.delete(u)) URL.revokeObjectURL(u)
  }

  function load(item) {
    item.url ??= fetchImpl('/api/assistant/speak', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: item.text, lang: voiceLang }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!b || stopped) return null
        const u = URL.createObjectURL(b)
        urls.add(u)
        return u
      })
      .catch(() => null)
    return item.url
  }

  function finish() {
    if (finished || stopped) return
    finished = true
    onFinish?.({ played, failed })
  }

  async function pump() {
    if (busy || stopped) return
    if (idx >= items.length) {
      if (ended) finish()
      return
    }
    busy = true
    const item = items[idx]
    if (items[idx + 1]) load(items[idx + 1])
    const url = await load(item)
    if (stopped) return
    if (url) {
      await new Promise((resolve) => {
        const ok = play(url, {
          onEnd: () => {
            played++
            resolve()
          },
          onFail: () => {
            failed++
            resolve()
          },
        })
        if (ok === false) {
          failed++
          resolve()
        }
      })
      revoke(url)
    } else failed++
    if (stopped) return
    idx++
    busy = false
    pump()
  }

  return {
    say(text) {
      const t = String(text ?? '').trim()
      if (!t || stopped) return
      voiceLang ??= lang === 'kk' || KK_LETTERS.test(t) ? 'kk' : lang
      items.push({ text: t, url: null })
      // Фраза пришла, пока звучит предыдущая, — готовим её сразу.
      if (busy && items.length - 1 === idx + 1) load(items[idx + 1])
      pump()
    },
    end() {
      ended = true
      pump()
    },
    stop() {
      if (stopped) return
      stopped = true
      ctrl.abort()
      // Своей реплики ещё не было — общий элемент не трогаем: на нём может
      // звучать чужое «послушать» или тишина разблокировки iPhone.
      if (busy) stopSound()
      for (const u of [...urls]) revoke(u)
    },
  }
}
