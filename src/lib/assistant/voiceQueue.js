// Очередь озвучки ответа помощника: фраза → /api/assistant/speak → blob →
// общий <audio> из speech.js (разрешение iPhone играть звук живёт на нём, и его
// выдал тап по микрофону). Следующая фраза запрашивается, пока звучит
// текущая, — между фразами нет паузы на синтез; дальше одной вперёд не
// забегаем: ученик может оборвать ответ, и синтез остального был бы впустую.
//
// Голос один на весь ответ, и выбирает его язык САМОГО ответа, а не
// интерфейса: Луна отвечает на языке вопроса, и русский ответ в казахском
// интерфейсе должен звучать её голосом (Gemini), а не казахским синтезом. Если
// первая фраза казахская — весь ответ идёт с lang kk (иначе посреди ответа
// тембр сменился бы с Gemini на Soniox).
//
// Звук на сайте один (speech.js), и чужая реплика — ученик нажал «послушать» у
// слова, экран ушёл и всё заглушил — обрывает фразу Луны. Тогда очередь
// замолкает целиком, а не перебивает чужой звук следующей фразой.

import { playUrl, stopTts } from '../speech.js'

const KK_LETTERS = /[әғқңөұүһіӘҒҚҢӨҰҮҺІ]/
const CYRILLIC = /[а-яё]/i

/** Язык фразы для голоса: казахские буквы — kk, кириллица — ru, иначе en. */
export function phraseLang(text) {
  const t = String(text || '')
  if (KK_LETTERS.test(t)) return 'kk'
  return CYRILLIC.test(t) ? 'ru' : 'en'
}

/**
 * lang (язык интерфейса) голос не выбирает — см. phraseLang; принят для
 * совместимости вызова.
 * @param {{ token: string, lang?: string, fetchImpl?: typeof fetch,
 *           play?: typeof playUrl, stopSound?: typeof stopTts,
 *           onFinish?: (r: { played: number, failed: number }) => void }} opts
 *   onFinish — один раз, когда после end() доиграна вся очередь; после stop()
 *   не зовётся.
 */
export function createVoiceQueue({
  token,
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

  // Фразу оборвал чужой звук: замолкаем целиком, чужое не трогаем.
  function yieldToOther(resolve) {
    if (stopped) return resolve()
    stopped = true
    ctrl.abort()
    for (const u of [...urls]) revoke(u)
    resolve()
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
          onEnd: (reason) => {
            if (reason === 'stopped' && !stopped) return yieldToOther(resolve)
            played++
            resolve()
          },
          onCancel: () => yieldToOther(resolve),
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
      voiceLang ??= phraseLang(t)
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
