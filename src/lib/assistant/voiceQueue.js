// Очередь озвучки ответа помощника: фраза → /api/assistant/speak (голос Луны,
// Gemini) → blob → общий <audio> из speech.js (разрешение iPhone играть звук
// живёт на нём, и его выдал тап по микрофону). Пока звучит текущая фраза,
// готовятся LOOKAHEAD следующих: Gemini не потоковый и медленнее, чем кажется
// (190 символов — 8–10 с, замер 14.10.2026), и с одной фразой вперёд длинная
// фраза после короткой не успевала — ответ замолкал посередине. Дальше не
// забегаем: ученик может оборвать ответ, и синтез остального был бы впустую.
//
// Запасной голос — потоковый /api/tts (Soniox «Grace», откатный голос Луны у
// агента): первый звук через ~0.6 с. Им же сразу идёт казахский ответ — у
// Gemini казахского нет. Раньше запасной Soniox собирал сервер, целиком: 10–12 с
// на фразу, и ответ вставал.
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
//
// Айзере (помощник при казахском интерфейсе, persona.js) говорит своим голосом
// ElevenLabs на любом языке, казахском тоже: обходного пути «казахское — сразу
// потоком» у неё нет, а запасной поток — её откатный голос Soniox «Maya».

import { playUrl, stopTts } from '../speech.js'
import { ttsUrl } from '../ttsShared.js'
import { phraseLang } from './phraseLang.js'
import { PERSONAS } from './persona.js'

export const LOOKAHEAD = 2

export { phraseLang }

/**
 * lang (язык интерфейса) голос не выбирает — см. phraseLang; принят для
 * совместимости вызова. Голос выбирает persona.
 * @param {{ token: string, lang?: string, persona?: { id: string, fallbackVoice: string }, fetchImpl?: typeof fetch,
 *           play?: typeof playUrl, stopSound?: typeof stopTts,
 *           onPhrase?: (index: number) => void,
 *           onInterrupt?: () => void,
 *           onFinish?: (r: { played: number, failed: number }) => void }} opts
 *   onPhrase — фраза номер index (по порядку say) зазвучала — или пропущена,
 *   потому что не зазвучала вовсе: по нему виджет показывает текст ответа
 *   вслед за голосом, и пропущенная фраза не должна держать его скрытым.
 *   onInterrupt — очередь замолкла от чужого звука (см. шапку); после своего
 *   stop() не зовётся.
 *   onFinish — один раз, когда после end() доиграна вся очередь; после stop()
 *   и чужого звука не зовётся.
 */
export function createVoiceQueue({
  token,
  persona = PERSONAS.luna,
  fetchImpl = (...args) => fetch(...args),
  play = playUrl,
  stopSound = stopTts,
  onPhrase,
  onInterrupt,
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
  let reached = -1 // последняя фраза, о которой сказали onPhrase

  // Каждой фразе — один раз и по порядку.
  const reach = (i) => {
    if (i <= reached) return
    reached = i
    onPhrase?.(i)
  }

  const revoke = (u) => {
    if (u && urls.delete(u)) URL.revokeObjectURL(u)
  }

  // Потоковая запись той же фразы запасным голосом.
  const streamUrl = (text) => ttsUrl({ text, voice: persona.fallbackVoice, lang: voiceLang })

  function load(item) {
    if (item.url) return item.url
    if (voiceLang === 'kk' && !persona.speaksKazakh) {
      item.url = Promise.resolve(streamUrl(item.text))
      return item.url
    }
    item.url = fetchImpl('/api/assistant/speak', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: item.text, lang: voiceLang, persona: persona.id }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (stopped) return null
        if (!b) return streamUrl(item.text)
        const u = URL.createObjectURL(b)
        urls.add(u)
        return u
      })
      // Сеть упала — тоже запасной поток; оборвали сами (stop) — ничего.
      .catch((e) => (stopped || e?.name === 'AbortError' ? null : streamUrl(item.text)))
    return item.url
  }

  // Фразу оборвал чужой звук: замолкаем целиком, чужое не трогаем.
  function yieldToOther(resolve) {
    if (stopped) return resolve()
    stopped = true
    ctrl.abort()
    for (const u of [...urls]) revoke(u)
    onInterrupt?.()
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
    const at = idx
    const item = items[at]
    for (let k = 1; k <= LOOKAHEAD && items[at + k]; k++) load(items[at + k])
    const url = await load(item)
    if (stopped) return
    const skip = () => {
      failed++
      reach(at)
    }
    if (url) {
      await new Promise((resolve) => {
        const ok = play(url, {
          onStart: () => reach(at),
          onEnd: (reason) => {
            if (reason === 'stopped' && !stopped) return yieldToOther(resolve)
            played++
            resolve()
          },
          onCancel: () => yieldToOther(resolve),
          onFail: () => {
            skip()
            resolve()
          },
        })
        if (ok === false) {
          skip()
          resolve()
        }
      })
      revoke(url)
    } else skip()
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
      // Фраза пришла, пока звучит предыдущая, — готовим её сразу, если она в
      // пределах LOOKAHEAD.
      if (busy && items.length - 1 <= idx + LOOKAHEAD) load(items[items.length - 1])
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
